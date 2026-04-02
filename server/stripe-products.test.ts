import { describe, it, expect } from "vitest";
import { PLANOS_STRIPE, priceIdToPlanType } from "./stripe-products";

describe("stripe-products", () => {
  it("deve ter os Price IDs corretos para cada plano", () => {
    expect(PLANOS_STRIPE.SOLO.mensal.priceId).toBe("price_1THsO8LUFOvpH4vDPedJXKt4");
    expect(PLANOS_STRIPE.SOLO.anual.priceId).toBe("price_1THsOELUFOvpH4vDrZQ2cdqQ");
    expect(PLANOS_STRIPE.PLUS.mensal.priceId).toBe("price_1THsObLUFOvpH4vDkzHLfhbx");
    expect(PLANOS_STRIPE.PLUS.anual.priceId).toBe("price_1THsOcLUFOvpH4vDh7jqFqbH");
    expect(PLANOS_STRIPE.PRO.mensal.priceId).toBe("price_1THsOqLUFOvpH4vDP6JGnszg");
    expect(PLANOS_STRIPE.PRO.anual.priceId).toBe("price_1THsOrLUFOvpH4vDvKI97lcp");
  });

  it("deve mapear Price IDs para os planos corretos", () => {
    expect(priceIdToPlanType("price_1THsO8LUFOvpH4vDPedJXKt4")).toBe("SOLO");
    expect(priceIdToPlanType("price_1THsOELUFOvpH4vDrZQ2cdqQ")).toBe("SOLO");
    expect(priceIdToPlanType("price_1THsObLUFOvpH4vDkzHLfhbx")).toBe("PLUS");
    expect(priceIdToPlanType("price_1THsOcLUFOvpH4vDh7jqFqbH")).toBe("PLUS");
    expect(priceIdToPlanType("price_1THsOqLUFOvpH4vDP6JGnszg")).toBe("PRO");
    expect(priceIdToPlanType("price_1THsOrLUFOvpH4vDvKI97lcp")).toBe("PRO");
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
