import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
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

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook DEVE ser registrado antes do express.json() para verificação de assinatura
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

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
