import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeOpenAI } from "../openai";
import { empresaHasFeature } from "../db-plans";
import {
  getEmpresaDoUsuario, getEmpresaDoContexto,
  getClientesByEmpresa,
  saveAnaliseCliente,
  getAnaliseClientesByEmpresa,
  getAnaliseByCliente,
  saveInsightCliente,
  getInsightsClientes,
  marcarInsightClienteLido,
  marcarTodosInsightsLidos,
  getDb,
} from "../db";
import { and, eq, gte } from "drizzle-orm";
import { agendamentos } from "../../drizzle/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Classificacao = "principal" | "bom_pagador" | "em_crescimento" | "em_queda" | "inativo" | "atraso_frequente" | "risco" | "novo";

interface MetricasCliente {
  clienteId: number;
  nome: string;
  totalReceita: number;
  qtdAgendamentos: number;
  qtdConcluidos: number;
  qtdFaltou: number;
  qtdCancelados: number;
  diasDesdeUltimo: number;
  receitaMesAtual: number;
  receitaMesAnterior: number;
  pctPontualidade: number; // 1 - (faltou / total)
}

// ─── Critérios mínimos de dados ───────────────────────────────────────────────
function temDadosSuficientes(clientes: MetricasCliente[], diasHistorico: number): boolean {
  return clientes.length >= 3 && diasHistorico >= 30 && clientes.some(c => c.qtdAgendamentos >= 2);
}

// ─── Calcular métricas por cliente ────────────────────────────────────────────
async function calcularMetricasClientes(empresaId: number): Promise<{
  metricas: MetricasCliente[];
  diasHistorico: number;
}> {
  const db = await getDb();
  if (!db) return { metricas: [], diasHistorico: 0 };

  const clientes = await getClientesByEmpresa(empresaId);
  const agora = new Date();
  const inicio90dias = new Date(agora.getTime() - 90 * 86400000);
  const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);

  const agds = await db.select().from(agendamentos)
    .where(and(
      eq(agendamentos.empresaId, empresaId),
      gte(agendamentos.data, inicio90dias.toISOString().split("T")[0])
    ));

  // Determinar o histórico total
  const todasDatas = agds.map(a => new Date(a.data).getTime());
  const diasHistorico = todasDatas.length > 0
    ? Math.round((agora.getTime() - Math.min(...todasDatas)) / 86400000)
    : 0;

  const metricas: MetricasCliente[] = clientes.map(cliente => {
    const agdsCliente = agds.filter(a => a.clienteId === cliente.id);
    const concluidos = agdsCliente.filter(a => a.status === "concluido");
    const faltou = agdsCliente.filter(a => a.status === "faltou");
    const cancelados = agdsCliente.filter(a => a.status === "cancelado");
    const remarcados = agdsCliente.filter(a => a.status === "remarcado");

    const totalReceita = concluidos.reduce((acc, a) => acc + parseFloat(String(a.valorTotal ?? "0")), 0);

    const datasAgds = agdsCliente.map(a => new Date(a.data).getTime());
    const ultimoAgd = datasAgds.length > 0 ? Math.max(...datasAgds) : 0;
    const diasDesdeUltimo = ultimoAgd > 0 ? Math.round((agora.getTime() - ultimoAgd) / 86400000) : 999;

    const receitaMesAtual = agdsCliente
      .filter(a => a.data >= inicioMesAtual.toISOString().split("T")[0] && a.status === "concluido")
      .reduce((acc, a) => acc + parseFloat(String(a.valorTotal ?? "0")), 0);

    const receitaMesAnterior = agdsCliente
      .filter(a => a.data >= inicioMesAnterior.toISOString().split("T")[0] && a.data <= fimMesAnterior.toISOString().split("T")[0] && a.status === "concluido")
      .reduce((acc, a) => acc + parseFloat(String(a.valorTotal ?? "0")), 0);

    // Remarcados contam como cancelamento leve (metade do peso) para o escore
    const totalNaoCanc = agdsCliente.filter(a => a.status !== "cancelado" && a.status !== "remarcado").length;
    const basePontualidade = totalNaoCanc > 0 ? 1 - ((faltou.length + remarcados.length * 0.5) / (totalNaoCanc + remarcados.length)) : 1;
    // Penalidade por atrasos reais: >15min = -0.05, >30min = -0.10 por ocorrência
    const atrasosSignificativos = agdsCliente.filter(a => (a.minutosAtraso ?? 0) > 15);
    const penalAtraso = atrasosSignificativos.reduce((acc, a) => {
      const min = a.minutosAtraso ?? 0;
      return acc + (min > 30 ? 0.10 : 0.05);
    }, 0);
    const pctPontualidade = Math.max(0, basePontualidade - (agdsCliente.length > 0 ? penalAtraso / agdsCliente.length : 0));

    return {
      clienteId: cliente.id,
      nome: cliente.nome,
      totalReceita,
      qtdAgendamentos: agdsCliente.length,
      qtdConcluidos: concluidos.length,
      qtdFaltou: faltou.length,
      qtdCancelados: cancelados.length,
      diasDesdeUltimo,
      receitaMesAtual,
      receitaMesAnterior,
      pctPontualidade,
    };
  });

  return { metricas, diasHistorico };
}

