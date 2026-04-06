/**
 * Router de Pacotes de Serviços
 * Gerencia modelos de pacotes e pacotes por cliente.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { getEmpresaDoContexto } from "../db";
import { TRPCError } from "@trpc/server";
import {
  pacotesModelos, pacotesModelosItens,
  pacotesClientes, pacotesClientesItens,
  notificacoesPacotes,
  servicos, clientes,
  agendamentos, agendamentoItens,
  profissionais,
} from "../../drizzle/schema";
import { eq, and, sql, lte, gt, like, or } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { getAutomacaoByEvento, registrarEnvioAutomacao, getPermissoesGrupoByProfissional } from "../db";
import { waManager } from "../whatsapp";

async function getEmpresaId(userId: number, systemUserEmpresaId?: number | null): Promise<number> {
  const empresa = await getEmpresaDoContexto(userId, systemUserEmpresaId);
  if (!empresa) throw new Error("Empresa não encontrada");
  return empresa.id;
}

async function requirePermissaoPacotes(
  ctx: { user: { id: number } | null; systemUser?: { id: number; empresaId: number; profissionalId?: number | null } | null },
  permField: string
): Promise<void> {
  if (!ctx.systemUser) return; // OAuth user = owner, sempre tem permissão
  const perms = await getPermissoesGrupoByProfissional(ctx.systemUser.profissionalId ?? ctx.systemUser.id);
  if (!perms || !(perms as any)[permField]) {
    throw new TRPCError({ code: 'FORBIDDEN', message: `Sem permissão: ${permField}` });
  }
}

// ─── MODELOS ─────────────────────────────────────────────────────────────────

const itemModeloSchema = z.object({
  servicoId: z.number(),
  quantidade: z.number().min(1),
});

export const pacotesRouter = router({

  // ── Listar modelos ────────────────────────────────────────────────────────
  listarModelos: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const modelos = await db.select().from(pacotesModelos)
        .where(eq(pacotesModelos.empresaId, empId))
        .orderBy(sql`${pacotesModelos.criadoEm} DESC`);
      // Buscar itens de cada modelo
      const ids = modelos.map(m => m.id);
      if (!ids.length) return modelos.map(m => ({ ...m, itens: [] }));
      const itens = await db.select({
        id: pacotesModelosItens.id,
        modeloId: pacotesModelosItens.modeloId,
        servicoId: pacotesModelosItens.servicoId,
        quantidade: pacotesModelosItens.quantidade,
        servicoNome: servicos.nome,
      }).from(pacotesModelosItens)
        .leftJoin(servicos, eq(pacotesModelosItens.servicoId, servicos.id))
        .where(sql`${pacotesModelosItens.modeloId} IN (${ids.join(",")})`);
      return modelos.map(m => ({
        ...m,
        itens: itens.filter(i => i.modeloId === m.id),
      }));
    }),

  // ── Criar modelo ─────────────────────────────────────────────────────────
  criarModelo: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      descricao: z.string().optional(),
      preco: z.number().min(0),
      validadeDias: z.number().optional(),
      itens: z.array(itemModeloSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await requirePermissaoPacotes(ctx, 'pacotesEditar');
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const [result] = await db.insert(pacotesModelos).values({
        empresaId: empId,
        nome: input.nome,
        descricao: input.descricao,
        preco: String(input.preco),
        validadeDias: input.validadeDias,
      });
      const modeloId = (result as any).insertId as number;
      await db.insert(pacotesModelosItens).values(
        input.itens.map(i => ({ modeloId, servicoId: i.servicoId, quantidade: i.quantidade }))
      );
      return { id: modeloId };
    }),

  // ── Editar modelo ─────────────────────────────────────────────────────────
  editarModelo: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2),
      descricao: z.string().optional(),
      preco: z.number().min(0),
      validadeDias: z.number().optional(),
      itens: z.array(itemModeloSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await requirePermissaoPacotes(ctx, 'pacotesEditar');
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      await db.update(pacotesModelos).set({
        nome: input.nome,
        descricao: input.descricao,
        preco: String(input.preco),
        validadeDias: input.validadeDias,
      }).where(and(eq(pacotesModelos.id, input.id), eq(pacotesModelos.empresaId, empId)));
      // Recriar itens
      await db.delete(pacotesModelosItens).where(eq(pacotesModelosItens.modeloId, input.id));
      await db.insert(pacotesModelosItens).values(
        input.itens.map(i => ({ modeloId: input.id, servicoId: i.servicoId, quantidade: i.quantidade }))
      );
      return { ok: true };
    }),

  // ── Desativar modelo ──────────────────────────────────────────────────────
  desativarModelo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await requirePermissaoPacotes(ctx, 'pacotesExcluir');
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      await db.update(pacotesModelos).set({ ativo: false })
        .where(and(eq(pacotesModelos.id, input.id), eq(pacotesModelos.empresaId, empId)));
      return { ok: true };
    }),

  // ─── PACOTES DE CLIENTES ──────────────────────────────────────────────────

  // ── Listar todos os pacotes (admin) ───────────────────────────────────────
  listarTodos: protectedProcedure
    .input(z.object({
      status: z.enum(["ativo", "concluido", "vencido", "cancelado", "todos"]).default("ativo"),
      busca: z.string().optional(), // filtro por nome de cliente
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const rows = await db.select({
        id: pacotesClientes.id,
        nome: pacotesClientes.nome,
        status: pacotesClientes.status,
        valorPago: pacotesClientes.valorPago,
        formaPagamento: pacotesClientes.formaPagamento,
        numeroParcelas: pacotesClientes.numeroParcelas,
        valorParcela: pacotesClientes.valorParcela,
        dataAbertura: pacotesClientes.dataAbertura,
        dataVencimento: pacotesClientes.dataVencimento,
        clienteId: pacotesClientes.clienteId,
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
      }).from(pacotesClientes)
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          input.status !== "todos" ? eq(pacotesClientes.status, input.status) : sql`1=1`,
          input.busca ? like(clientes.nome, `%${input.busca}%`) : sql`1=1`,
        ))
        .orderBy(sql`${pacotesClientes.criadoEm} DESC`);

      // Buscar itens de cada pacote
      const ids = rows.map(r => r.id);
      if (!ids.length) return rows.map(r => ({ ...r, itens: [] }));
      const itens = await db.select({
        id: pacotesClientesItens.id,
        pacoteClienteId: pacotesClientesItens.pacoteClienteId,
        servicoId: pacotesClientesItens.servicoId,
        quantidadeTotal: pacotesClientesItens.quantidadeTotal,
        quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        servicoNome: servicos.nome,
      }).from(pacotesClientesItens)
        .leftJoin(servicos, eq(pacotesClientesItens.servicoId, servicos.id))
        .where(sql`${pacotesClientesItens.pacoteClienteId} IN (${ids.join(",")})`);

      return rows.map(r => ({
        ...r,
        itens: itens.filter(i => i.pacoteClienteId === r.id),
      }));
    }),

  // ── Listar pacotes de um cliente ──────────────────────────────────────────
  listarPorCliente: protectedProcedure
    .input(z.object({ clienteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const rows = await db.select().from(pacotesClientes)
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          eq(pacotesClientes.clienteId, input.clienteId),
        ))
        .orderBy(sql`${pacotesClientes.criadoEm} DESC`);

      const ids = rows.map(r => r.id);
      if (!ids.length) return rows.map(r => ({ ...r, itens: [] }));
      const itens = await db.select({
        id: pacotesClientesItens.id,
        pacoteClienteId: pacotesClientesItens.pacoteClienteId,
        servicoId: pacotesClientesItens.servicoId,
        quantidadeTotal: pacotesClientesItens.quantidadeTotal,
        quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        servicoNome: servicos.nome,
      }).from(pacotesClientesItens)
        .leftJoin(servicos, eq(pacotesClientesItens.servicoId, servicos.id))
        .where(sql`${pacotesClientesItens.pacoteClienteId} IN (${ids.join(",")})`);

      return rows.map(r => ({
        ...r,
        itens: itens.filter(i => i.pacoteClienteId === r.id),
      }));
    }),

  // ── Listar pacotes ativos com sessões disponíveis (para vincular ao agendamento) ─────────
  listarAtivosComSessoes: protectedProcedure
    .input(z.object({
      clienteId: z.number(),
      servicoId: z.number().optional(), // filtrar por serviço específico
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);

      // Buscar pacotes ativos do cliente
      const pacotes = await db.select({
        id: pacotesClientes.id,
        nome: pacotesClientes.nome,
        dataVencimento: pacotesClientes.dataVencimento,
      }).from(pacotesClientes)
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          eq(pacotesClientes.clienteId, input.clienteId),
          eq(pacotesClientes.status, "ativo"),
        ));

      if (!pacotes.length) return [];

      const ids = pacotes.map(p => p.id);
      // Buscar itens com sessões disponíveis
      const itens = await db.select({
        id: pacotesClientesItens.id,
        pacoteClienteId: pacotesClientesItens.pacoteClienteId,
        servicoId: pacotesClientesItens.servicoId,
        quantidadeTotal: pacotesClientesItens.quantidadeTotal,
        quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        servicoNome: servicos.nome,
      }).from(pacotesClientesItens)
        .leftJoin(servicos, eq(pacotesClientesItens.servicoId, servicos.id))
        .where(sql`${pacotesClientesItens.pacoteClienteId} IN (${ids.join(",")})`);

      // Montar resultado com sessões disponíveis
      const resultado = [];
      for (const pacote of pacotes) {
        const itensDoPacote = itens.filter(i => i.pacoteClienteId === pacote.id);
        for (const item of itensDoPacote) {
          const disponivel = item.quantidadeTotal - item.quantidadeUsada;
          if (disponivel <= 0) continue;
          if (input.servicoId && item.servicoId !== input.servicoId) continue;
          resultado.push({
            pacoteClienteItemId: item.id,
            pacoteId: pacote.id,
            pacoteNome: pacote.nome,
            servicoId: item.servicoId,
            servicoNome: item.servicoNome,
            sessoesDisponiveis: disponivel,
            sessoesTotal: item.quantidadeTotal,
            sessoesUsadas: item.quantidadeUsada,
            dataVencimento: pacote.dataVencimento,
          });
        }
      }
      return resultado;
    }),

  // ── Abrir pacote para cliente ─────────────────────────────────────────────
  abrirPacote: protectedProcedure
    .input(z.object({
      clienteId: z.number(),
      modeloId: z.number().optional(),
      nome: z.string().min(2),
      valorPago: z.number().min(0),
      formaPagamento: z.string().optional(),
      numeroParcelas: z.number().min(1).max(24).optional().default(1),
      validadeDias: z.number().optional(),
      observacoes: z.string().optional(),
      automacaoRenovacao: z.boolean().optional(),
      dataValidade: z.string().nullable().optional(),
      itens: z.array(z.object({
        servicoId: z.number(),
        quantidadeTotal: z.number().min(1),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await requirePermissaoPacotes(ctx, 'pacotesEditar');
      let dataVencimento: Date | undefined;
      if (input.validadeDias) {
        dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + input.validadeDias);
      }

      const numeroParcelas = input.numeroParcelas ?? 1;
      const valorParcela = numeroParcelas > 1 ? input.valorPago / numeroParcelas : null;

      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const [result] = await db.insert(pacotesClientes).values({
        empresaId: empId,
        clienteId: input.clienteId,
        modeloId: input.modeloId,
        nome: input.nome,
        valorPago: String(input.valorPago),
        formaPagamento: input.formaPagamento,
        numeroParcelas,
        valorParcela: valorParcela !== null ? String(valorParcela) : undefined,
        dataVencimento,
        observacoes: input.observacoes,
        automacaoRenovacao: input.automacaoRenovacao ?? false,
        dataValidade: input.dataValidade ? new Date(input.dataValidade) : undefined,
      });
      const pacoteId = (result as any).insertId as number;

      await db.insert(pacotesClientesItens).values(
        input.itens.map(i => ({
          pacoteClienteId: pacoteId,
          servicoId: i.servicoId,
          quantidadeTotal: i.quantidadeTotal,
          quantidadeUsada: 0,
        }))
      );

      // Notificar dono
      const clienteRow = await db.select({ nome: clientes.nome })
        .from(clientes).where(eq(clientes.id, input.clienteId)).limit(1);
      await notifyOwner({
        title: "Novo pacote aberto",
        content: `Pacote "${input.nome}" aberto para ${clienteRow[0]?.nome ?? "cliente"} — R$ ${input.valorPago.toFixed(2)}`,
      });

      return { id: pacoteId };
    }),

  // ── Consumir sessão manualmente ───────────────────────────────────────────
  consumirSessao: protectedProcedure
    .input(z.object({
      pacoteClienteItemId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Buscar item e verificar se pertence à empresa
      const [item] = await db.select({
        id: pacotesClientesItens.id,
        pacoteClienteId: pacotesClientesItens.pacoteClienteId,
        quantidadeTotal: pacotesClientesItens.quantidadeTotal,
        quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        servicoNome: servicos.nome,
      }).from(pacotesClientesItens)
        .leftJoin(servicos, eq(pacotesClientesItens.servicoId, servicos.id))
        .where(eq(pacotesClientesItens.id, input.pacoteClienteItemId))
        .limit(1);

      if (!item) throw new Error("Item não encontrado");
      if (item.quantidadeUsada >= item.quantidadeTotal) {
        throw new Error("Todas as sessões deste item já foram utilizadas");
      }

      const novaQtd = item.quantidadeUsada + 1;
      await db.update(pacotesClientesItens)
        .set({ quantidadeUsada: novaQtd })
        .where(eq(pacotesClientesItens.id, input.pacoteClienteItemId));

      // Verificar se o pacote inteiro foi concluído
      const todosItens = await db.select().from(pacotesClientesItens)
        .where(eq(pacotesClientesItens.pacoteClienteId, item.pacoteClienteId));
      const pacoteConcluido = todosItens.every(i =>
        (i.id === item.id ? novaQtd : i.quantidadeUsada) >= i.quantidadeTotal
      );

      if (pacoteConcluido) {
        await db.update(pacotesClientes)
          .set({ status: "concluido" })
          .where(eq(pacotesClientes.id, item.pacoteClienteId));

        // Buscar nome do pacote e cliente para notificação
        const [pacote] = await db.select({
          nome: pacotesClientes.nome,
          clienteId: pacotesClientes.clienteId,
        }).from(pacotesClientes).where(eq(pacotesClientes.id, item.pacoteClienteId)).limit(1);

        const [clienteRow] = await db.select({ nome: clientes.nome })
          .from(clientes).where(eq(clientes.id, pacote.clienteId)).limit(1);

        await notifyOwner({
          title: "Pacote concluído!",
          content: `O pacote "${pacote.nome}" de ${clienteRow?.nome ?? "cliente"} foi totalmente utilizado. Deseja renovar?`,
        });
      }

      return { ok: true, pacoteConcluido };
    }),

  // ── Relatório financeiro de pacotes ─────────────────────────────────────────
  relatorioFinanceiro: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);

      // KPIs gerais
      const todosOsPacotes = await db.select({
        id: pacotesClientes.id,
        status: pacotesClientes.status,
        valorPago: pacotesClientes.valorPago,
        dataAbertura: pacotesClientes.dataAbertura,
        dataVencimento: pacotesClientes.dataVencimento,
        clienteNome: clientes.nome,
        nome: pacotesClientes.nome,
      }).from(pacotesClientes)
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(eq(pacotesClientes.empresaId, empId))
        .orderBy(sql`${pacotesClientes.criadoEm} DESC`);

      const receitaTotal = todosOsPacotes.reduce((acc, p) => acc + parseFloat(p.valorPago ?? '0'), 0);
      const pacotesAtivos = todosOsPacotes.filter(p => p.status === 'ativo').length;
      const pacotesConcluidos = todosOsPacotes.filter(p => p.status === 'concluido').length;
      const pacotesCancelados = todosOsPacotes.filter(p => p.status === 'cancelado').length;

      // Pacotes vencendo em 7 dias
      const agora = new Date();
      const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pacotesVencendo = todosOsPacotes.filter(p => {
        if (p.status !== 'ativo' || !p.dataVencimento) return false;
        const venc = new Date(p.dataVencimento);
        return venc >= agora && venc <= em7Dias;
      });

      // Pacotes vencidos (status ativo mas data vencida)
      const pacotesVencidos = todosOsPacotes.filter(p => {
        if (p.status !== 'ativo' || !p.dataVencimento) return false;
        return new Date(p.dataVencimento) < agora;
      });

      // Receita por mês (últimos 6 meses)
      const receitaPorMes: Record<string, number> = {};
      todosOsPacotes.forEach(p => {
        if (!p.dataAbertura) return;
        const d = new Date(p.dataAbertura);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        receitaPorMes[chave] = (receitaPorMes[chave] ?? 0) + parseFloat(p.valorPago ?? '0');
      });

      // Sessões por serviço (consumidas vs total)
      const ids = todosOsPacotes.map(p => p.id);
      let sessoesPorServico: { servicoNome: string | null; total: number; usadas: number }[] = [];
      if (ids.length > 0) {
        const itensRows = await db.select({
          servicoNome: servicos.nome,
          quantidadeTotal: pacotesClientesItens.quantidadeTotal,
          quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        }).from(pacotesClientesItens)
          .leftJoin(servicos, eq(pacotesClientesItens.servicoId, servicos.id))
          .where(sql`${pacotesClientesItens.pacoteClienteId} IN (${ids.join(',')})`);

        const agrupado: Record<string, { total: number; usadas: number }> = {};
        itensRows.forEach(i => {
          const nome = i.servicoNome ?? 'Desconhecido';
          if (!agrupado[nome]) agrupado[nome] = { total: 0, usadas: 0 };
          agrupado[nome].total += i.quantidadeTotal;
          agrupado[nome].usadas += i.quantidadeUsada;
        });
        sessoesPorServico = Object.entries(agrupado).map(([servicoNome, v]) => ({ servicoNome, ...v }));
      }

      return {
        receitaTotal,
        pacotesAtivos,
        pacotesConcluidos,
        pacotesCancelados,
        totalPacotes: todosOsPacotes.length,
        pacotesVencendo,
        pacotesVencidos,
        receitaPorMes,
        sessoesPorServico,
      };
    }),

  // ── Cancelar pacote ───────────────────────────────────────────────────────
  cancelarPacote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await requirePermissaoPacotes(ctx, 'pacotesExcluir');
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      await db.update(pacotesClientes).set({ status: "cancelado" })
        .where(and(eq(pacotesClientes.id, input.id), eq(pacotesClientes.empresaId, empId)));
      return { ok: true };
    }),

  // ── Listar notificações ───────────────────────────────────────────────────
  listarNotificacoes: protectedProcedure
    .input(z.object({
      apenasNaoLidas: z.boolean().optional().default(false),
      limite: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const conditions = [eq(notificacoesPacotes.empresaId, empId)];
      if (input.apenasNaoLidas) {
        conditions.push(eq(notificacoesPacotes.lida, false));
      }
      const rows = await db.select({
        id: notificacoesPacotes.id,
        pacoteClienteId: notificacoesPacotes.pacoteClienteId,
        clienteId: notificacoesPacotes.clienteId,
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
        tipo: notificacoesPacotes.tipo,
        mensagem: notificacoesPacotes.mensagem,
        diasParaVencer: notificacoesPacotes.diasParaVencer,
        sessoesRestantes: notificacoesPacotes.sessoesRestantes,
        canal: notificacoesPacotes.canal,
        lida: notificacoesPacotes.lida,
        enviadoEm: notificacoesPacotes.enviadoEm,
      })
        .from(notificacoesPacotes)
        .leftJoin(clientes, eq(notificacoesPacotes.clienteId, clientes.id))
        .where(and(...conditions))
        .orderBy(sql`${notificacoesPacotes.enviadoEm} DESC`)
        .limit(input.limite);
      return rows;
    }),

  // ── Contar não lidas ──────────────────────────────────────────────────────
  contarNaoLidas: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0 };
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const [row] = await db.select({ total: sql<number>`COUNT(*)` })
        .from(notificacoesPacotes)
        .where(and(
          eq(notificacoesPacotes.empresaId, empId),
          eq(notificacoesPacotes.lida, false),
        ));
      return { total: Number(row?.total ?? 0) };
    }),

  // ── Marcar como lida ──────────────────────────────────────────────────────
  marcarLida: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      await db.update(notificacoesPacotes)
        .set({ lida: true })
        .where(and(
          eq(notificacoesPacotes.id, input.id),
          eq(notificacoesPacotes.empresaId, empId),
        ));
      return { ok: true };
    }),

  // ── Marcar todas como lidas ───────────────────────────────────────────────
  marcarTodasLidas: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      await db.update(notificacoesPacotes)
        .set({ lida: true })
        .where(and(
          eq(notificacoesPacotes.empresaId, empId),
          eq(notificacoesPacotes.lida, false),
        ));
      return { ok: true };
    }),

  // ── Ocultar notificação de pacote ──────────────────────────────────────────
  ocultarNotificacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      await db.delete(notificacoesPacotes)
        .where(and(
          eq(notificacoesPacotes.id, input.id),
          eq(notificacoesPacotes.empresaId, empId),
        ));
      return { ok: true };
    }),

  // ── Verificar e gerar notificações de pacotes vencendo ────────────────────
  verificarPacotesVencendo: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);

      const agora = new Date();
      const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
      const em3Dias = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Buscar pacotes ativos com vencimento próximo (até 7 dias)
      const pacotesVencendo = await db.select({
        id: pacotesClientes.id,
        clienteId: pacotesClientes.clienteId,
        dataVencimento: pacotesClientes.dataVencimento,
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
      })
        .from(pacotesClientes)
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          eq(pacotesClientes.status, "ativo"),
          lte(pacotesClientes.dataVencimento, em7Dias),
          gt(pacotesClientes.dataVencimento, agora),
        ));

      let criadas = 0;

      for (const pacote of pacotesVencendo) {
        if (!pacote.dataVencimento) continue;
        const venc = new Date(pacote.dataVencimento);
        const diffMs = venc.getTime() - agora.getTime();
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Verificar se já existe notificação recente (últimas 24h) para este pacote
        const [existente] = await db.select({ id: notificacoesPacotes.id })
          .from(notificacoesPacotes)
          .where(and(
            eq(notificacoesPacotes.pacoteClienteId, pacote.id),
            eq(notificacoesPacotes.tipo, "vencimento_proximo"),
            sql`${notificacoesPacotes.enviadoEm} > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
          ))
          .limit(1);

        if (existente) continue; // Já notificado recentemente

        // Buscar sessões restantes do pacote
        const itens = await db.select({
          quantidadeTotal: pacotesClientesItens.quantidadeTotal,
          quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        })
          .from(pacotesClientesItens)
          .where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));

        const totalSessoes = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
        const sessoesUsadas = itens.reduce((s, i) => s + i.quantidadeUsada, 0);
        const sessoesRestantes = totalSessoes - sessoesUsadas;

        if (sessoesRestantes <= 0) continue; // Sem sessões para usar, não notificar

        const urgencia = diasRestantes <= 3 ? "URGENTE" : "";
        const mensagem = `${urgencia ? urgencia + " - " : ""}Pacote de ${pacote.clienteNome ?? "cliente"} vence em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}. ${sessoesRestantes} sessão(ões) ainda disponível(is).`;

        await db.insert(notificacoesPacotes).values({
          empresaId: empId,
          pacoteClienteId: pacote.id,
          clienteId: pacote.clienteId,
          tipo: "vencimento_proximo",
          mensagem,
          diasParaVencer: diasRestantes,
          sessoesRestantes,
          canal: "sistema",
          lida: false,
        });
        criadas++;
      }

      // Verificar pacotes com poucas sessões restantes (1 ou 2 sessões)
      const pacotesAtivos = await db.select({
        id: pacotesClientes.id,
        clienteId: pacotesClientes.clienteId,
        clienteNome: clientes.nome,
      })
        .from(pacotesClientes)
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          eq(pacotesClientes.status, "ativo"),
        ));

      for (const pacote of pacotesAtivos) {
        const itens = await db.select({
          quantidadeTotal: pacotesClientesItens.quantidadeTotal,
          quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        })
          .from(pacotesClientesItens)
          .where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));

        const totalSessoes = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
        const sessoesUsadas = itens.reduce((s, i) => s + i.quantidadeUsada, 0);
        const sessoesRestantes = totalSessoes - sessoesUsadas;

        if (sessoesRestantes > 2 || sessoesRestantes <= 0) continue;

        // Verificar se já existe notificação de sessões restantes recente
        const [existente] = await db.select({ id: notificacoesPacotes.id })
          .from(notificacoesPacotes)
          .where(and(
            eq(notificacoesPacotes.pacoteClienteId, pacote.id),
            eq(notificacoesPacotes.tipo, "sessoes_restantes"),
            sql`${notificacoesPacotes.enviadoEm} > DATE_SUB(NOW(), INTERVAL 48 HOUR)`,
          ))
          .limit(1);

        if (existente) continue;

        const mensagem = `Atenção: ${pacote.clienteNome ?? "Cliente"} tem apenas ${sessoesRestantes} sessão(ões) restante(s) no pacote. Considere renovar.`;

        await db.insert(notificacoesPacotes).values({
          empresaId: empId,
          pacoteClienteId: pacote.id,
          clienteId: pacote.clienteId,
          tipo: "sessoes_restantes",
          mensagem,
          diasParaVencer: null,
          sessoesRestantes,
          canal: "sistema",
          lida: false,
        });
        criadas++;
      }

      return { criadas, verificados: pacotesVencendo.length + pacotesAtivos.length };
    }),

  // ── Histórico de sessões de um pacote (agendamentos que consumiram sessões) ──
  historicoSessoes: protectedProcedure
    .input(z.object({ pacoteClienteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);

      // Verificar que o pacote pertence à empresa
      const [pacote] = await db.select({ id: pacotesClientes.id })
        .from(pacotesClientes)
        .where(and(
          eq(pacotesClientes.id, input.pacoteClienteId),
          eq(pacotesClientes.empresaId, empId),
        ))
        .limit(1);
      if (!pacote) return [];

      // Buscar itens do pacote
      const itens = await db.select({ id: pacotesClientesItens.id })
        .from(pacotesClientesItens)
        .where(eq(pacotesClientesItens.pacoteClienteId, input.pacoteClienteId));

      if (!itens.length) return [];
      const itemIds = itens.map(i => i.id);

      // Buscar agendamento_itens vinculados a esses itens de pacote
      const agendItens = await db.select({
        agendamentoItemId: agendamentoItens.id,
        agendamentoId: agendamentoItens.agendamentoId,
        pacoteClienteItemId: agendamentoItens.pacoteClienteItemId,
        servicoId: agendamentoItens.servicoId,
        valorUnitario: agendamentoItens.valorUnitario,
        servicoNome: servicos.nome,
      }).from(agendamentoItens)
        .leftJoin(servicos, eq(agendamentoItens.servicoId, servicos.id))
        .where(sql`${agendamentoItens.pacoteClienteItemId} IN (${itemIds.join(",")})`);

      if (!agendItens.length) return [];
      const agendIds = Array.from(new Set(agendItens.map(i => i.agendamentoId)));

      // Buscar dados dos agendamentos
      const agends = await db.select({
        id: agendamentos.id,
        data: agendamentos.data,
        horaInicio: agendamentos.horaInicio,
        status: agendamentos.status,
        profissionalNome: profissionais.nome,
      }).from(agendamentos)
        .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
        .where(sql`${agendamentos.id} IN (${agendIds.join(",")})`);

      // Montar resultado
      return agendItens.map(ai => {
        const ag = agends.find(a => a.id === ai.agendamentoId);
        return {
          agendamentoId: ai.agendamentoId,
          pacoteClienteItemId: ai.pacoteClienteItemId,
          servicoNome: ai.servicoNome,
          valorUnitario: ai.valorUnitario,
          data: ag?.data ?? null,
          horaInicio: ag?.horaInicio ?? null,
          status: ag?.status ?? null,
          profissionalNome: ag?.profissionalNome ?? null,
        };
      }).sort((a, b) => {
        if (!a.data || !b.data) return 0;
        return new Date(b.data).getTime() - new Date(a.data).getTime();
      });
    }),

  // ── Renovar pacote (reabrir concluído/vencido com novo valor e vencimento) ─
  renovarPacote: protectedProcedure
    .input(z.object({
      pacoteClienteId: z.number(),
      valorPago: z.number().min(0),
      formaPagamento: z.string().optional(),
      numeroParcelas: z.number().min(1).max(24).optional().default(1),
      validadeDias: z.number().optional(), // null = sem vencimento
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);

      // Verificar que o pacote pertence à empresa e está concluído ou vencido
      const [pacote] = await db.select({
        id: pacotesClientes.id,
        nome: pacotesClientes.nome,
        clienteId: pacotesClientes.clienteId,
        status: pacotesClientes.status,
      }).from(pacotesClientes)
        .where(and(
          eq(pacotesClientes.id, input.pacoteClienteId),
          eq(pacotesClientes.empresaId, empId),
        ))
        .limit(1);

      if (!pacote) throw new Error("Pacote não encontrado");
      if (pacote.status === "ativo") throw new Error("Pacote já está ativo");
      if (pacote.status === "cancelado") throw new Error("Pacote cancelado não pode ser renovado");

      // Calcular novo vencimento
      const novoVencimento = input.validadeDias
        ? new Date(Date.now() + input.validadeDias * 24 * 60 * 60 * 1000)
        : null;

      // Calcular valor por parcela
      const numeroParcelas = input.numeroParcelas ?? 1;
      const valorParcela = numeroParcelas > 1 ? input.valorPago / numeroParcelas : null;

      // Resetar sessões dos itens do pacote
      await db.update(pacotesClientesItens)
        .set({ quantidadeUsada: 0 })
        .where(eq(pacotesClientesItens.pacoteClienteId, input.pacoteClienteId));

      // Atualizar o pacote para ativo com novo valor e vencimento
      await db.update(pacotesClientes).set({
        status: "ativo",
        valorPago: String(input.valorPago),
        formaPagamento: input.formaPagamento,
        numeroParcelas,
        valorParcela: valorParcela !== null ? String(valorParcela) : undefined,
        dataAbertura: new Date(),
        dataVencimento: novoVencimento,
        observacoes: input.observacoes,
      }).where(and(
        eq(pacotesClientes.id, input.pacoteClienteId),
        eq(pacotesClientes.empresaId, empId),
      ));

       // Buscar dados do cliente para notificações
      const [clienteRow] = await db.select({
        id: clientes.id,
        nome: clientes.nome,
        telefone: clientes.telefone,
        whatsapp: clientes.whatsapp,
      }).from(clientes).where(eq(clientes.id, pacote.clienteId)).limit(1);

      // Notificar o admin
      await notifyOwner({
        title: "Pacote renovado!",
        content: `O pacote "${pacote.nome}" de ${clienteRow?.nome ?? "cliente"} foi renovado com sucesso. Valor: R$ ${input.valorPago.toFixed(2)}.`,
      });

      // Disparar automação de evento 'pacote_renovado' se configurada
      try {
        const automacao = await getAutomacaoByEvento(empId, 'pacote_renovado');
        if (automacao && automacao.canalEnvio === 'whatsapp') {
          const telefoneCliente = clienteRow?.whatsapp || clienteRow?.telefone;
          if (telefoneCliente) {
            const vencimentoStr = novoVencimento
              ? novoVencimento.toLocaleDateString('pt-BR')
              : 'sem vencimento';
            const parcelasStr = numeroParcelas > 1
              ? `${numeroParcelas}x de R$ ${(input.valorPago / numeroParcelas).toFixed(2).replace('.', ',')}`
              : `R$ ${input.valorPago.toFixed(2).replace('.', ',')}`;
            const mensagem = automacao.corpoMensagem
              .replace(/\{\{nome_cliente\}\}/g, clienteRow?.nome ?? '')
              .replace(/\{\{primeiro_nome\}\}/g, (clienteRow?.nome ?? '').split(' ')[0])
              .replace(/\{\{nome_pacote\}\}/g, pacote.nome)
              .replace(/\{\{data_vencimento\}\}/g, vencimentoStr)
              .replace(/\{\{valor_pago\}\}/g, `R$ ${input.valorPago.toFixed(2).replace('.', ',')}`)
              .replace(/\{\{parcelas\}\}/g, parcelasStr);
            // Extrair midiaUrl do flowJson
            let midiaUrl: string | null = null;
            if (automacao.flowJson) {
              try {
                const flow = JSON.parse(automacao.flowJson);
                if (Array.isArray(flow)) {
                  for (const node of flow) {
                    if (node?.data?.midiaUrl) { midiaUrl = node.data.midiaUrl; break; }
                  }
                } else if (flow?.midiaUrl) {
                  midiaUrl = flow.midiaUrl;
                }
              } catch { /* ignorar erro de parse */ }
            }
            // Enfileirar na fila universal em vez de enviar diretamente
            await registrarEnvioAutomacao({
              empresaId: empId,
              automacaoId: automacao.id,
              automacaoNome: automacao.nome,
              clienteId: clienteRow?.id,
              clienteNome: clienteRow?.nome ?? undefined,
              telefone: telefoneCliente,
              canal: 'whatsapp',
              mensagem,
              status: 'pendente',
              enviarEm: new Date(),
              midiaUrl: midiaUrl ?? undefined,
            });
          }
        }
      } catch (e) {
        // Não falhar a renovação por erro de WhatsApp
        console.error('[renovarPacote] Erro ao disparar automação WhatsApp:', e);
      }

      return { ok: true };
    }),

  // ─── EDITAR PACOTE DO CLIENTE ─────────────────────────────────────────────────
  editarPacote: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      valorPago: z.number().min(0).optional(),
      formaPagamento: z.string().optional(),
      numeroParcelas: z.number().min(1).max(24).optional(),
      dataVencimento: z.string().nullable().optional(),
      observacoes: z.string().optional(),
      automacaoRenovacao: z.boolean().optional(),
      dataValidade: z.string().nullable().optional(),
      itens: z.array(z.object({
        servicoId: z.number(),
        quantidade: z.number().min(1),
        sessoesUsadas: z.number().min(0).optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requirePermissaoPacotes(ctx, 'pacotesEditar');
      const empId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // Verificar que o pacote pertence à empresa
      const [pacote] = await db.select().from(pacotesClientes)
        .where(and(eq(pacotesClientes.id, input.id), eq(pacotesClientes.empresaId, empId)))
        .limit(1);
      if (!pacote) throw new Error("Pacote não encontrado");

      // Montar campos a atualizar
      const updates: Partial<typeof pacotesClientes.$inferInsert> = {};
      if (input.nome !== undefined) updates.nome = input.nome;
      if (input.valorPago !== undefined) updates.valorPago = String(input.valorPago);
      if (input.formaPagamento !== undefined) updates.formaPagamento = input.formaPagamento;
      if (input.numeroParcelas !== undefined) {
        updates.numeroParcelas = input.numeroParcelas;
        updates.valorParcela = input.valorPago !== undefined && input.numeroParcelas > 0
          ? String((input.valorPago / input.numeroParcelas).toFixed(2))
          : pacote.valorParcela;
      }
      if (input.dataVencimento !== undefined) {
        updates.dataVencimento = input.dataVencimento ? new Date(input.dataVencimento) : null;
      }
      if (input.observacoes !== undefined) updates.observacoes = input.observacoes;
      if (input.automacaoRenovacao !== undefined) updates.automacaoRenovacao = input.automacaoRenovacao;
      if (input.dataValidade !== undefined) {
        updates.dataValidade = input.dataValidade ? new Date(input.dataValidade) : null;
      }

      if (Object.keys(updates).length > 0) {
        await db.update(pacotesClientes).set(updates).where(eq(pacotesClientes.id, input.id));
      }

      // Atualizar itens se fornecidos
      if (input.itens && input.itens.length > 0) {
        // Buscar itens existentes para preservar sessoesUsadas
        const existentes = await db.select().from(pacotesClientesItens)
          .where(eq(pacotesClientesItens.pacoteClienteId, input.id));
        await db.delete(pacotesClientesItens).where(eq(pacotesClientesItens.pacoteClienteId, input.id));
        await db.insert(pacotesClientesItens).values(
          input.itens.map(item => {
            const existente = existentes.find(e => e.servicoId === item.servicoId);
            return {
              pacoteClienteId: input.id,
              servicoId: item.servicoId,
              quantidadeTotal: item.quantidade,
              quantidadeUsada: item.sessoesUsadas ?? existente?.quantidadeUsada ?? 0,
            };
          })
        );
      }

      return { ok: true };
    }),

});
