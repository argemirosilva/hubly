import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeOpenAI } from "../openai";
import { empresaHasFeature } from "../db-plans";
import {
  getEmpresaDoUsuario, getEmpresaDoContexto,
  getAgendamentosByEmpresa,
  getClientesByEmpresa,
  saveScoreFinanceiro,
  getScoreAtual,
  getHistoricoScore,
  saveAlertaFinanceiro,
  getAlertasFinanceiros,
  marcarAlertaFinanceiroLido,
  marcarTodosAlertasLidos,
  getResumoContasPagarParaIA,
  getMetricasContasPagar,
} from "../db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { agendamentos, comissoes } from "../../drizzle/schema";

// ─── Tipos internos ────────────────────────────────────────────────────────────
interface FatoresScore {
  pontualidadePagamentos: number;  // 0-20: % de comissões pagas em dia
  contasVencidas: number;          // 0-15: penalidade por comissões atrasadas
  fluxoCaixa: number;              // 0-20: receita vs despesas (comissões)
  estabilidadeReceita: number;     // 0-15: variação mensal da receita
  concentracaoReceita: number;     // 0-10: dependência de poucos clientes
  tendenciaReceita: number;        // 0-10: crescimento ou queda recente
  inadimplencia: number;           // 0-10: % de agendamentos não pagos
  totalAgendamentos: number;       // 0 (informativo)
  receitaMes: number;              // 0 (informativo)
}

