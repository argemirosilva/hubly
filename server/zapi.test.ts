/**
 * Testes unitários — integração Z-API e roteamento WhatsApp
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do ENV ──────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    zapiInstanceId: "TEST_INSTANCE_ID",
    zapiToken: "TEST_TOKEN",
    zapiClientToken: "TEST_CLIENT_TOKEN",
  },
}));

// ─── Mock do fetch global ─────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Mock do DB para o router ─────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// ─── Mock do Baileys waManager ────────────────────────────────────────────────
vi.mock("./whatsapp", () => ({
  waManager: {
    getState: vi.fn().mockReturnValue({ status: "connected" }),
    sendMessage: vi.fn().mockResolvedValue(true),
    sendMediaMessage: vi.fn().mockResolvedValue(true),
  },
}));

describe("Z-API — zapiSendText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve normalizar telefone sem DDI e chamar a API corretamente", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ zaapId: "msg_123" }),
    });

    const { zapiSendText } = await import("./zapi");
    const result = await zapiSendText("11999998888", "Olá!");

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe("msg_123");

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/instances/TEST_INSTANCE_ID/token/TEST_TOKEN/send-text");
    const body = JSON.parse(opts.body);
    expect(body.phone).toBe("5511999998888");
    expect(body.message).toBe("Olá!");
  });

  it("deve manter DDI 55 se já presente no telefone", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ zaapId: "msg_456" }),
    });

    const { zapiSendText } = await import("./zapi");
    await zapiSendText("5511999998888", "Teste");

    const [, opts] = mockFetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.phone).toBe("5511999998888");
  });

  it("deve retornar ok=false quando a API retorna erro HTTP", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Instance not found" }),
    });

    const { zapiSendText } = await import("./zapi");
    const result = await zapiSendText("11999998888", "Teste");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Instance not found");
  });

  it("deve retornar ok=false quando fetch lança exceção", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { zapiSendText } = await import("./zapi");
    const result = await zapiSendText("11999998888", "Teste");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Network error");
  });
});

describe("Z-API — zapiCheckStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deve retornar connected=true quando API responde connected=true", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ connected: true }),
    });

    const { zapiCheckStatus } = await import("./zapi");
    const status = await zapiCheckStatus();

    expect(status.connected).toBe(true);
  });

  it("deve retornar connected=false quando API responde connected=false", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ connected: false, status: "disconnected" }),
    });

    const { zapiCheckStatus } = await import("./zapi");
    const status = await zapiCheckStatus();

    expect(status.connected).toBe(false);
  });
});

describe("WhatsApp Router — routedSendMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deve lançar erro quando banco está indisponível (sem fallback para FREE)", async () => {
    const { routedSendMessage } = await import("./whatsapp-router");

    await expect(routedSendMessage(1, "11999998888", "Teste")).rejects.toThrow(
      /Banco indisponível/
    );
  });
});
