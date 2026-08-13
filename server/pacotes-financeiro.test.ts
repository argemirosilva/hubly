import { describe, expect, it } from "vitest";
import { calcularSituacaoPagamentoPacote } from "./pacotes-financeiro";

describe("calcularSituacaoPagamentoPacote", () => {
  it("mantém o pacote pendente sem recebimentos", () => {
    expect(calcularSituacaoPagamentoPacote(500, 0)).toEqual({
      valorTotal: 500, valorRecebido: 0, saldoDevedor: 500, statusPagamento: "pendente",
    });
  });

  it("classifica recebimento parcial e calcula o saldo", () => {
    expect(calcularSituacaoPagamentoPacote(500, 150)).toEqual({
      valorTotal: 500, valorRecebido: 150, saldoDevedor: 350, statusPagamento: "parcial",
    });
  });

  it("classifica quitação sem permitir saldo negativo", () => {
    expect(calcularSituacaoPagamentoPacote(500, 500)).toEqual({
      valorTotal: 500, valorRecebido: 500, saldoDevedor: 0, statusPagamento: "pago",
    });
  });
});
