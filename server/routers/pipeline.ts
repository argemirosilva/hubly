import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getEmpresaDoUsuario,
  getPipelinesByEmpresa,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getColunasByPipeline,
  createColuna,
  updateColuna,
  deleteColuna,
  getCartoesByPipeline,
  createCartao,
  updateCartao,
  deleteCartao,
} from "../db";

async function getEmpresaId(userId: number) {
  const empresa = await getEmpresaDoUsuario(userId);
  if (!empresa) throw new Error("Empresa não encontrada");
  return empresa.id;
}

export const pipelineRouter = router({
  // ── Pipelines ─────────────────────────────────────────────────────────────
  listar: protectedProcedure.query(async ({ ctx }) => {
    const empresaId = await getEmpresaId(ctx.user.id);
    const pipelinesData = await getPipelinesByEmpresa(empresaId);
    // Para cada pipeline, buscar colunas e cartões
    const result = await Promise.all(
      pipelinesData.map(async (p) => {
        const colunas = await getColunasByPipeline(p.id);
        const cartoes = await getCartoesByPipeline(p.id);
        const colunasComCartoes = colunas
          .sort((a, b) => a.ordem - b.ordem)
          .map((c) => ({
            ...c,
            cartoes: cartoes
              .filter((k) => k.colunaId === c.id)
              .sort((a, b) => a.ordem - b.ordem),
          }));
        return { ...p, colunas: colunasComCartoes };
      })
    );
    return result.sort((a, b) => a.ordem - b.ordem);
  }),

  criar: protectedProcedure
    .input(z.object({ nome: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = await getEmpresaId(ctx.user.id);
      const pipelines = await getPipelinesByEmpresa(empresaId);
      const result = await createPipeline({ empresaId, nome: input.nome, ordem: pipelines.length });
      // Criar colunas padrão
      const colunasPadrao = [
        { nome: "Novo", cor: "#6366f1" },
        { nome: "Em andamento", cor: "#f59e0b" },
        { nome: "Concluído", cor: "#10b981" },
      ];
      for (let i = 0; i < colunasPadrao.length; i++) {
        await createColuna({ pipelineId: result.id, empresaId, nome: colunasPadrao[i].nome, cor: colunasPadrao[i].cor, ordem: i });
      }
      return result;
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number(), nome: z.string().min(1).max(120) }))
    .mutation(async ({ input }) => {
      await updatePipeline(input.id, { nome: input.nome });
      return { success: true };
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePipeline(input.id);
      return { success: true };
    }),

  // ── Colunas ───────────────────────────────────────────────────────────────
  criarColuna: protectedProcedure
    .input(z.object({
      pipelineId: z.number(),
      nome: z.string().min(1).max(120),
      cor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = await getEmpresaId(ctx.user.id);
      const colunas = await getColunasByPipeline(input.pipelineId);
      return createColuna({
        pipelineId: input.pipelineId,
        empresaId,
        nome: input.nome,
        cor: input.cor ?? "#6366f1",
        ordem: colunas.length,
      });
    }),

  atualizarColuna: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).max(120).optional(),
      cor: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateColuna(id, data);
      return { success: true };
    }),

  excluirColuna: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteColuna(input.id);
      return { success: true };
    }),

  // ── Cartões ───────────────────────────────────────────────────────────────
  criarCartao: protectedProcedure
    .input(z.object({
      colunaId: z.number(),
      pipelineId: z.number(),
      titulo: z.string().min(1).max(255),
      descricao: z.string().optional(),
      status: z.enum(["em_andamento", "congelado", "cancelado", "concluido"]).optional(),
      clienteId: z.number().optional(),
      clienteNome: z.string().optional(),
      responsavelId: z.number().optional(),
      responsavelNome: z.string().optional(),
      lembrete: z.string().optional(),
      valor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = await getEmpresaId(ctx.user.id);
      const cartoes = await getCartoesByPipeline(input.pipelineId);
      const cartoesColuna = cartoes.filter((c) => c.colunaId === input.colunaId);
      return createCartao({
        ...input,
        empresaId,
        status: input.status ?? "em_andamento",
        ordem: cartoesColuna.length,
      });
    }),

  atualizarCartao: protectedProcedure
    .input(z.object({
      id: z.number(),
      colunaId: z.number().optional(),
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().nullable().optional(),
      status: z.enum(["em_andamento", "congelado", "cancelado", "concluido"]).optional(),
      clienteId: z.number().nullable().optional(),
      clienteNome: z.string().nullable().optional(),
      responsavelId: z.number().nullable().optional(),
      responsavelNome: z.string().nullable().optional(),
      lembrete: z.string().nullable().optional(),
      valor: z.string().nullable().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCartao(id, data as Parameters<typeof updateCartao>[1]);
      return { success: true };
    }),

  excluirCartao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCartao(input.id);
      return { success: true };
    }),
});
