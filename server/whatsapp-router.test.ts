import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  zapiSendText: vi.fn(),
  zapiSendMedia: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./zapi", () => ({
  zapiSendText: mocks.zapiSendText,
  zapiSendMedia: mocks.zapiSendMedia,
}));

import {
  invalidatePlanCache,
  origemEhOficialParaAutomacoes,
  routedSendMedia,
  routedSendMessage,
} from "./whatsapp-router";

function dbComPlanoPro() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ planType: "PRO" }]),
        }),
      }),
    }),
  };
}

describe("WhatsApp Router — instância por empresa", () => {
  const appPublicUrlOriginal = process.env.APP_PUBLIC_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_PUBLIC_URL = "https://hubly.orizontech.com.br";
    mocks.getDb.mockResolvedValue(dbComPlanoPro());
    mocks.zapiSendText.mockResolvedValue({ ok: true });
    mocks.zapiSendMedia.mockResolvedValue({ ok: true });
    invalidatePlanCache(77);
  });

  afterEach(() => {
    process.env.APP_PUBLIC_URL = appPublicUrlOriginal;
  });

  it("envia texto pela instância Z-API vinculada à empresa PRO", async () => {
    await expect(routedSendMessage(77, "14999998888", "Olá")).resolves.toBe(true);
    expect(mocks.zapiSendText).toHaveBeenCalledWith("14999998888", "Olá", 77);
  });

  it("envia mídia pela instância Z-API vinculada à empresa PRO", async () => {
    await expect(routedSendMedia(77, "14999998888", "https://exemplo.com/foto.jpg", "Olá", "image/jpeg"))
      .resolves.toBe(true);
    expect(mocks.zapiSendMedia).toHaveBeenCalledWith(
      "14999998888",
      "https://exemplo.com/foto.jpg",
      "Olá",
      "image/jpeg",
      77,
    );
  });

  it("reconhece somente os domínios oficiais como autorizados para automações", () => {
    expect(origemEhOficialParaAutomacoes("https://hubly.orizontech.com.br")).toBe(true);
    expect(origemEhOficialParaAutomacoes("https://hubly.orizontech.com.br/")).toBe(true);
    expect(origemEhOficialParaAutomacoes("http://localhost:3001")).toBe(false);
  });

  it("bloqueia o envio quando executado em uma réplica local", async () => {
    process.env.APP_PUBLIC_URL = "http://localhost:3001";
    await expect(routedSendMessage(77, "14999998888", "Olá")).resolves.toBe(false);
    expect(mocks.zapiSendText).not.toHaveBeenCalled();
  });
});