// ─── Classificar cliente ──────────────────────────────────────────────────────
function classificarCliente(m: MetricasCliente, totalReceitaEmpresa: number): {
  classificacao: Classificacao;
  scoreCliente: number;
  resumo: string;
} {
  if (m.qtdAgendamentos < 2) {
    return { classificacao: "novo", scoreCliente: 50, resumo: "Cliente novo, ainda sem histórico suficiente para análise." };
  }

  // Score base
  let score = 50;

  // Pontualidade
  score += m.pctPontualidade >= 0.9 ? 20 : m.pctPontualidade >= 0.7 ? 10 : m.pctPontualidade >= 0.5 ? 0 : -15;

  // Receita
  const pctReceita = totalReceitaEmpresa > 0 ? m.totalReceita / totalReceitaEmpresa : 0;
  if (pctReceita > 0.2) score += 20;
  else if (pctReceita > 0.1) score += 10;
  else if (pctReceita > 0.05) score += 5;

  // Atividade recente
  if (m.diasDesdeUltimo <= 30) score += 10;
  else if (m.diasDesdeUltimo <= 60) score += 0;
  else if (m.diasDesdeUltimo <= 90) score -= 10;
  else score -= 20;

  // Tendência
  if (m.receitaMesAnterior > 0) {
    const tendencia = (m.receitaMesAtual - m.receitaMesAnterior) / m.receitaMesAnterior;
    if (tendencia > 0.2) score += 10;
    else if (tendencia < -0.3) score -= 10;
  }

  score = Math.min(100, Math.max(0, score));

  // Classificação
  let classificacao: Classificacao;
  let resumo: string;

  if (m.pctPontualidade < 0.5 && m.qtdFaltou >= 2) {
    classificacao = "risco";
    resumo = `Esse cliente tem histórico de faltas frequentes (${m.qtdFaltou} vezes). Precisa de atenção.`;
  } else if (m.pctPontualidade < 0.7) {
    classificacao = "atraso_frequente";
    resumo = `Esse cliente costuma faltar ou cancelar. Confirme sempre antes do atendimento.`;
  } else if (m.diasDesdeUltimo > 60) {
    classificacao = "inativo";
    resumo = `Esse cliente não aparece há ${m.diasDesdeUltimo} dias. Vale entrar em contato.`;
  } else if (pctReceita > 0.15) {
    classificacao = "principal";
    resumo = `Esse cliente é um dos seus mais importantes, gerando ${(pctReceita * 100).toFixed(0)}% da sua receita.`;
  } else if (m.receitaMesAtual > m.receitaMesAnterior * 1.2 && m.receitaMesAnterior > 0) {
    classificacao = "em_crescimento";
    resumo = `Esse cliente está crescendo! Está vindo mais vezes ou gastando mais.`;
  } else if (m.receitaMesAtual < m.receitaMesAnterior * 0.7 && m.receitaMesAnterior > 0) {
    classificacao = "em_queda";
    resumo = `Esse cliente está vindo menos. Pode ser bom entrar em contato.`;
  } else if (m.pctPontualidade >= 0.9 && m.qtdConcluidos >= 3) {
    classificacao = "bom_pagador";
    resumo = `Esse cliente é muito confiável, paga em dia e frequenta regularmente.`;
  } else {
    classificacao = "bom_pagador";
    resumo = `Cliente regular, sem problemas identificados.`;
  }

  return { classificacao, scoreCliente: score, resumo };
}

