/**
 * Rota de callback OAuth2 do Google Calendar — por Usuário
 * Registrada em: GET /api/google/user-callback
 */
import type { Express } from "express";
import {
  trocarCodePorTokensUsuario,
  salvarTokensGoogleUsuario,
  garantirCalendarioHublyUsuario,
} from "./google-calendar-usuario";
import { getDb } from "./db";
import { profissionais, empresas } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export function registerGoogleOAuthUserCallback(app: Express) {
  app.get("/api/google/user-callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    const appUrl = process.env.APP_PUBLIC_URL ?? "https://hubly.orizontech.com.br";
    const redirectBase = `${appUrl}/admin/perfil`;

    if (error) {
      console.error("[GoogleOAuthUser] Erro na autorização:", error);
      return res.redirect(`${redirectBase}?google_user_error=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect(`${redirectBase}?google_user_error=missing_params`);
    }

    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8")) as {
        userId: number;
        empresaId: number;
        nomeCalendario?: string;
      };

      const tokens = await trocarCodePorTokensUsuario(code);
      if (!tokens.access_token) {
        return res.redirect(`${redirectBase}?google_user_error=no_access_token`);
      }

      // Buscar email da conta Google
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

      // Salvar tokens (reseta calendarId para recriar com nome correto)
      await salvarTokensGoogleUsuario({
        userId: stateData.userId,
        empresaId: stateData.empresaId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        email,
      });

      // Criar calendário dedicado Hubly com nome personalizado
      try {
        const db = await getDb();

        // Determinar o nome do calendário
        let nomeCalendario = stateData.nomeCalendario;
        if (!nomeCalendario) {
          // Fallback: buscar nome do profissional + empresa
          const profRows = db
            ? await db.select({ nome: profissionais.nome })
                .from(profissionais)
                .where(eq(profissionais.id, stateData.userId))
                .limit(1)
            : [];
          const empresaRows = db
            ? await db.select({ nome: empresas.nome })
                .from(empresas)
                .where(eq(empresas.id, stateData.empresaId))
                .limit(1)
            : [];
          const nomeProfissional = profRows[0]?.nome ?? "Profissional";
          const nomeEmpresa = empresaRows[0]?.nome ?? "";
          nomeCalendario = nomeEmpresa
            ? `Hubly — ${nomeProfissional} (${nomeEmpresa})`
            : `Hubly — ${nomeProfissional}`;
        }

        await garantirCalendarioHublyUsuario(stateData.userId, nomeCalendario);
      } catch (calErr) {
        console.error("[GoogleOAuthUser] Erro ao criar calendário Hubly:", calErr);
        // Não bloquear o fluxo — a conexão foi feita, o calendário pode ser criado depois
      }

      console.log(`[GoogleOAuthUser] Google Calendar conectado para userId=${stateData.userId} (${email})`);
      return res.redirect(`${redirectBase}?google_user_success=1`);
    } catch (err: any) {
      console.error("[GoogleOAuthUser] Erro no callback:", err?.message ?? err);
      return res.redirect(`${redirectBase}?google_user_error=${encodeURIComponent(err?.message ?? "unknown")}`);
    }
  });
}
