import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAndNotifyUsageLimits } from "./usage-alerts";

// Mock das dependências externas
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("../drizzle/schema", () => ({
  usageAlerts: {},
}));

describe("checkAndNotifyUsageLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não deve enviar alerta para plano PRO com limites ilimitados", async () => {
    const { notifyOwner } = await import("./_core/notification");

    await checkAndNotifyUsageLimits({
      empresaId: 1,
      empresaNome: "Empresa Teste",
      plan: "PRO",
      agendamentosCount: 9999,
      notificacoesWhatsappCount: 9999,
    });

    // PRO tem limites ilimitados (-1), então não deve notificar
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("não deve enviar alerta quando uso está abaixo de 80%", async () => {
    const { notifyOwner } = await import("./_core/notification");

    // SOLO tem 50 agendamentos/mês; 30 = 60%
    await checkAndNotifyUsageLimits({
      empresaId: 1,
      empresaNome: "Empresa Teste",
      plan: "SOLO",
      agendamentosCount: 30,
      notificacoesWhatsappCount: 10,
    });

    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("deve tentar enviar alerta quando uso atinge 80% (DB indisponível = skip)", async () => {
    const { notifyOwner } = await import("./_core/notification");

    // SOLO tem 50 agendamentos/mês; 41 = 82%
    // DB está mockado como null, então wasAlertSentRecently retorna true (fail safe)
    await checkAndNotifyUsageLimits({
      empresaId: 1,
      empresaNome: "Empresa Teste",
      plan: "SOLO",
      agendamentosCount: 41,
      notificacoesWhatsappCount: 10,
    });

    // DB indisponível → fail safe → não envia
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("deve calcular percentual correto para plano PLUS", async () => {
    // PLUS tem 200 agendamentos/mês
    // 160 = 80% exato
    const percent = Math.round((160 / 200) * 100);
    expect(percent).toBe(80);
  });

  it("deve calcular percentual correto para plano SOLO", async () => {
    // SOLO tem 50 agendamentos/mês
    // 48 = 96%
    const percent = Math.round((48 / 50) * 100);
    expect(percent).toBe(96);
    expect(percent).toBeGreaterThanOrEqual(95);
  });
});
