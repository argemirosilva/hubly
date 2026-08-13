import { describe, expect, it } from "vitest";
import { somarMinutosAoHorario, validarReservasDePacote } from "./pacotes-agenda";

describe("agenda de pacotes", () => {
  it("calcula o término de uma sessão a partir da duração dos serviços", () => {
    expect(somarMinutosAoHorario("14:30", 150)).toBe("17:00");
  });

  it("impede reservar mais sessões do que o saldo disponível", () => {
    const erro = validarReservasDePacote(
      [{ servicoId: 1, quantidadeTotal: 2, quantidadeUsada: 0, quantidadeReservada: 1 }],
      [{ servicoIds: [1] }, { servicoIds: [1] }],
    );
    expect(erro).toContain("apenas 1 sessão");
  });

  it("aceita reservas dentro do saldo do pacote", () => {
    expect(validarReservasDePacote(
      [{ servicoId: 1, quantidadeTotal: 3, quantidadeUsada: 1, quantidadeReservada: 0 }],
      [{ servicoIds: [1] }, { servicoIds: [1] }],
    )).toBeNull();
  });
});
