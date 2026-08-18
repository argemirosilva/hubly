import { describe, expect, it } from "vitest";
import { registerSyncIntegrationRoutes } from "./sync-api";

describe("API privada de sincronização", () => {
  it("expõe o registrador das rotas de integração", () => {
    expect(typeof registerSyncIntegrationRoutes).toBe("function");
  });

  it("registra saúde, catálogo, bootstrap, leitura individual e mudanças", () => {
    const routes: string[] = [];
    const app = {
      get: (path: string) => { routes.push(`GET ${path}`); },
      post: (path: string) => { routes.push(`POST ${path}`); },
    };
    registerSyncIntegrationRoutes(app as any);
    expect(routes).toEqual(expect.arrayContaining([
      "GET /api/integrations/v1/health",
      "GET /api/integrations/v1/schema",
      "POST /api/integrations/v1/bootstrap",
      "GET /api/integrations/v1/bootstrap/:snapshotId/:entity",
      "GET /api/integrations/v1/records/:entity/:id",
      "GET /api/integrations/v1/changes",
    ]));
  });
});
