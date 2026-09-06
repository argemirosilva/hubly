import { describe, expect, it } from "vitest";
import { verificarFiltroAutomacao, verificarFiltroServicoAutomacao } from "./filtro-servico-automacao";

describe("filtro de serviço das automações", () => {
  const filtroCursos = JSON.stringify([
    {
      type: "condition",
      data: {
        tipo: "por_servico",
        servicos: ["Curso MA - signature", "Curso signature - 2 dias"],
      },
    },
  ]);

  it("bloqueia a automação de cursos para um procedimento comum", () => {
    expect(verificarFiltroServicoAutomacao(filtroCursos, "Babyliss/escova - curto", ["Babyliss/escova - curto"])).toBe(false);
  });

  it("permite a automação de cursos para um serviço listado no filtro", () => {
    expect(verificarFiltroServicoAutomacao(filtroCursos, "Curso MA - signature", ["Curso MA - signature"])).toBe(true);
  });

  it("aceita o formato textual legado do filtro", () => {
    const fluxoLegado = JSON.stringify([{ type: "condition", data: { tipo: "por_servico", valor: "Manicure, Escova" } }]);
    expect(verificarFiltroServicoAutomacao(fluxoLegado, "Escova")).toBe(true);
    expect(verificarFiltroServicoAutomacao(fluxoLegado, "Corte")).toBe(false);
  });

  it("bloqueia a automação de curso para atendimento de outra categoria", () => {
    const fluxoCurso = JSON.stringify([{ type: "condition", data: { tipo: "por_categoria", valor: "Curso" } }]);
    expect(verificarFiltroAutomacao(fluxoCurso, {
      servicoNome: "Maquiagem Social",
      todosServicos: ["Maquiagem Social"],
      categoriaServico: "Maquiadora",
      todasCategorias: ["Maquiadora"],
    })).toBe(false);
  });

  it("permite a automação de curso apenas quando a categoria do atendimento corresponde", () => {
    const fluxoCurso = JSON.stringify([{ type: "condition", data: { tipo: "por_categoria", valor: "Curso" } }]);
    expect(verificarFiltroAutomacao(fluxoCurso, {
      servicoNome: "Curso Signature - dia 1",
      todosServicos: ["Curso Signature - dia 1"],
      categoriaServico: "Curso",
      todasCategorias: ["Curso"],
    })).toBe(true);
  });
});
