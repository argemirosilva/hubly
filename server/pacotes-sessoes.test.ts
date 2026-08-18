import { describe, expect, it } from "vitest";
import { calcularSessoesManuaisReversiveis } from "./pacotes-sessoes";

describe("calcularSessoesManuaisReversiveis", () => {
  it("identifica uma sessão manual usada acidentalmente", () => {
    expect(calcularSessoesManuaisReversiveis(1, 0)).toBe(1);
  });

  it("não permite desfazer sessão que veio de atendimento concluído", () => {
    expect(calcularSessoesManuaisReversiveis(1, 1)).toBe(0);
  });

  it("separa consumo manual de atendimentos já concluídos", () => {
    expect(calcularSessoesManuaisReversiveis(3, 2)).toBe(1);
  });
});
