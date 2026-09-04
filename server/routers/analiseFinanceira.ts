import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { isSystemOwner } from "../access-control";
import { getDb, getEmpresaDoContexto, getPermissoesGrupoByProfissional } from "../db";
import {
  agendamentoPagamentos,
  agendamentos,
  clientes,
  comissoes,
  contasReceber,
  pacotesClientes,
  pacotesClientesPagamentos,
  profissionais,
  servicos,
} from "../../drizzle/schema";

const inputPeriodo = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  profissionalId: z.number().nullable().optional(),
});

function valor(numero: unknown) {
  return Number(numero ?? 0);
}

export function normalizarFormaPagamento(valorOriginal: string | null) {
  const valorNormalizado = (valorOriginal ?? "outro").trim().toLowerCase();
  const nomes: Record<string, string> = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao_credito: "Cartão de crédito",
    credito: "Cartão de crédito",
    cartao_debito: "Cartão de débito",
    debito: "Cartão de débito",
    link: "Link de pagamento",
    outro: "Outros",
  };
  return nomes[valorNormalizado] ?? valorOriginal ?? "Outros";
}

async function empresaComAcessoFinanceiro(ctx: any) {
  const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
  if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

  if (!ctx.systemUser || isSystemOwner(ctx.systemUser.id, ctx.systemUser.isOwner, empresa.ownerId)) {
    return { empresa, profissionalRestrito: null as number | null };
  }

  if (ctx.systemUser) {
    const profissionalId = ctx.systemUser.profissionalId ?? ctx.systemUser.id;
    const permissoes = await getPermissoesGrupoByProfissional(profissionalId);
    if (!(permissoes as any)?.financeiroVer) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para visualizar o financeiro." });
    }
    return {
      empresa,
      profissionalRestrito: (permissoes as any)?.financeiroEscopo === "todos" ? null : profissionalId,
    };
  }
  return { empresa, profissionalRestrito: null as number | null };
}

