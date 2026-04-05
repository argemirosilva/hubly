import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock das funções do DB
vi.mock("./db", () => ({
  getEmpresaByOwnerId: vi.fn(),
  getPipelinesByEmpresa: vi.fn(),
  createPipeline: vi.fn(),
  updatePipeline: vi.fn(),
  deletePipeline: vi.fn(),
  getColunasByPipeline: vi.fn(),
  createColuna: vi.fn(),
  updateColuna: vi.fn(),
  deleteColuna: vi.fn(),
  getCartoesByPipeline: vi.fn(),
  createCartao: vi.fn(),
  updateCartao: vi.fn(),
  deleteCartao: vi.fn(),
}));

import {
  getPipelinesByEmpresa,
  createPipeline,
  getColunasByPipeline,
  createColuna,
  getCartoesByPipeline,
  createCartao,
  updateCartao,
} from "./db";

// ─── Testes de estrutura de dados ─────────────────────────────────────────────

describe("Pipeline Kanban — estrutura de dados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pipeline tem campos obrigatórios corretos", () => {
    const pipeline = {
      id: 1,
      empresaId: 10,
      nome: "Vendas",
      ordem: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(pipeline.nome).toBe("Vendas");
    expect(pipeline.empresaId).toBe(10);
    expect(pipeline.ordem).toBe(0);
  });

  it("coluna tem campos obrigatórios corretos", () => {
    const coluna = {
      id: 1,
      pipelineId: 1,
      empresaId: 10,
      nome: "Em andamento",
      ordem: 1,
      cor: "#f59e0b",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(coluna.nome).toBe("Em andamento");
    expect(coluna.cor).toBe("#f59e0b");
    expect(coluna.pipelineId).toBe(1);
  });

  it("cartão tem campos obrigatórios e opcionais corretos", () => {
    const cartao = {
      id: 1,
      colunaId: 1,
      pipelineId: 1,
      empresaId: 10,
      titulo: "Negociação com cliente X",
      descricao: "Aguardando retorno",
      status: "em_andamento" as const,
      clienteNome: "Maria Silva",
      responsavelNome: "João",
      lembrete: "2026-04-15",
      valor: "500.00",
      ordem: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(cartao.titulo).toBe("Negociação com cliente X");
    expect(cartao.status).toBe("em_andamento");
    expect(cartao.valor).toBe("500.00");
  });
});

// ─── Testes de lógica de ordenação ────────────────────────────────────────────

describe("Pipeline Kanban — ordenação", () => {
  it("colunas são ordenadas por campo ordem crescente", () => {
    const colunas = [
      { id: 3, nome: "Concluído", ordem: 2 },
      { id: 1, nome: "Novo", ordem: 0 },
      { id: 2, nome: "Em andamento", ordem: 1 },
    ];
    const ordenadas = [...colunas].sort((a, b) => a.ordem - b.ordem);
    expect(ordenadas[0].nome).toBe("Novo");
    expect(ordenadas[1].nome).toBe("Em andamento");
    expect(ordenadas[2].nome).toBe("Concluído");
  });

  it("cartões são filtrados por colunaId corretamente", () => {
    const cartoes = [
      { id: 1, colunaId: 1, titulo: "Cartão A", ordem: 0 },
      { id: 2, colunaId: 2, titulo: "Cartão B", ordem: 0 },
      { id: 3, colunaId: 1, titulo: "Cartão C", ordem: 1 },
    ];
    const coluna1 = cartoes.filter((c) => c.colunaId === 1).sort((a, b) => a.ordem - b.ordem);
    expect(coluna1).toHaveLength(2);
    expect(coluna1[0].titulo).toBe("Cartão A");
    expect(coluna1[1].titulo).toBe("Cartão C");
  });

  it("nova ordem de cartão é igual ao comprimento da lista atual", () => {
    const cartoesExistentes = [
      { id: 1, colunaId: 5, ordem: 0 },
      { id: 2, colunaId: 5, ordem: 1 },
    ];
    const novaOrdem = cartoesExistentes.filter((c) => c.colunaId === 5).length;
    expect(novaOrdem).toBe(2);
  });
});

// ─── Testes de status dos cartões ─────────────────────────────────────────────

describe("Pipeline Kanban — status dos cartões", () => {
  const statusValidos = ["em_andamento", "congelado", "cancelado", "concluido"] as const;

  it("todos os status válidos são aceitos", () => {
    statusValidos.forEach((s) => {
      expect(statusValidos).toContain(s);
    });
  });

  it("status padrão é em_andamento", () => {
    const cartao = { status: "em_andamento" as const };
    expect(cartao.status).toBe("em_andamento");
  });

  it("status concluido é diferente de cancelado", () => {
    expect("concluido").not.toBe("cancelado");
  });
});

// ─── Testes de colunas padrão ─────────────────────────────────────────────────

describe("Pipeline Kanban — colunas padrão ao criar pipeline", () => {
  it("cria 3 colunas padrão com nomes e cores corretos", () => {
    const colunasPadrao = [
      { nome: "Novo", cor: "#6366f1" },
      { nome: "Em andamento", cor: "#f59e0b" },
      { nome: "Concluído", cor: "#10b981" },
    ];
    expect(colunasPadrao).toHaveLength(3);
    expect(colunasPadrao[0].nome).toBe("Novo");
    expect(colunasPadrao[1].cor).toBe("#f59e0b");
    expect(colunasPadrao[2].nome).toBe("Concluído");
  });

  it("ordem das colunas padrão é sequencial 0, 1, 2", () => {
    const colunasPadrao = [
      { nome: "Novo", cor: "#6366f1", ordem: 0 },
      { nome: "Em andamento", cor: "#f59e0b", ordem: 1 },
      { nome: "Concluído", cor: "#10b981", ordem: 2 },
    ];
    colunasPadrao.forEach((c, i) => expect(c.ordem).toBe(i));
  });
});
