import { describe, expect, it } from "vitest";
import { selecionarAutomacoesPorServicos } from "./automacoes-por-servico";

describe("seleção de automações por serviço", () => {
  const automacoes = [
    { id: 1, nome: "Agendamento de maquiagem", flowJson: JSON.stringify([{ type: "condition", data: { tipo: "por_servico", servicos: ["Maquiagem Social"] } }]) },
    { id: 2, nome: "Agendamento de curso", flowJson: JSON.stringify([{ type: "condition", data: { tipo: "por_servico", servicos: ["Curso MA - signature"] } }]) },
    { id: 3, nome: "Agendamento externo", flowJson: JSON.stringify([{ type: "condition", data: { tipo: "por_servico", servicos: ["Maquiagem externa"] } }]) },
  ];

  it("seleciona somente a automação de curso para uma sessão de curso", () => {
    expect(selecionarAutomacoesPorServicos(automacoes, "Curso MA - signature", ["Curso MA - signature"]).map(a => a.id)).toEqual([2]);
  });

  it("seleciona somente a automação de maquiagem para uma sessão de maquiagem", () => {
    expect(selecionarAutomacoesPorServicos(automacoes, "Maquiagem Social", ["Maquiagem Social"]).map(a => a.id)).toEqual([1]);
  });

  it("seleciona a automação externa para o serviço externo configurado", () => {
    expect(selecionarAutomacoesPorServicos(automacoes, "Maquiagem externa", ["Maquiagem externa"]).map(a => a.id)).toEqual([3]);
  });
});
