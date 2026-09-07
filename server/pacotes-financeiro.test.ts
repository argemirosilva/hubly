import { describe, expect, it } from "vitest";
import { avaliarConclusaoPacote, calcularMargemPrevistaPacote, calcularSituacaoPagamentoPacote, recalcularRecebidoAjustado } from "./pacotes-financeiro";

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

describe("calcularMargemPrevistaPacote", () => {
  it("calcula custo, margem e percentual sobre o valor contratado", () => {
    expect(calcularMargemPrevistaPacote(1000, 350)).toEqual({
      valorTotal: 1000, custoTotal: 350, margemPrevista: 650, percentualMargem: 65,
    });
  });

  it("mantém prejuízo visível quando o custo supera o preço", () => {
    expect(calcularMargemPrevistaPacote(100, 125)).toEqual({
      valorTotal: 100, custoTotal: 125, margemPrevista: -25, percentualMargem: -25,
    });
  });
});

describe("recalcularRecebidoAjustado", () => {
  it("recalcula o total ao corrigir um recebimento individual sem apagar os demais", () => {
    expect(recalcularRecebidoAjustado([
      { id: 1, valor: "500" },
      { id: 2, valor: "150" },
    ], 1, 200)).toBe(350);
  });

  it("rejeita correção sem valor positivo ou lançamento inexistente", () => {
    expect(() => recalcularRecebidoAjustado([{ id: 1, valor: "500" }], 1, 0)).toThrow();
    expect(() => recalcularRecebidoAjustado([{ id: 1, valor: "500" }], 2, 100)).toThrow();
  });
});

describe("avaliarConclusaoPacote", () => {
  it("não permite concluir enquanto houver sessões ainda não concluídas, mesmo com pagamento quitado", () => {
    expect(avaliarConclusaoPacote({ totalSessoes: 4, sessoesConcluidas: 3, statusPagamento: "pago" })).toEqual({
      permitido: false,
      motivo: "Todas as sessões do pacote precisam estar concluídas antes de marcar o pacote como concluído.",
    });
  });

  it("não permite concluir enquanto o pacote estiver com pagamento pendente", () => {
    expect(avaliarConclusaoPacote({ totalSessoes: 4, sessoesConcluidas: 4, statusPagamento: "parcial" })).toEqual({
      permitido: false,
      motivo: "O pagamento do pacote precisa estar 100% quitado antes de marcar o pacote como concluído.",
    });
  });

  it("permite concluir somente com todas as sessões concluídas e pagamento quitado", () => {
    expect(avaliarConclusaoPacote({ totalSessoes: 4, sessoesConcluidas: 4, statusPagamento: "pago" })).toEqual({ permitido: true });
  });
});
