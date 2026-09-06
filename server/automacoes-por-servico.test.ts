import { describe, expect, it } from "vitest";
import { selecionarAutomacoesCompativeis, selecionarAutomacoesPorServicos } from "./automacoes-por-servico";

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

  it("mantém somente a regra de curso quando uma regra geral e uma regra específica são compatíveis", () => {
    const regras = [
      { id: 10, nome: "Agendado amanhã", flowJson: JSON.stringify([{ type: "trigger", data: { tipo: "horas_antes_agendamento" } }]) },
      { id: 11, nome: "Curso agendado amanhã", flowJson: JSON.stringify([{ type: "condition", data: { tipo: "por_categoria", valor: "Curso" } }]) },
    ];
    expect(selecionarAutomacoesCompativeis(regras, {
      servicoNome: "Curso Signature - dia 1",
      todosServicos: ["Curso Signature - dia 1"],
      categoriaServico: "Curso",
      todasCategorias: ["Curso"],
    }).map(a => a.id)).toEqual([11]);
  });

  it("mantém a regra geral quando o atendimento não pertence à categoria Curso", () => {
    const regras = [
      { id: 10, nome: "Agendado amanhã", flowJson: JSON.stringify([{ type: "trigger", data: { tipo: "horas_antes_agendamento" } }]) },
      { id: 11, nome: "Curso agendado amanhã", flowJson: JSON.stringify([{ type: "condition", data: { tipo: "por_categoria", valor: "Curso" } }]) },
    ];
    expect(selecionarAutomacoesCompativeis(regras, {
      servicoNome: "Maquiagem Social",
      todosServicos: ["Maquiagem Social"],
      categoriaServico: "Maquiadora",
      todasCategorias: ["Maquiadora"],
    }).map(a => a.id)).toEqual([10]);
  });
});
