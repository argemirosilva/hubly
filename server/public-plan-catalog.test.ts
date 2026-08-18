import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("catálogo público de assinaturas", () => {
  it("expõe os valores, ciclos e limites oficiais dos três planos", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const plans = await caller.planos.getPlans();

    expect(plans).toHaveLength(3);
    expect(plans).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "SOLO", monthly: 49, annual: 40.83, annualTotal: 490, limits: expect.objectContaining({ profissionais: 1, notificacoesWhatsappMes: 100 }) }),
      expect.objectContaining({ type: "PLUS", monthly: 149, annual: 124.17, annualTotal: 1490, limits: expect.objectContaining({ profissionais: 5, notificacoesWhatsappMes: 400, iaFinanceira: true }) }),
      expect.objectContaining({ type: "PRO", monthly: 299, annual: 249.17, annualTotal: 2990, limits: expect.objectContaining({ profissionais: 20, notificacoesWhatsappMes: 1000, iaTotal: true }) }),
    ]));
  });
});
