import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  gerarUrlAutorizacaoGoogleUsuario,
  getStatusConexaoGoogleUsuario,
  desconectarGoogleUsuario,
} from "../google-calendar-usuario";

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
   */
  gerarUrlAutorizacao: protectedProcedure
    .mutation(async ({ ctx }) => {
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
        JSON.stringify({ userId: ctx.systemUser.id, empresaId: ctx.systemUser.empresaId })
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
});
