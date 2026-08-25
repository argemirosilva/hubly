import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerSystemAuthRoutes } from "./system-auth";
import { registerOrizonAuthRoutes } from "./orizon-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initScheduler } from "../scheduler";
import { provisionarNovosTemplatesParaEmpresasExistentes } from "../automation-templates";
import { registerStripeWebhook } from "../stripe-webhook";
import { waManager } from "../whatsapp";
import { registerConfirmacaoRoute } from "../confirmacao";
import { registerZapiWebhook } from "../zapi-webhook";
import { trialReminderHandler } from "../trial-reminder";
import { registerGoogleOAuthCallback } from "../google-oauth-callback";
import { registerGoogleOAuthUserCallback } from "../google-oauth-user-callback";
import { registerSyncIntegrationRoutes } from "../sync-api";
import { registerSyncInboundRoutes } from "../sync-inbound-api";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook DEVE ser registrado antes do express.json() para verificação de assinatura
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({
    limit: "50mb",
    verify: (req, _res, buffer) => {
      if ((req.url ?? "").startsWith("/api/integrations/v1/sync/")) {
        (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      }
    },
  }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy para assets privados
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // System user auth (email/senha)
  registerSystemAuthRoutes(app);
  // Painel Orizontech — autenticação independente
  registerOrizonAuthRoutes(app);
  // Confirmação pública de agendamento via token
  registerConfirmacaoRoute(app);
  // Webhook Z-API — status de entrega/leitura de mensagens
  registerZapiWebhook(app);
  // Google Calendar OAuth2 callback (por empresa)
  registerGoogleOAuthCallback(app);
  // Google Calendar OAuth2 callback (por usuário/profissional)
  registerGoogleOAuthUserCallback(app);
  // Cron: lembrete diário de trial para donos sem cartão cadastrado
  app.post("/api/scheduled/trial-reminder", trialReminderHandler);
  // API privada de sincronização em lote para o módulo remoto próprio
  registerSyncIntegrationRoutes(app);
  // API reversa: recebe ideias de marketing autenticadas de sistemas externos
  registerSyncInboundRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3010", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválida: ${process.env.PORT ?? "não configurada"}`);
  }

  server.on("error", error => {
    console.error(`Não foi possível iniciar o Hubly na porta fixa ${port}.`, error);
    process.exitCode = 1;
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    initScheduler();
    // Provisionar novos tipos de automação (reserva_paga, credito_gerado) para empresas existentes
    setTimeout(() => provisionarNovosTemplatesParaEmpresasExistentes().catch(e => console.error('[Templates] Erro:', e)), 10_000);
    // Reconectar WhatsApp automaticamente se houver sessão salva no banco
    waManager.init().catch(err => console.error('[WhatsApp] Erro na inicialização:', err));
  });
}

startServer().catch(console.error);
