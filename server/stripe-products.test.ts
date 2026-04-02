import { describe, it, expect } from "vitest";
import { PLANOS_STRIPE, priceIdToPlanType } from "./stripe-products";

describe("stripe-products", () => {
  it("deve ter os Price IDs corretos para cada plano", () => {
    expect(PLANOS_STRIPE.SOLO.mensal.priceId).toBe("price_1THohRPqe8KEHF80W5mlUk0L");
    expect(PLANOS_STRIPE.SOLO.anual.priceId).toBe("price_1THojAPqe8KEHF80Z6ieVPaV");
    expect(PLANOS_STRIPE.PLUS.mensal.priceId).toBe("price_1THoo5Pqe8KEHF80Lv3vxmvJ");
    expect(PLANOS_STRIPE.PLUS.anual.priceId).toBe("price_1THoo5Pqe8KEHF80QY6il6zl");
    expect(PLANOS_STRIPE.PRO.mensal.priceId).toBe("price_1THosnPqe8KEHF80AVFlG4kq");
    expect(PLANOS_STRIPE.PRO.anual.priceId).toBe("price_1THorIPqe8KEHF80cubUcV1P");
  });

  it("deve mapear Price IDs para os planos corretos", () => {
    expect(priceIdToPlanType("price_1THohRPqe8KEHF80W5mlUk0L")).toBe("SOLO");
    expect(priceIdToPlanType("price_1THojAPqe8KEHF80Z6ieVPaV")).toBe("SOLO");
    expect(priceIdToPlanType("price_1THoo5Pqe8KEHF80Lv3vxmvJ")).toBe("PLUS");
    expect(priceIdToPlanType("price_1THoo5Pqe8KEHF80QY6il6zl")).toBe("PLUS");
    expect(priceIdToPlanType("price_1THosnPqe8KEHF80AVFlG4kq")).toBe("PRO");
    expect(priceIdToPlanType("price_1THorIPqe8KEHF80cubUcV1P")).toBe("PRO");
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
