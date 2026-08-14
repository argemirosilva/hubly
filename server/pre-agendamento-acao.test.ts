import { describe, expect, it } from "vitest";
import { obterOperacaoPreAgendamento } from "../shared/pre-agendamento-acao";

describe("atalho de Pré-agendamentos", () => {
  it("usa o fluxo de reserva recebida ao confirmar", () => {
    expect(obterOperacaoPreAgendamento("confirmar")).toBe("confirmar_reserva");
  });

  it("usa apenas a atualização de status ao cancelar", () => {
    expect(obterOperacaoPreAgendamento("cancelar")).toBe("cancelar_agendamento");
  });
});
