import { describe, expect, it } from "vitest";
import { assinaturaSyncValida, gerarAssinaturaSync, gerarCredencialSync, hashSecretSync } from "./sync-auth";

describe("credenciais da sincronização", () => {
  it("gera identificador e segredo distintos com hash verificável", () => {
    const credential = gerarCredencialSync();
    expect(credential.clientId).toMatch(/^hubly-remote-/);
    expect(credential.secret.length).toBeGreaterThan(30);
    expect(hashSecretSync(credential.secret)).toBe(credential.secretHash);
  });

  it("aceita assinatura válida recente e rejeita assinatura expirada", () => {
    const secret = "segredo-de-teste";
    const timestamp = "2026-08-18T13:00:00.000Z";
    const signature = gerarAssinaturaSync({ method: "GET", path: "/api/integrations/v1/health", timestamp, secret });
    expect(assinaturaSyncValida({ method: "GET", path: "/api/integrations/v1/health", timestamp, secret, signature, agora: Date.parse("2026-08-18T13:04:59.000Z") })).toBe(true);
    expect(assinaturaSyncValida({ method: "GET", path: "/api/integrations/v1/health", timestamp, secret, signature, agora: Date.parse("2026-08-18T13:05:01.000Z") })).toBe(false);
  });
});