// ─── Lógica de cálculo do score ───────────────────────────────────────────────
async function calcularScoreFinanceiro(empresaId: number): Promise<{
  score: number;
  status: "saudavel" | "atencao" | "risco";
  fatores: FatoresScore;
  motivos: string[];
  dicas: string[];
  explicacao: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");

  const agora = new Date();
  const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);
  const inicioMes2Atras = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);

  // Buscar agendamentos dos últimos 90 dias
  const agds = await db.select().from(agendamentos)
    .where(and(
      eq(agendamentos.empresaId, empresaId),
      gte(agendamentos.data, inicioMes2Atras.toISOString().split("T")[0])
    ));

  // Buscar comissões
  const comissoesAll = await db.select().from(comissoes)
    .where(eq(comissoes.empresaId, empresaId));

  const clientes = await getClientesByEmpresa(empresaId);

  // ── Fator 1: Pontualidade de pagamentos (0-20) ─────────────────────────────
  const totalComissoes = comissoesAll.length;
  const comissoesPagas = comissoesAll.filter(c => c.paga).length;
  const pctPagas = totalComissoes > 0 ? comissoesPagas / totalComissoes : 0;
  const pontualidadePagamentos = Math.round(pctPagas * 20);

  // ── Fator 2: Contas vencidas / pendentes (0-15) ────────────────────────────
  const comissoesPendentes = comissoesAll.filter(c => !c.paga).length;
  const penalidade = Math.min(15, comissoesPendentes * 2);
  const contasVencidas = 15 - penalidade;

  // ── Fator 3: Fluxo de caixa (0-20) ────────────────────────────────────────
  const statusInvalido = ['cancelado', 'ocupado', 'excluido'];
  const receitaMesAtual = agds
    .filter(a => a.data >= inicioMesAtual.toISOString().split("T")[0] && !statusInvalido.includes(a.status ?? ''))
    .reduce((acc, a) => acc + parseFloat(String(a.valorTotal ?? "0")), 0);
  const totalComissoesPendentesValor = comissoesAll
    .filter(c => !c.paga)
    .reduce((acc, c) => acc + parseFloat(String(c.valorComissao ?? "0")), 0);
  const saldoLiquido = receitaMesAtual - totalComissoesPendentesValor;
  const fluxoCaixa = saldoLiquido > 0 ? Math.min(20, Math.round((saldoLiquido / Math.max(receitaMesAtual, 1)) * 20)) : 0;

  // ── Fator 4: Estabilidade da receita (0-15) ────────────────────────────────
  const receitaMesAnterior = agds
    .filter(a => a.data >= inicioMesAnterior.toISOString().split("T")[0] && a.data <= fimMesAnterior.toISOString().split("T")[0] && !statusInvalido.includes(a.status ?? ''))
    .reduce((acc, a) => acc + parseFloat(String(a.valorTotal ?? "0")), 0);
  const variacaoReceita = receitaMesAnterior > 0
    ? Math.abs((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior)
    : 0;
  const estabilidadeReceita = variacaoReceita < 0.1 ? 15 : variacaoReceita < 0.3 ? 10 : variacaoReceita < 0.5 ? 5 : 0;

  // ── Fator 5: Concentração de receita (0-10) ────────────────────────────────
  const receitaPorCliente: Record<number, number> = {};
  agds.filter(a => !statusInvalido.includes(a.status ?? '')).forEach(a => {
    if (a.clienteId) receitaPorCliente[a.clienteId] = (receitaPorCliente[a.clienteId] ?? 0) + parseFloat(String(a.valorTotal ?? "0"));
  });
  const totalReceita = Object.values(receitaPorCliente).reduce((a, b) => a + b, 0);
  const top2Receita = Object.values(receitaPorCliente).sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0);
  const concentracao = totalReceita > 0 ? top2Receita / totalReceita : 0;
  const concentracaoReceita = concentracao > 0.7 ? 2 : concentracao > 0.5 ? 5 : 10;

  // ── Fator 6: Tendência de receita (0-10) ──────────────────────────────────
  const tendenciaReceita = receitaMesAtual >= receitaMesAnterior ? 10 : receitaMesAtual >= receitaMesAnterior * 0.8 ? 5 : 0;

  // ── Fator 7: Inadimplência (0-10) ─────────────────────────────────────────
  const agdsConcluidos = agds.filter(a => a.status === "concluido").length;
  const agdsFaltou = agds.filter(a => a.status === "faltou").length;
  const pctInadimplencia = (agdsConcluidos + agdsFaltou) > 0
    ? agdsFaltou / (agdsConcluidos + agdsFaltou)
    : 0;
  const inadimplencia = pctInadimplencia < 0.05 ? 10 : pctInadimplencia < 0.15 ? 6 : pctInadimplencia < 0.3 ? 3 : 0;

  const score = Math.min(100, Math.max(0,
    pontualidadePagamentos + contasVencidas + fluxoCaixa +
    estabilidadeReceita + concentracaoReceita + tendenciaReceita + inadimplencia
  ));

  const status: "saudavel" | "atencao" | "risco" = score >= 70 ? "saudavel" : score >= 45 ? "atencao" : "risco";

  // ── Motivos e dicas ────────────────────────────────────────────────────────
  const motivos: string[] = [];
  const dicas: string[] = [];

  if (pctPagas < 0.7) motivos.push("Muitas comissões ainda não foram pagas");
  if (comissoesPendentes > 3) motivos.push(`Você tem ${comissoesPendentes} comissões pendentes`);
  if (saldoLiquido < 0) motivos.push("Suas despesas estão maiores que a receita do mês");
  if (variacaoReceita > 0.3) motivos.push("Sua receita variou muito em relação ao mês anterior");
  if (concentracao > 0.6) motivos.push(`Você depende muito de poucos clientes (${Math.round(concentracao * 100)}% da receita vem de 2 clientes)`);
  if (receitaMesAtual < receitaMesAnterior * 0.8) motivos.push("Sua receita caiu em relação ao mês passado");
  if (pctInadimplencia > 0.15) motivos.push(`${Math.round(pctInadimplencia * 100)}% dos atendimentos resultaram em falta`);
  if (score >= 70) motivos.push("Seu caixa está positivo e organizado");
  if (pctPagas > 0.9) motivos.push("Você está pagando suas comissões em dia");

  if (comissoesPendentes > 0) dicas.push("Quite as comissões pendentes para melhorar seu score");
  if (concentracao > 0.6) dicas.push("Tente diversificar sua carteira de clientes para reduzir riscos");
  if (receitaMesAtual < receitaMesAnterior) dicas.push("Crie promoções ou entre em contato com clientes inativos para aumentar a receita");
  if (pctInadimplencia > 0.1) dicas.push("Considere confirmar agendamentos por WhatsApp para reduzir faltas");
  if (score >= 70) dicas.push("Continue assim! Mantenha a regularidade dos pagamentos");

  const explicacao = status === "saudavel"
    ? "Seu financeiro está bem organizado. Continue assim!"
    : status === "atencao"
    ? "Seu financeiro está estável, mas há alguns pontos que merecem atenção."
    : "Seu financeiro precisa de cuidado. Há riscos que podem virar problema em breve.";

  return {
    score,
    status,
    fatores: {
      pontualidadePagamentos,
      contasVencidas,
      fluxoCaixa,
      estabilidadeReceita,
      concentracaoReceita,
      tendenciaReceita,
      inadimplencia,
      totalAgendamentos: agds.length,
      receitaMes: receitaMesAtual,
    },
    motivos,
    dicas,
    explicacao,
  };
}

