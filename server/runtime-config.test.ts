import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exists: vi.fn(), read: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: mocks.exists, readFileSync: mocks.read }));
import { getPublicAppUrl } from "./runtime-config";
afterEach(() => vi.unstubAllEnvs());
describe("URL publica local", () => {
  it("prioriza o dominio configurado sem modificar ambiente", () => {
    vi.stubEnv("APP_PUBLIC_URL", "http://localhost:3001");
    mocks.exists.mockReturnValue(true);
    mocks.read.mockReturnValue(JSON.stringify({ publicUrl: "https://hubly.orizontech.com.br" }));
    expect(getPublicAppUrl()).toBe("https://hubly.orizontech.com.br");
    expect(process.env.APP_PUBLIC_URL).toBe("http://localhost:3001");
  });
  it("preserva configuracao de outras instalacoes", () => {
    vi.stubEnv("APP_PUBLIC_URL", "https://example.test");
    mocks.exists.mockReturnValue(false);
    expect(getPublicAppUrl()).toBe("https://example.test");
  });
});
