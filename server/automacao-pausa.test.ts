import { describe, expect, it } from "vitest";
import { deveBloquearPreRegistroPorPausa } from "./automacao-pausa";

describe("deveBloquearPreRegistroPorPausa", () => {
  it("bloqueia a criação de novos itens quando a pausa está ativa", () => {
    expect(deveBloquearPreRegistroPorPausa(true)).toBe(true);
  });

  it("permite o pré-registro somente quando a empresa está explicitamente despausada", () => {
    expect(deveBloquearPreRegistroPorPausa(false)).toBe(false);
  });

  it("falha de forma segura quando a configuração da empresa não está disponível", () => {
    expect(deveBloquearPreRegistroPorPausa(undefined)).toBe(true);
    expect(deveBloquearPreRegistroPorPausa(null)).toBe(true);
  });
});