// ─── Lógica de geração de alertas ─────────────────────────────────────────────
async function gerarAlertasFinanceiros(empresaId: number, scoreAtual: number, scoreAnterior: number | null) {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();
  const hoje = agora.toISOString().split("T")[0];
  const amanha = new Date(agora.getTime() + 86400000).toISOString().split("T")[0];
  const em7dias = new Date(agora.getTime() + 7 * 86400000).toISOString().split("T")[0];

  const alertas: Array<typeof import("../../drizzle/schema").alertasFinanceiros.$inferInsert> = [];

  // Agendamentos de amanhã
  const agdsAmanha = await db.select().from(agendamentos)
    .where(and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.data, amanha)));
  if (agdsAmanha.length >= 3) {
    alertas.push({
      empresaId,
      tipo: "contas_vencendo",
      prioridade: "media",
      titulo: "Muitos agendamentos amanhã",
      mensagem: `⚠️ Você tem ${agdsAmanha.length} agendamentos amanhã. Confirme com seus clientes para evitar faltas.`,
      acao: "Enviar confirmação para os clientes de amanhã",
    });
  }

  // Score caiu
  if (scoreAnterior !== null && scoreAtual < scoreAnterior - 5) {
    alertas.push({
      empresaId,
      tipo: "score_caiu",
      prioridade: "alta",
      titulo: "Seu score financeiro caiu",
      mensagem: `🚨 Seu score caiu de ${scoreAnterior} para ${scoreAtual} pontos. Verifique os motivos na IA Financeira.`,
      acao: "Ver detalhes do score financeiro",
    });
  }

  // Comissões pendentes
  const comissoesPendentes = await db.select().from(comissoes)
    .where(and(eq(comissoes.empresaId, empresaId), eq(comissoes.paga, false)));
  if (comissoesPendentes.length > 5) {
    const totalPendente = comissoesPendentes.reduce((acc, c) => acc + parseFloat(String(c.valorComissao ?? "0")), 0);
    alertas.push({
      empresaId,
      tipo: "contas_vencendo",
      prioridade: "alta",
      titulo: "Comissões pendentes acumulando",
      mensagem: `⚠️ Você tem ${comissoesPendentes.length} comissões pendentes totalizando R$ ${totalPendente.toFixed(2)}.`,
      acao: "Quitar comissões pendentes na seção Financeiro",
    });
  }

  // Score baixo
  if (scoreAtual < 40) {
    alertas.push({
      empresaId,
      tipo: "receita_baixa",
      prioridade: "alta",
      titulo: "Atenção: score financeiro baixo",
      mensagem: `🚨 Seu score está em ${scoreAtual}/100. Seu financeiro precisa de atenção urgente.`,
      acao: "Ver análise detalhada na IA Financeira",
    });
  }

  for (const alerta of alertas) {
    await saveAlertaFinanceiro(alerta);
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const iaFinanceiroRouter = router({
  // Calcular e salvar score
  calcularScore: protectedProcedure.mutation(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) throw new Error("Empresa não encontrada");
    if (!(await empresaHasFeature(empresa.id, "iaFinanceira"))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "A IA Financeira está disponível a partir do plano Plus. Faça upgrade para usar este recurso." });
    }

    const scoreAnteriorObj = await getScoreAtual(empresa.id);
    const scoreAnterior = scoreAnteriorObj?.score ?? null;

    const resultado = await calcularScoreFinanceiro(empresa.id);

    await saveScoreFinanceiro({
      empresaId: empresa.id,
      score: resultado.score,
      status: resultado.status,
      explicacao: resultado.explicacao,
      motivos: resultado.motivos,
      dicas: resultado.dicas,
      detalhes: resultado.fatores,
    });

    await gerarAlertasFinanceiros(empresa.id, resultado.score, scoreAnterior);

    return resultado;
  }),

  // Buscar score atual
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) return null;
    return getScoreAtual(empresa.id);
  }),

  // Histórico de scores
  getHistorico: protectedProcedure.query(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) return [];
    return getHistoricoScore(empresa.id, 30);
  }),

  // Alertas financeiros
  getAlertas: protectedProcedure
    .input(z.object({ apenasNaoLidos: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getAlertasFinanceiros(empresa.id, input.apenasNaoLidos);
    }),

  marcarAlertaLido: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await marcarAlertaFinanceiroLido(input.id);
      return { ok: true };
    }),

  marcarTodosLidos: protectedProcedure.mutation(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) return;
    await marcarTodosAlertasLidos(empresa.id);
    return { ok: true };
  }),

  // Chat com IA financeira
  chat: protectedProcedure
    .input(z.object({ mensagem: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      if (!(await empresaHasFeature(empresa.id, "iaFinanceira"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "A IA Financeira está disponível a partir do plano Plus. Faça upgrade para usar este recurso." });
      }

      const score = await getScoreAtual(empresa.id);
      const alertas = await getAlertasFinanceiros(empresa.id, false);
      const contasPagarResumo = await getResumoContasPagarParaIA(empresa.id);

      const contextoScore = score
        ? `Score financeiro: ${score.score}/100 (${score.status === "saudavel" ? "Saudável" : score.status === "atencao" ? "Atenção" : "Risco"}).
Explicação: ${score.explicacao}
Motivos: ${(score.motivos as string[]).join("; ")}
Dicas: ${(score.dicas as string[]).join("; ")}
Alertas recentes: ${alertas.slice(0, 3).map(a => a.titulo).join("; ") || "Nenhum alerta"}`
        : "Ainda não há score calculado para esta empresa.";

      const contextoContas = contasPagarResumo
        ? `

CONTAS A PAGAR:
- Total vencido (em atraso): R$ ${contasPagarResumo.totalVencido.toFixed(2)} (${contasPagarResumo.quantidadeVencidas} conta(s))
- Total pendente (a vencer): R$ ${contasPagarResumo.totalPendente.toFixed(2)} (${contasPagarResumo.quantidadePendentes} conta(s))
- Total pago este mês: R$ ${contasPagarResumo.totalPagoMes.toFixed(2)}
${contasPagarResumo.contasVencidas.length > 0 ? `- Contas vencidas: ${contasPagarResumo.contasVencidas.map(c => `${c.descricao} (R$ ${c.valor.toFixed(2)}, venceu ${c.vencimento})`).join("; ")}` : ""}
${contasPagarResumo.proximasAVencer.length > 0 ? `- Próximas a vencer (7 dias): ${contasPagarResumo.proximasAVencer.map(c => `${c.descricao} (R$ ${c.valor.toFixed(2)}, vence ${c.vencimento})`).join("; ")}` : ""}
${contasPagarResumo.maiorDespesaMes.length > 0 ? `- Maiores despesas do mês: ${contasPagarResumo.maiorDespesaMes.map(c => `${c.descricao} (R$ ${c.valor.toFixed(2)})`).join("; ")}` : ""}`
        : "";

      const resposta = await invokeOpenAI({
        messages: [
          {
            role: "system",
            content: `Você é um assistente financeiro simples e amigável para pequenos negócios.
Responda sempre em português, de forma clara e acessível, sem jargões financeiros.
Nunca invente dados. Use apenas as informações fornecidas no contexto.
Sempre sugira uma ação prática ao final.

Contexto financeiro atual:
${contextoScore}${contextoContas}`,
          },
          { role: "user", content: input.mensagem },
        ],
      });

      return { resposta: resposta.choices[0]?.message?.content ?? "Não consegui processar sua pergunta. Tente novamente." };
    }),

  // Métricas de contas a pagar (para o score e alertas)
  getMetricasContasPagar: protectedProcedure.query(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) return null;
    return getMetricasContasPagar(empresa.id);
  }),
});
