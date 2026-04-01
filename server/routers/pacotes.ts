/**
 * Router de Pacotes de Serviços
 * Gerencia modelos de pacotes e pacotes por cliente.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { getEmpresaDoUsuario } from "../db";
import {
  pacotesModelos, pacotesModelosItens,
  pacotesClientes, pacotesClientesItens,
  servicos, clientes,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

async function getEmpresaId(userId: number): Promise<number> {
  const empresa = await getEmpresaDoUsuario(userId);
  if (!empresa) throw new Error("Empresa não encontrada");
  return empresa.id;
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
      const empId = await getEmpresaId(ctx.user.id);
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
      const empId = await getEmpresaId(ctx.user.id);
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
      const empId = await getEmpresaId(ctx.user.id);
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
      const empId = await getEmpresaId(ctx.user.id);
      await db.update(pacotesModelos).set({ ativo: false })
        .where(and(eq(pacotesModelos.id, input.id), eq(pacotesModelos.empresaId, empId)));
      return { ok: true };
    }),

  // ─── PACOTES DE CLIENTES ──────────────────────────────────────────────────

  // ── Listar todos os pacotes (admin) ───────────────────────────────────────
  listarTodos: protectedProcedure
    .input(z.object({
      status: z.enum(["ativo", "concluido", "vencido", "cancelado", "todos"]).default("ativo"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const empId = await getEmpresaId(ctx.user.id);
      const rows = await db.select({
        id: pacotesClientes.id,
        nome: pacotesClientes.nome,
        status: pacotesClientes.status,
        valorPago: pacotesClientes.valorPago,
        formaPagamento: pacotesClientes.formaPagamento,
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
      const empId = await getEmpresaId(ctx.user.id);
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

  // ── Abrir pacote para cliente ─────────────────────────────────────────────
  abrirPacote: protectedProcedure
    .input(z.object({
      clienteId: z.number(),
      modeloId: z.number().optional(),
      nome: z.string().min(2),
      valorPago: z.number().min(0),
      formaPagamento: z.string().optional(),
      validadeDias: z.number().optional(),
      observacoes: z.string().optional(),
      itens: z.array(z.object({
        servicoId: z.number(),
        quantidadeTotal: z.number().min(1),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      let dataVencimento: Date | undefined;
      if (input.validadeDias) {
        dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + input.validadeDias);
      }

      const empId = await getEmpresaId(ctx.user.id);
      const [result] = await db.insert(pacotesClientes).values({
        empresaId: empId,
        clienteId: input.clienteId,
        modeloId: input.modeloId,
        nome: input.nome,
        valorPago: String(input.valorPago),
        formaPagamento: input.formaPagamento,
        dataVencimento,
        observacoes: input.observacoes,
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

  // ── Cancelar pacote ───────────────────────────────────────────────────────
  cancelarPacote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const empId = await getEmpresaId(ctx.user.id);
      await db.update(pacotesClientes).set({ status: "cancelado" })
        .where(and(eq(pacotesClientes.id, input.id), eq(pacotesClientes.empresaId, empId)));
      return { ok: true };
    }),
});
