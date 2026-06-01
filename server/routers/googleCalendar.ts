import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getEmpresaDoContexto } from "../db";
import {
  gerarUrlAutorizacaoGoogle,
  getStatusConexaoGoogle,
  desconectarGoogle,
  garantirCalendarioHubly,
} from "../google-calendar";

export const googleCalendarRouter = router({

  /**
   * Retorna o status da conexão com o Google Calendar
   */
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      return getStatusConexaoGoogle(empresa.id);
    }),

  /**
   * Gera a URL de autorização OAuth2 do Google
   */
  gerarUrlAutorizacao: protectedProcedure
    .mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      // Verificar se as credenciais Google estão configuradas
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Integração com Google Calendar não configurada. Entre em contato com o suporte.",
        });
      }

      // State codifica o empresaId para validação no callback
      const state = Buffer.from(JSON.stringify({ empresaId: empresa.id, userId: ctx.user.id })).toString("base64");
      const url = gerarUrlAutorizacaoGoogle(state);

      return { url };
    }),

  /**
   * Desconecta o Google Calendar
   */
  desconectar: protectedProcedure
    .mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      await desconectarGoogle(empresa.id);
      return { success: true };
    }),

  /**
   * Cria/garante o calendário dedicado Hubly na conta Google
   */
  configurarCalendario: protectedProcedure
    .mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const calendarId = await garantirCalendarioHubly(empresa.id, empresa.nome);
      return { calendarId };
    }),
});
