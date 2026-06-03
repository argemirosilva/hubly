import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  gerarUrlAutorizacaoGoogleUsuario,
  getStatusConexaoGoogleUsuario,
  desconectarGoogleUsuario,
  renomearCalendarioHublyUsuario,
} from "../google-calendar-usuario";
import { getDb } from "../db";
import { googleCalendarTokensUsuario } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const googleCalendarUsuarioRouter = router({
  /**
   * Retorna o status da conexão do usuário logado com o Google Calendar
   */
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.systemUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      }
      return getStatusConexaoGoogleUsuario(ctx.systemUser.id);
    }),

  /**
   * Gera a URL de autorização OAuth2 do Google para o usuário
   * Aceita um nome personalizado para a agenda
   */
  gerarUrlAutorizacao: protectedProcedure
    .input(z.object({ nomeCalendario: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.systemUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      }
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Integração com Google Calendar não configurada. Entre em contato com o suporte.",
        });
      }
      const state = Buffer.from(
        JSON.stringify({
          userId: ctx.systemUser.id,
          empresaId: ctx.systemUser.empresaId,
          nomeCalendario: input.nomeCalendario,
        })
      ).toString("base64");
      const url = gerarUrlAutorizacaoGoogleUsuario(state);
      return { url };
    }),

  /**
   * Desconecta o Google Calendar do usuário
   */
  desconectar: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.systemUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      }
      await desconectarGoogleUsuario(ctx.systemUser.id);
      return { success: true };
    }),

  /**
   * Renomeia a agenda Hubly do usuário no Google Calendar
   */
  renomearAgenda: protectedProcedure
    .input(z.object({ novoNome: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.systemUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      }
      await renomearCalendarioHublyUsuario(ctx.systemUser.id, input.novoNome);
      return { success: true };
    }),

  /**
   * Configura a cor dos eventos sincronizados no Google Calendar.
   * Aceita uma cor hex (ex: "#8B4513") ou null para usar a cor padrão por status.
   */
  configurarCor: protectedProcedure
    .input(z.object({
      cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.systemUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const rows = await db.select({ id: googleCalendarTokensUsuario.id })
        .from(googleCalendarTokensUsuario)
        .where(eq(googleCalendarTokensUsuario.userId, ctx.systemUser.id))
        .limit(1);

      if (!rows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Google Calendar não conectado" });
      }

      await db.update(googleCalendarTokensUsuario)
        .set({ corEvento: input.cor, updatedAt: new Date() })
        .where(eq(googleCalendarTokensUsuario.userId, ctx.systemUser.id));

      return { success: true };
    }),
});
