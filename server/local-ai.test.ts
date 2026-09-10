import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ config: vi.fn(), fetch: vi.fn() }));
vi.mock("./runtime-config", () => ({ getRuntimeConfig: mocks.config }));
vi.mock("node:fs", () => ({ readFileSync: () => "LM_STUDIO_API_KEY=test-local-only" }));
import { invokeLocalAI } from "./local-ai";

beforeEach(() => {
  mocks.config.mockReturnValue({ ai: { baseUrl: "http://localhost:1234/v1", model: "gemma-test", credentialFile: "unused" } });
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }) });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());
describe("IA local do Hubly", () => {
  it("fixa o Gemma interno e converte JSON sem chamar nuvem", async () => {
    await invokeLocalAI({ model: "gpt-4o", messages: [], response_format: { type: "json_object" } });
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toBe("http://localhost:1234/v1/chat/completions");
    expect(JSON.parse(options.body)).toMatchObject({ model: "gemma-test", response_format: { type: "json_schema" } });
    expect(options.redirect).toBe("error");
  });
  it("não tenta outro provedor em erro", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(invokeLocalAI({ messages: [] })).rejects.toThrow("HTTP 503");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("rejeita destino externo", async () => {
    mocks.config.mockReturnValue({ ai: { baseUrl: "https://external.invalid/v1" } });
    await expect(invokeLocalAI({ messages: [] })).rejects.toThrow("serviço interno");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rejeita respostas truncadas", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ finish_reason: "length" }] }) });
    await expect(invokeLocalAI({ messages: [] })).rejects.toThrow("excedeu o limite");
  });
});