export const analiseFinanceiraRouter = router({
  resumo: protectedProcedure.input(inputPeriodo).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    const acesso = await empresaComAcessoFinanceiro(ctx);
    const empresa = acesso.empresa;
    if (acesso.profissionalRestrito && input.profissionalId && input.profissionalId !== acesso.profissionalRestrito) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para visualizar dados de outro profissional." });
    }
    const profissionalRestrito = acesso.profissionalRestrito ?? input.profissionalId ?? null;
    const dataFimDate = new Date(`${input.dataFim}T23:59:59.999-03:00`);
    const dataInicioDate = new Date(`${input.dataInicio}T00:00:00.000-03:00`);

    const filtroAgendamentos = and(
      eq(agendamentos.empresaId, empresa.id),
      eq(agendamentos.status, "concluido"),
      gte(agendamentos.data, input.dataInicio),
      lte(agendamentos.data, input.dataFim),
      profissionalRestrito ? eq(agendamentos.profissionalId, profissionalRestrito) : sql`1 = 1`,
    );

    const vendasServico = await db.select({
      servicoId: agendamentos.servicoId,
      nome: servicos.nome,
      quantidade: sql<number>`count(${agendamentos.id})`,
      faturamento: sql<string>`coalesce(sum(${agendamentos.valorTotal}), 0)`,
      desconto: sql<string>`coalesce(sum(${agendamentos.desconto}), 0)`,
      taxaAdicional: sql<string>`coalesce(sum(${agendamentos.taxaAdicional}), 0)`,
    }).from(agendamentos)
      .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .where(filtroAgendamentos)
      .groupBy(agendamentos.servicoId, servicos.nome)
      .orderBy(desc(sql`sum(${agendamentos.valorTotal})`));

    const vendasDetalhes = await db.select({
      id: agendamentos.id,
      servicoId: agendamentos.servicoId,
      profissionalId: agendamentos.profissionalId,
      data: agendamentos.data,
      valor: agendamentos.valorTotal,
      desconto: agendamentos.desconto,
      servico: servicos.nome,
      cliente: clientes.nome,
      profissional: profissionais.nome,
    }).from(agendamentos)
      .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
      .where(filtroAgendamentos)
      .orderBy(desc(agendamentos.data), desc(agendamentos.id));

    const pacotes = profissionalRestrito
      ? []
      : await db.select({
      id: pacotesClientes.id,
      nome: pacotesClientes.nome,
      cliente: clientes.nome,
      valorTotal: pacotesClientes.valorTotal,
      valorRecebido: pacotesClientes.valorRecebido,
      custoTotal: pacotesClientes.custoTotal,
      status: pacotesClientes.status,
      statusPagamento: pacotesClientes.statusPagamento,
      dataAbertura: pacotesClientes.dataAbertura,
    }).from(pacotesClientes)
      .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
      .where(and(
        eq(pacotesClientes.empresaId, empresa.id),
        gte(pacotesClientes.dataAbertura, dataInicioDate),
        lte(pacotesClientes.dataAbertura, dataFimDate),
      ))
      .orderBy(desc(pacotesClientes.dataAbertura));

    const comissoesDetalhes = await db.select({
      id: comissoes.id,
      profissionalId: comissoes.profissionalId,
      profissional: profissionais.nome,
      agendamentoId: comissoes.agendamentoId,
      servico: servicos.nome,
      valorServico: comissoes.valorServico,
      valorLiquido: comissoes.valorLiquido,
      valorComissao: comissoes.valorComissao,
      receitaDona: comissoes.receitaDona,
      taxaMaquininha: comissoes.taxaMaquininha,
      custoReposicao: comissoes.custoReposicao,
      paga: comissoes.paga,
      criadoEm: comissoes.createdAt,
    }).from(comissoes)
      .leftJoin(profissionais, eq(comissoes.profissionalId, profissionais.id))
      .leftJoin(agendamentos, eq(comissoes.agendamentoId, agendamentos.id))
      .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .where(and(
        eq(comissoes.empresaId, empresa.id),
        gte(comissoes.createdAt, dataInicioDate),
        lte(comissoes.createdAt, dataFimDate),
        profissionalRestrito ? eq(comissoes.profissionalId, profissionalRestrito) : sql`1 = 1`,
      ))
      .orderBy(desc(comissoes.createdAt));

    const pagamentosAgendamento = await db.select({
      id: agendamentoPagamentos.id,
      valor: agendamentoPagamentos.valor,
      formaPagamento: agendamentoPagamentos.meioPagamento,
      data: agendamentoPagamentos.createdAt,
      origem: sql<string>`'Atendimento'`,
      referencia: servicos.nome,
      cliente: clientes.nome,
    }).from(agendamentoPagamentos)
      .innerJoin(agendamentos, eq(agendamentoPagamentos.agendamentoId, agendamentos.id))
      .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .where(and(
        eq(agendamentos.empresaId, empresa.id),
        gte(agendamentoPagamentos.createdAt, dataInicioDate),
        lte(agendamentoPagamentos.createdAt, dataFimDate),
        profissionalRestrito ? eq(agendamentos.profissionalId, profissionalRestrito) : sql`1 = 1`,
      ));

    const pagamentosPacote = profissionalRestrito
      ? []
      : await db.select({
        id: pacotesClientesPagamentos.id,
        pacoteClienteId: pacotesClientesPagamentos.pacoteClienteId,
        valor: pacotesClientesPagamentos.valor,
        formaPagamento: pacotesClientesPagamentos.formaPagamento,
        data: pacotesClientesPagamentos.dataPagamento,
        origem: sql<string>`'Pacote'`,
        referencia: pacotesClientes.nome,
        cliente: clientes.nome,
      }).from(pacotesClientesPagamentos)
        .leftJoin(pacotesClientes, eq(pacotesClientesPagamentos.pacoteClienteId, pacotesClientes.id))
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(and(
          eq(pacotesClientesPagamentos.empresaId, empresa.id),
          gte(pacotesClientesPagamentos.dataPagamento, dataInicioDate),
          lte(pacotesClientesPagamentos.dataPagamento, dataFimDate),
        ));

    // Esta é a mesma base exibida no card "Valores recebidos" do Financeiro.
    // Ela permite abrir o indicador e conferir cada baixa sem confundir venda
    // contratada com entrada efetivamente registrada.
    const recebimentosDetalhes = await db.select({
      id: contasReceber.id,
      descricao: contasReceber.descricao,
      valor: contasReceber.valor,
      data: contasReceber.dataRecebimento,
      vencimento: contasReceber.dataVencimento,
      origem: contasReceber.origem,
      formaPagamento: contasReceber.tipoPagamento,
      cliente: clientes.nome,
      profissional: profissionais.nome,
    }).from(contasReceber)
      .leftJoin(clientes, eq(contasReceber.clienteId, clientes.id))
      .leftJoin(profissionais, eq(contasReceber.profissionalId, profissionais.id))
      .where(and(
        eq(contasReceber.empresaId, empresa.id),
        eq(contasReceber.status, "recebido"),
        gte(contasReceber.dataRecebimento, input.dataInicio),
        lte(contasReceber.dataRecebimento, input.dataFim),
        profissionalRestrito ? eq(contasReceber.profissionalId, profissionalRestrito) : sql`1 = 1`,
      ))
      .orderBy(desc(contasReceber.dataRecebimento), desc(contasReceber.id));

    const recebimentosPacotePorId = pagamentosPacote.reduce<Record<number, number>>((acc, pagamento) => {
      const id = pagamento.pacoteClienteId;
      acc[id] = (acc[id] ?? 0) + valor(pagamento.valor);
      return acc;
    }, {});

    const pagamentosDetalhes = [...pagamentosAgendamento, ...pagamentosPacote]
      .map(item => ({ ...item, forma: normalizarFormaPagamento(item.formaPagamento) }))
      .sort((a, b) => new Date(b.data ?? 0).getTime() - new Date(a.data ?? 0).getTime());

    const formasPagamento = Object.values(pagamentosDetalhes.reduce<Record<string, { forma: string; quantidade: number; recebido: number }>>((acc, pagamento) => {
      const forma = pagamento.forma;
      if (!acc[forma]) acc[forma] = { forma, quantidade: 0, recebido: 0 };
      acc[forma].quantidade += 1;
      acc[forma].recebido += valor(pagamento.valor);
      return acc;
    }, {})).sort((a, b) => b.recebido - a.recebido);

    const profissionaisPorId = vendasDetalhes.reduce<Record<number, {
      profissionalId: number; nome: string; atendimentos: number; bruto: number; liquido: number; comissao: number; receitaDona: number; taxas: number; custos: number;
    }>>((acc, item) => {
      const id = item.profissionalId ?? 0;
      if (!acc[id]) acc[id] = { profissionalId: id, nome: item.profissional ?? "Profissional não identificado", atendimentos: 0, bruto: 0, liquido: 0, comissao: 0, receitaDona: 0, taxas: 0, custos: 0 };
      acc[id].atendimentos += 1;
      acc[id].bruto += valor(item.valor);
      return acc;
    }, {});

    comissoesDetalhes.forEach(item => {
      const id = item.profissionalId;
      if (!profissionaisPorId[id]) profissionaisPorId[id] = { profissionalId: id, nome: item.profissional ?? "Profissional", atendimentos: 0, bruto: 0, liquido: 0, comissao: 0, receitaDona: 0, taxas: 0, custos: 0 };
      profissionaisPorId[id].liquido += valor(item.valorLiquido);
      profissionaisPorId[id].comissao += valor(item.valorComissao);
      profissionaisPorId[id].receitaDona += valor(item.receitaDona);
      profissionaisPorId[id].taxas += valor(item.taxaMaquininha);
      profissionaisPorId[id].custos += valor(item.custoReposicao);
    });
    const rankingProfissionais = Object.values(profissionaisPorId).sort((a, b) => b.bruto - a.bruto);

    const resumoServicos = vendasServico.map(item => ({
      servicoId: item.servicoId,
      nome: item.nome ?? "Serviço removido",
      quantidade: valor(item.quantidade),
      faturamento: valor(item.faturamento),
      desconto: valor(item.desconto),
      taxaAdicional: valor(item.taxaAdicional),
      ticketMedio: valor(item.quantidade) ? valor(item.faturamento) / valor(item.quantidade) : 0,
    }));

    const resumoPacotes = pacotes.map(item => ({
      ...item,
      valorTotal: valor(item.valorTotal),
      valorRecebido: valor(item.valorRecebido),
      recebidoNoPeriodo: recebimentosPacotePorId[item.id] ?? 0,
      custoTotal: valor(item.custoTotal),
      saldoAberto: Math.max(0, valor(item.valorTotal) - valor(item.valorRecebido)),
      margemPrevista: valor(item.valorTotal) - valor(item.custoTotal),
    }));

    return {
      periodo: { dataInicio: input.dataInicio, dataFim: input.dataFim },
      totais: {
        faturamentoServicos: resumoServicos.reduce((total, item) => total + item.faturamento, 0),
        atendimentosConcluidos: resumoServicos.reduce((total, item) => total + item.quantidade, 0),
        valorPacotesVendidos: resumoPacotes.reduce((total, item) => total + item.valorTotal, 0),
        valorPacotesRecebido: pagamentosPacote.reduce((total, item) => total + valor(item.valor), 0),
        entradasRegistradas: formasPagamento.reduce((total, item) => total + item.recebido, 0),
        valoresRecebidos: recebimentosDetalhes.reduce((total, item) => total + valor(item.valor), 0),
      },
      servicos: resumoServicos,
      pacotes: resumoPacotes,
      profissionais: rankingProfissionais,
      pagamentos: formasPagamento,
      recebimentos: recebimentosDetalhes.map(item => ({
        ...item,
        valor: valor(item.valor),
        forma: item.formaPagamento ? normalizarFormaPagamento(item.formaPagamento) : null,
      })),
      detalhes: {
        vendas: vendasDetalhes,
        pacotes: resumoPacotes,
        profissionais: comissoesDetalhes,
        pagamentos: pagamentosDetalhes,
        recebimentos: recebimentosDetalhes.map(item => ({
          ...item,
          valor: valor(item.valor),
          forma: item.formaPagamento ? normalizarFormaPagamento(item.formaPagamento) : null,
        })),
      },
    };
  }),
});
