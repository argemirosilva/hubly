import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { syncIntegrationClients } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { gerarCredencialSync } from "../sync-auth";
import { TRPCError } from "@trpc/server";

function requireAdmin(ctx: { user: { role?: string } | null; systemUser?: { isOwner?: boolean; isAdmin?: boolean } | null }) {
  if (ctx.user?.role === "admin" || ctx.systemUser?.isOwner || ctx.systemUser?.isAdmin) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerir integrações." });
}

export const sincronizacaoRouter = router({
  listarClientes: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) return [];
    return db.select({ id: syncIntegrationClients.id, clientId: syncIntegrationClients.clientId, nome: syncIntegrationClients.nome, escopo: syncIntegrationClients.escopo, ativo: syncIntegrationClients.ativo, ultimoUsoEm: syncIntegrationClients.ultimoUsoEm, createdAt: syncIntegrationClients.createdAt }).from(syncIntegrationClients);
  }),
  criarCredencial: protectedProcedure.input(z.object({ nome: z.string().min(3).max(255) })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new Error("Banco indisponível");
    const credential = gerarCredencialSync();
    await db.insert(syncIntegrationClients).values({ clientId: credential.clientId, nome: input.nome, secretHash: credential.secretHash, escopo: "sync.read.all", ativo: true, criadoPorUserId: ctx.user!.id });
    return { clientId: credential.clientId, accessToken: `${credential.clientId}.${credential.secret}`, escopo: "sync.read.all" };
  }),
  revogarCredencial: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new Error("Banco indisponível");
    await db.update(syncIntegrationClients).set({ ativo: false }).where(eq(syncIntegrationClients.id, input.id));
    return { ok: true };
  }),
});
