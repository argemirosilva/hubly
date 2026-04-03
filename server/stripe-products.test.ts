import { describe, it, expect } from "vitest";
import { PLANOS_STRIPE, priceIdToPlanType } from "./stripe-products";

describe("stripe-products", () => {
  it("deve ter os Price IDs corretos para cada plano", () => {
    expect(PLANOS_STRIPE.SOLO.mensal.priceId).toBe("price_1TIDdSBbN12GNJRM5nsicm99");
    expect(PLANOS_STRIPE.SOLO.anual.priceId).toBe("price_1TIDdTBbN12GNJRMSRPVIgjc");
    expect(PLANOS_STRIPE.PLUS.mensal.priceId).toBe("price_1TIDdVBbN12GNJRM59VMnBp8");
    expect(PLANOS_STRIPE.PLUS.anual.priceId).toBe("price_1TIDdWBbN12GNJRMfFcdGw2R");
    expect(PLANOS_STRIPE.PRO.mensal.priceId).toBe("price_1TIDdYBbN12GNJRMhzZ0Vy4f");
    expect(PLANOS_STRIPE.PRO.anual.priceId).toBe("price_1TIDdYBbN12GNJRMMzn7M81r");
  });

  it("deve mapear Price IDs para os planos corretos", () => {
    expect(priceIdToPlanType("price_1TIDdSBbN12GNJRM5nsicm99")).toBe("SOLO");
    expect(priceIdToPlanType("price_1TIDdTBbN12GNJRMSRPVIgjc")).toBe("SOLO");
    expect(priceIdToPlanType("price_1TIDdVBbN12GNJRM59VMnBp8")).toBe("PLUS");
    expect(priceIdToPlanType("price_1TIDdWBbN12GNJRMfFcdGw2R")).toBe("PLUS");
    expect(priceIdToPlanType("price_1TIDdYBbN12GNJRMhzZ0Vy4f")).toBe("PRO");
    expect(priceIdToPlanType("price_1TIDdYBbN12GNJRMMzn7M81r")).toBe("PRO");
  });

  it("deve retornar SOLO como fallback para Price IDs desconhecidos", () => {
    expect(priceIdToPlanType("price_unknown")).toBe("SOLO");
  });

  it("deve ter todos os planos definidos com nome e descrição", () => {
    for (const key of ["SOLO", "PLUS", "PRO"]) {
      expect(PLANOS_STRIPE[key].nome).toBeTruthy();
      expect(PLANOS_STRIPE[key].descricao).toBeTruthy();
    }
  });
});