// ─── Gerar insights gerais ────────────────────────────────────────────────────
async function gerarInsightsClientes(empresaId: number, metricas: MetricasCliente[]) {
  const totalReceita = metricas.reduce((acc, m) => acc + m.totalReceita, 0);

  // Concentração de receita
  const top2Receita = [...metricas].sort((a, b) => b.totalReceita - a.totalReceita).slice(0, 2);
  const pctTop2 = totalReceita > 0 ? top2Receita.reduce((a, m) => a + m.totalReceita, 0) / totalReceita : 0;
  if (pctTop2 > 0.6 && metricas.length >= 5) {
    await saveInsightCliente({
      empresaId,
      tipo: "concentracao_receita",
      prioridade: "alta",
      titulo: "Você depende muito de poucos clientes",
      mensagem: `⚠️ ${top2Receita.map(m => m.nome).join(" e ")} representam ${Math.round(pctTop2 * 100)}% da sua receita. Se eles pararem de vir, você sentirá bastante.`,
      acao: "Tente atrair novos clientes para diversificar sua receita",
    });
  }

  // Clientes inativos
  const inativos = metricas.filter(m => m.diasDesdeUltimo > 60 && m.qtdConcluidos >= 2);
  if (inativos.length >= 2) {
    await saveInsightCliente({
      empresaId,
      tipo: "clientes_inativos",
      prioridade: "media",
      titulo: `${inativos.length} clientes pararam de aparecer`,
      mensagem: `💤 ${inativos.slice(0, 3).map(m => m.nome).join(", ")} não aparecem há mais de 60 dias. Eles podem ter ido para a concorrência.`,
      acao: "Entre em contato com esses clientes para reconquistá-los",
    });
  }

  // Inadimplência frequente
  const inadimplentes = metricas.filter(m => m.pctPontualidade < 0.6 && m.qtdFaltou >= 2);
  if (inadimplentes.length >= 1) {
    await saveInsightCliente({
      empresaId,
      tipo: "inadimplencia_frequente",
      prioridade: "alta",
      titulo: "Clientes com histórico de faltas",
      mensagem: `⚠️ ${inadimplentes.map(m => m.nome).join(", ")} ${inadimplentes.length === 1 ? "tem" : "têm"} histórico de faltas frequentes. Isso impacta sua receita.`,
      acao: "Considere exigir confirmação ou sinal para esses clientes",
    });
  }

  // Bons clientes
  const bons = metricas.filter(m => m.pctPontualidade >= 0.9 && m.qtdConcluidos >= 4);
  if (bons.length >= 2) {
    await saveInsightCliente({
      empresaId,
      tipo: "bons_clientes",
      prioridade: "baixa",
      titulo: `Você tem ${bons.length} clientes excelentes`,
      mensagem: `💎 ${bons.slice(0, 3).map(m => m.nome).join(", ")} são seus clientes mais confiáveis. Pagam em dia e aparecem regularmente.`,
      acao: "Valorize esses clientes com atenção especial ou benefícios exclusivos",
    });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const iaClientesRouter = router({
  // Rodar análise completa
  analisar: protectedProcedure.mutation(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) throw new Error("Empresa não encontrada");
    if (!(await empresaHasFeature(empresa.id, "iaTotal"))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "A IA de Clientes está disponível no plano Pro. Faça upgrade para usar este recurso." });
    }

    const { metricas, diasHistorico } = await calcularMetricasClientes(empresa.id);

    if (!temDadosSuficientes(metricas, diasHistorico)) {
      return {
        suficiente: false,
        mensagem: "Ainda não temos dados suficientes para analisar seus clientes. Continue usando o sistema que em breve teremos insights mais completos.",
        analisados: 0,
      };
    }

    const totalReceita = metricas.reduce((acc, m) => acc + m.totalReceita, 0);

    for (const m of metricas) {
      const { classificacao, scoreCliente, resumo } = classificarCliente(m, totalReceita);
      await saveAnaliseCliente({
        empresaId: empresa.id,
        clienteId: m.clienteId,
        classificacao,
        scoreCliente,
        resumo,
        detalhes: {
          totalReceita: m.totalReceita,
          qtdAgendamentos: m.qtdAgendamentos,
          qtdConcluidos: m.qtdConcluidos,
          qtdFaltou: m.qtdFaltou,
          diasDesdeUltimo: m.diasDesdeUltimo,
          pctPontualidade: m.pctPontualidade,
          receitaMesAtual: m.receitaMesAtual,
          receitaMesAnterior: m.receitaMesAnterior,
        },
      });
    }

    await gerarInsightsClientes(empresa.id, metricas);

    return {
      suficiente: true,
      analisados: metricas.length,
      mensagem: `${metricas.length} clientes analisados com sucesso.`,
    };
  }),

  // Buscar análise geral
  getAnalise: protectedProcedure.query(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) return null;

    const analises = await getAnaliseClientesByEmpresa(empresa.id);
    if (analises.length === 0) return null;

    const contagens = {
      principal: 0, bom_pagador: 0, em_crescimento: 0, em_queda: 0,
      inativo: 0, atraso_frequente: 0, risco: 0, novo: 0,
    };
    analises.forEach(a => { contagens[a.classificacao]++; });

    const totalReceita = analises.reduce((acc, a) => {
      const det = a.detalhes as any;
      return acc + (det?.totalReceita ?? 0);
    }, 0);

    const topClientes = [...analises]
      .sort((a, b) => {
        const ra = (a.detalhes as any)?.totalReceita ?? 0;
        const rb = (b.detalhes as any)?.totalReceita ?? 0;
        return rb - ra;
      })
      .slice(0, 5);

    const statusGeral = contagens.risco > 0 || contagens.atraso_frequente > 1
      ? "atencao"
      : contagens.inativo > analises.length * 0.3
      ? "atencao"
      : "saudavel";

    return {
      totalClientes: analises.length,
      statusGeral,
      contagens,
      topClientes,
      totalReceita,
      calculadoEm: analises[0]?.calculadoEm,
    };
  }),

  // Buscar análise de um cliente específico
  getClienteAnalise: protectedProcedure
    .input(z.object({ clienteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return null;
      return getAnaliseByCliente(empresa.id, input.clienteId);
    }),

  // Insights de clientes
  getInsights: protectedProcedure
    .input(z.object({ apenasNaoLidos: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getInsightsClientes(empresa.id, input.apenasNaoLidos);
    }),

  marcarInsightLido: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await marcarInsightClienteLido(input.id);
      return { ok: true };
    }),

  marcarTodosLidos: protectedProcedure.mutation(async ({ ctx }) => {
    const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    if (!empresa) return;
    await marcarTodosInsightsLidos(empresa.id);
    return { ok: true };
  }),

  // Chat sobre clientes
  chat: protectedProcedure
    .input(z.object({ mensagem: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      if (!(await empresaHasFeature(empresa.id, "iaTotal"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "A IA de Clientes está disponível no plano Pro. Faça upgrade para usar este recurso." });
      }

      const analises = await getAnaliseClientesByEmpresa(empresa.id);
      const insights = await getInsightsClientes(empresa.id, false);

      if (analises.length === 0) {
        return {
          resposta: "Ainda não há análise de clientes disponível. Execute a análise primeiro na seção 'IA Clientes'.",
        };
      }

      const topClientes = [...analises]
        .sort((a, b) => ((b.detalhes as any)?.totalReceita ?? 0) - ((a.detalhes as any)?.totalReceita ?? 0))
        .slice(0, 5);

      const clientesRisco = analises.filter(a => a.classificacao === "risco" || a.classificacao === "atraso_frequente");
      const clientesInativos = analises.filter(a => a.classificacao === "inativo");

      const contexto = `
Total de clientes analisados: ${analises.length}
Top clientes por receita: ${topClientes.map(a => `${(a.detalhes as any)?.clienteNome ?? a.clienteId} (R$ ${((a.detalhes as any)?.totalReceita ?? 0).toFixed(2)})`).join(", ")}
Clientes com risco/atraso: ${clientesRisco.length > 0 ? clientesRisco.map(a => a.clienteId).join(", ") : "nenhum"}
Clientes inativos: ${clientesInativos.length}
Insights recentes: ${insights.slice(0, 3).map(i => i.titulo).join("; ") || "Nenhum"}`;

      const resposta = await invokeOpenAI({
        messages: [
          {
            role: "system",
            content: `Você é um assistente que ajuda pequenos negócios a entender seus clientes.
Responda sempre em português, de forma simples e direta, sem termos técnicos.
Nunca invente dados. Use apenas as informações do contexto.
Sempre sugira uma ação prática.

Contexto atual dos clientes:
${contexto}`,
          },
          { role: "user", content: input.mensagem },
        ],
      });

      return { resposta: resposta.choices[0]?.message?.content ?? "Não consegui processar sua pergunta. Tente novamente." };
    }),
});
