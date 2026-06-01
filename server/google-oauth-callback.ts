/**
 * Rota de callback OAuth2 do Google Calendar
 * Registrada em: GET /api/google/callback
 * 
 * Após o usuário autorizar no Google, o Google redireciona para esta rota
 * com um `code` e o `state` (que contém empresaId e userId codificados).
 */

import type { Express } from "express";
import { trocarCodePorTokens, salvarTokensGoogle, garantirCalendarioHubly } from "./google-calendar";
import { getDb } from "./db";
import { empresas } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export function registerGoogleOAuthCallback(app: Express) {
  app.get("/api/google/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;

    const appUrl = process.env.APP_PUBLIC_URL ?? "https://hubly.orizontech.com.br";
    const redirectBase = `${appUrl}/admin/configuracoes`;

    if (error) {
      console.error("[GoogleOAuth] Erro na autorização:", error);
      return res.redirect(`${redirectBase}?google_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${redirectBase}?google_error=missing_params`);
    }

    try {
      // Decodificar state
      const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8")) as {
        empresaId: number;
        userId: number;
      };

      // Trocar code por tokens
      const tokens = await trocarCodePorTokens(code);

      if (!tokens.access_token) {
        return res.redirect(`${redirectBase}?google_error=no_access_token`);
      }

      // Buscar email da conta Google (via userinfo)
      let email: string | undefined;
      try {
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userinfoRes.ok) {
          const userinfo = await userinfoRes.json() as { email?: string };
          email = userinfo.email;
        }
      } catch {}

      // Salvar tokens no banco
      await salvarTokensGoogle({
        empresaId: stateData.empresaId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        email,
      });

      // Criar calendário dedicado Hubly
      try {
        const db = await getDb();
        const empresaRows = db ? await db.select().from(empresas).where(eq(empresas.id, stateData.empresaId)).limit(1) : [];
        const empresa = empresaRows[0];
        if (empresa) {
          await garantirCalendarioHubly(stateData.empresaId, empresa.nome);
        }
      } catch (calErr) {
        console.error("[GoogleOAuth] Erro ao criar calendário Hubly:", calErr);
        // Não bloquear o fluxo — calendário pode ser criado depois
      }

      console.log(`[GoogleOAuth] Google Calendar conectado para empresa ${stateData.empresaId} (${email})`);
      return res.redirect(`${redirectBase}?google_success=1`);

    } catch (err: any) {
      console.error("[GoogleOAuth] Erro no callback:", err?.message ?? err);
      return res.redirect(`${redirectBase}?google_error=${encodeURIComponent(err?.message ?? "unknown")}`);
    }
  });
}
