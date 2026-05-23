import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, getEmpresaDoUsuario } from "../db";
import { agendamentos, clientes, profissionais, servicos } from "../../drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

export const relatoriosRouter = router({
  // ── Relatório de Perdas ────────────────────────────────────────────────────
  getPerdas: protectedProcedure
    .input(z.object({
      meses: z.number().min(1).max(12).default(3),
    }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");

      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const hoje = new Date();
      // Janela centrada em hoje: N meses para trás E N meses para frente
      // Garante que agendamentos futuros cancelados/faltou também apareçam
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - input.meses + 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + input.meses, 0);
      const inicioStr = inicio.toISOString().split("T")[0];
      const fimStr = fim.toISOString().split("T")[0];

      const todos = await db
        .select({
          id: agendamentos.id,
          data: agendamentos.data,
          status: agendamentos.status,
          valorTotal: agendamentos.valorTotal,
          clienteNome: clientes.nome,
          servicoNome: servicos.nome,
          profissionalNome: profissionais.nome,
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
        .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
        .where(and(
          eq(agendamentos.empresaId, empresa.id),
          sql`${agendamentos.data} >= ${inicioStr}`,
          sql`${agendamentos.data} <= ${fimStr}`,
        ));

      const cancelados = todos.filter(a => a.status === "cancelado");
      const faltou = todos.filter(a => a.status === "faltou");
      const validos = todos.filter(a => !["cancelado", "ocupado", "excluido"].includes(a.status ?? ""));

      const receitaPerdida = cancelados.reduce((s, a) => s + parseFloat(String(a.valorTotal ?? 0)), 0);
      const receitaFaltou = faltou.reduce((s, a) => s + parseFloat(String(a.valorTotal ?? 0)), 0);
      const receitaRealizada = validos.filter(a => a.status === "concluido").reduce((s, a) => s + parseFloat(String(a.valorTotal ?? 0)), 0);

      const porMes: Record<string, { cancelados: number; faltou: number; receita: number }> = {};
      for (const a of todos) {
        if (!a.data) continue;
        const mes = a.data.slice(0, 7);
        if (!porMes[mes]) porMes[mes] = { cancelados: 0, faltou: 0, receita: 0 };
        if (a.status === "cancelado") {
          porMes[mes].cancelados++;
          porMes[mes].receita += parseFloat(String(a.valorTotal ?? 0));
        } else if (a.status === "faltou") {
          porMes[mes].faltou++;
          porMes[mes].receita += parseFloat(String(a.valorTotal ?? 0));
        }
      }

      return {
        totalCancelados: cancelados.length,
        totalFaltou: faltou.length,
        receitaPerdida,
        receitaFaltou,
        receitaRealizada,
        taxaPerda: todos.length > 0 ? Math.round(((cancelados.length + faltou.length) / todos.length) * 100) : 0,
        porMes: Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v })),
        ultimosCancelados: cancelados.slice(-10).reverse().map(a => ({
          data: a.data,
          cliente: a.clienteNome,
          servico: a.servicoNome,
          profissional: a.profissionalNome,
          valor: parseFloat(String(a.valorTotal ?? 0)),
        })),
      };
    }),

  // ── Taxa de Ocupação ────────────────────────────────────────────────────────
  getTaxaOcupacao: protectedProcedure
    .input(z.object({
      meses: z.number().min(1).max(6).default(3),
    }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");

      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const hoje = new Date();
      // Janela: N meses passados + N meses futuros para capturar agendamentos futuros
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - input.meses + 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + input.meses, 0);
      const inicioStr = inicio.toISOString().split("T")[0];
      const fimStr = fim.toISOString().split("T")[0];

      const todos = await db
        .select({
          id: agendamentos.id,
          data: agendamentos.data,
          status: agendamentos.status,
          profissionalId: agendamentos.profissionalId,
          profissionalNome: profissionais.nome,
        })
        .from(agendamentos)
        .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
        .where(and(
          eq(agendamentos.empresaId, empresa.id),
          sql`${agendamentos.data} >= ${inicioStr}`,
          sql`${agendamentos.data} <= ${fimStr}`,
          sql`${agendamentos.status} NOT IN ('cancelado', 'ocupado', 'excluido')`,
        ));

      const porDiaSemana: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      for (const a of todos) {
        if (!a.data) continue;
        const d = new Date(a.data + "T12:00:00");
        porDiaSemana[d.getDay()]++;
      }

      const porProfissional: Record<string, { nome: string; total: number; concluidos: number }> = {};
      for (const a of todos) {
        const key = String(a.profissionalId ?? "sem");
        if (!porProfissional[key]) porProfissional[key] = { nome: a.profissionalNome ?? "Sem profissional", total: 0, concluidos: 0 };
        porProfissional[key].total++;
        if (a.status === "concluido") porProfissional[key].concluidos++;
      }

      const porMes: Record<string, { total: number; concluidos: number }> = {};
      for (const a of todos) {
        if (!a.data) continue;
        const mes = a.data.slice(0, 7);
        if (!porMes[mes]) porMes[mes] = { total: 0, concluidos: 0 };
        porMes[mes].total++;
        if (a.status === "concluido") porMes[mes].concluidos++;
      }

      const diasNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      const totalGeral = todos.length;
      const concluidosGeral = todos.filter(a => a.status === "concluido").length;

      return {
        totalAgendamentos: totalGeral,
        totalConcluidos: concluidosGeral,
        taxaOcupacaoGeral: totalGeral > 0 ? Math.round((concluidosGeral / totalGeral) * 100) : 0,
        porDiaSemana: Object.entries(porDiaSemana).map(([dow, count]) => ({
          dia: diasNomes[Number(dow)],
          agendamentos: count,
        })),
        porProfissional: Object.values(porProfissional).sort((a, b) => b.total - a.total).map(p => ({
          nome: p.nome,
          total: p.total,
          concluidos: p.concluidos,
          taxa: p.total > 0 ? Math.round((p.concluidos / p.total) * 100) : 0,
        })),
        porMes: Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({
          mes,
          total: v.total,
          concluidos: v.concluidos,
          taxa: v.total > 0 ? Math.round((v.concluidos / v.total) * 100) : 0,
        })),
      };
    }),

  // ── Previsão de Faturamento ─────────────────────────────────────────────────
  getPrevisaoFaturamento: protectedProcedure
    .query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");

      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const hoje = new Date();

      // Buscar os próximos 6 meses a partir do mês atual
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
      const fimProximos6Meses = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 0).toISOString().split("T")[0];

      // Busca todos os agendamentos do mês atual até 6 meses à frente
      const proximosMeses = await db
        .select({ status: agendamentos.status, valorTotal: agendamentos.valorTotal, data: agendamentos.data })
        .from(agendamentos)
        .where(and(
          eq(agendamentos.empresaId, empresa.id),
          sql`${agendamentos.data} >= ${inicioMesAtual}`,
          sql`${agendamentos.data} <= ${fimProximos6Meses}`,
          sql`${agendamentos.status} NOT IN ('cancelado', 'ocupado', 'excluido')`,
        ));

      // Determinar o "mês de referência": o mês atual se tiver dados, senão o próximo mês com dados
      let mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const mesesComDados = new Set(proximosMeses.map(a => a.data?.slice(0, 7)).filter(Boolean) as string[]);
      if (!mesesComDados.has(mesReferencia) && mesesComDados.size > 0) {
        const mesesOrdenados = Array.from(mesesComDados).sort();
        mesReferencia = mesesOrdenados[0]!;
      }

      // Dados do mês de referência
      const mesAtual = proximosMeses.filter(a => a.data?.startsWith(mesReferencia));

      // Histórico: buscar até 3 meses anteriores ao mês de referência
      const [anoRef, mesRefNum] = mesReferencia.split("-").map(Number);
      const inicio3Meses = new Date(anoRef!, mesRefNum! - 1 - 3, 1).toISOString().split("T")[0];
      const fim3Meses = new Date(anoRef!, mesRefNum! - 1, 0).toISOString().split("T")[0];

      const historico = await db
        .select({ status: agendamentos.status, valorTotal: agendamentos.valorTotal, data: agendamentos.data })
        .from(agendamentos)
        .where(and(
          eq(agendamentos.empresaId, empresa.id),
          sql`${agendamentos.data} >= ${inicio3Meses}`,
          sql`${agendamentos.data} <= ${fim3Meses}`,
          sql`${agendamentos.status} NOT IN ('cancelado', 'ocupado', 'excluido')`,
        ));

      const receitaRealizada = mesAtual.filter(a => a.status === "concluido").reduce((s, a) => s + parseFloat(String(a.valorTotal ?? 0)), 0);
      const receitaPrevista = mesAtual.filter(a => ["agendado", "confirmado"].includes(a.status ?? "")).reduce((s, a) => s + parseFloat(String(a.valorTotal ?? 0)), 0);

      const receitaHistorico = historico.filter(a => a.status === "concluido").reduce((s, a) => s + parseFloat(String(a.valorTotal ?? 0)), 0);
      const mediaMensal = receitaHistorico / 3;

      // Calcular dias do mês de referência
      const [anoR, mesR] = mesReferencia.split("-").map(Number);
      const diasNoMes = new Date(anoR!, mesR!, 0).getDate();

      // Se o mês de referência é o mês atual, usar dias passados reais; senão, considerar mês inteiro como futuro
      const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const ehMesAtual = mesReferencia === mesAtualStr;
      const diasPassados = ehMesAtual ? hoje.getDate() : 0;
      const diasRestantes = ehMesAtual ? diasNoMes - diasPassados : diasNoMes;

      // Projeção: se mês atual, usa ritmo atual; se mês futuro, usa receita prevista (agendado + confirmado)
      const ritmoAtual = diasPassados > 0 ? receitaRealizada / diasPassados : 0;
      const projecaoMes = ehMesAtual
        ? receitaRealizada + (ritmoAtual * diasRestantes)
        : receitaPrevista;

      const agendamentosFuturos = mesAtual.filter(a => {
        if (!a.data) return false;
        return a.data >= hoje.toISOString().split("T")[0] && ["agendado", "confirmado"].includes(a.status ?? "");
      });

      // Resumo por mês (próximos 6 meses) para gráfico
      const resumoPorMes: Record<string, { realizado: number; previsto: number; total: number }> = {};
      for (const a of proximosMeses) {
        if (!a.data) continue;
        const mes = a.data.slice(0, 7);
        if (!resumoPorMes[mes]) resumoPorMes[mes] = { realizado: 0, previsto: 0, total: 0 };
        const valor = parseFloat(String(a.valorTotal ?? 0));
        resumoPorMes[mes].total++;
        if (a.status === "concluido") resumoPorMes[mes].realizado += valor;
        else if (["agendado", "confirmado"].includes(a.status ?? "")) resumoPorMes[mes].previsto += valor;
      }

      return {
        mesReferencia,
        receitaRealizada,
        receitaPrevista,
        projecaoMes,
        mediaMensal3Meses: mediaMensal,
        diasPassados,
        diasRestantes,
        diasNoMes,
        agendamentosFuturos: agendamentosFuturos.length,
        comparacaoMedia: mediaMensal > 0 ? Math.round(((projecaoMes - mediaMensal) / mediaMensal) * 100) : 0,
        totalMesAtual: mesAtual.length,
        resumoPorMes: Object.entries(resumoPorMes).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v })),
      };
    }),
});
