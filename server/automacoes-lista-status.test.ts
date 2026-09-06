import { describe, expect, it } from "vitest";
import { filtrarAutomacoesPorStatus } from "../client/src/lib/automacoesStatus";

describe("separação de automações por status", () => {
  const automacoes = [
    { id: 1, nome: "Solicitar reserva", ativo: true },
    { id: 2, nome: "Aniversário do mês", ativo: false },
    { id: 3, nome: "Confirmar presença", ativo: true },
  ];

  it("mantém a lista principal restrita às automações ativas", () => {
    expect(filtrarAutomacoesPorStatus(automacoes, "ativas").map((automacao) => automacao.id)).toEqual([1, 3]);
  });

  it("mantém as automações desativadas em uma visão própria", () => {
    expect(filtrarAutomacoesPorStatus(automacoes, "desativadas").map((automacao) => automacao.id)).toEqual([2]);
  });
});
