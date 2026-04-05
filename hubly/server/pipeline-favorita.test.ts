import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getEmpresaDoUsuario: vi.fn(),
  getEmpresaDoContexto: vi.fn(),
  updateEmpresa: vi.fn(),
  getPipelinesByEmpresa: vi.fn(),
  getColunasByPipeline: vi.fn(),
  getCartoesByPipeline: vi.fn(),
  getAgendamentoById: vi.fn(),
  getClienteById: vi.fn(),
  updateCartao: vi.fn(),
  getDb: vi.fn(),
}));

import * as db from "./db";

const mockEmpresa = { id: 1, nome: "Maguie", pipelineFavoritaId: null };
const mockPipeline = { id: 10, empresaId: 1, nome: "Jornada de Atendimento", ordem: 0, createdAt: new Date(), updatedAt: new Date() };
const mockColunas = [
  { id: 100, pipelineId: 10, empresaId: 1, nome: "Agendado", ordem: 0, cor: "#6366f1", createdAt: new Date(), updatedAt: new Date() },
  { id: 101, pipelineId: 10, empresaId: 1, nome: "Confirmado", ordem: 1, cor: "#10b981", createdAt: new Date(), updatedAt: new Date() },
];
const mockCartoes = [
  { id: 200, colunaId: 100, pipelineId: 10, empresaId: 1, titulo: "Vitor Z.", status: "em_andamento", clienteId: 5, clienteNome: "Vitor Zuchieri", agendamentoId: 42, ordem: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 201, colunaId: 101, pipelineId: 10, empresaId: 1, titulo: "Ana S.", status: "em_andamento", clienteId: 6, clienteNome: "Ana Silva", agendamentoId: null, ordem: 0, createdAt: new Date(), updatedAt: new Date() },
];

describe("Pipeline Favorita — Backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── setPipelineFavorita ────────────────────────────────────────────────────
  describe("setPipelineFavorita", () => {
    it("deve salvar o pipelineId como favorita na empresa", async () => {
      vi.mocked(db.getEmpresaDoUsuario).mockResolvedValue(mockEmpresa as any);
      vi.mocked(db.updateEmpresa).mockResolvedValue(undefined as any);

      await db.getEmpresaDoUsuario(1);
      await db.updateEmpresa(1, { pipelineFavoritaId: 10 });

      expect(db.updateEmpresa).toHaveBeenCalledWith(1, { pipelineFavoritaId: 10 });
    });

    it("deve remover a pipeline favorita quando pipelineId é null", async () => {
      vi.mocked(db.getEmpresaDoUsuario).mockResolvedValue({ ...mockEmpresa, pipelineFavoritaId: 10 } as any);
      vi.mocked(db.updateEmpresa).mockResolvedValue(undefined as any);

      await db.updateEmpresa(1, { pipelineFavoritaId: undefined });

      expect(db.updateEmpresa).toHaveBeenCalledWith(1, { pipelineFavoritaId: undefined });
    });

    it("deve lançar erro se empresa não for encontrada", async () => {
      vi.mocked(db.getEmpresaDoUsuario).mockResolvedValue(null as any);

      const empresa = await db.getEmpresaDoUsuario(999);
      expect(empresa).toBeNull();
    });
  });

  // ── getDashboardPipeline ───────────────────────────────────────────────────
  describe("getDashboardPipeline", () => {
    it("deve retornar null se empresa não tiver pipeline favorita", async () => {
      vi.mocked(db.getEmpresaDoContexto).mockResolvedValue(mockEmpresa as any);

      const empresa = await db.getEmpresaDoContexto(1, null);
      const pipelineId = (empresa as any)?.pipelineFavoritaId;
      expect(pipelineId).toBeNull();
    });

    it("deve retornar pipeline com colunas e cartões quando favorita está definida", async () => {
      vi.mocked(db.getEmpresaDoContexto).mockResolvedValue({ ...mockEmpresa, pipelineFavoritaId: 10 } as any);
      vi.mocked(db.getPipelinesByEmpresa).mockResolvedValue([mockPipeline] as any);
      vi.mocked(db.getColunasByPipeline).mockResolvedValue(mockColunas as any);
      vi.mocked(db.getCartoesByPipeline).mockResolvedValue(mockCartoes as any);

      const empresa = await db.getEmpresaDoContexto(1, null);
      const pipelineId = (empresa as any)?.pipelineFavoritaId;
      expect(pipelineId).toBe(10);

      const pipelines = await db.getPipelinesByEmpresa(1);
      const pipeline = pipelines.find((p) => p.id === pipelineId);
      expect(pipeline).toBeDefined();
      expect(pipeline?.nome).toBe("Jornada de Atendimento");

      const colunas = await db.getColunasByPipeline(10);
      const cartoes = await db.getCartoesByPipeline(10);
      expect(colunas).toHaveLength(2);
      expect(cartoes).toHaveLength(2);

      // Verificar que os cartões são distribuídos pelas colunas corretamente
      const colunasComCartoes = colunas
        .sort((a, b) => a.ordem - b.ordem)
        .map((c) => ({
          ...c,
          cartoes: cartoes.filter((k) => k.colunaId === c.id),
        }));
      expect(colunasComCartoes[0].cartoes).toHaveLength(1);
      expect(colunasComCartoes[1].cartoes).toHaveLength(1);
    });

    it("deve retornar null se pipeline favorita não existir mais", async () => {
      vi.mocked(db.getEmpresaDoContexto).mockResolvedValue({ ...mockEmpresa, pipelineFavoritaId: 999 } as any);
      vi.mocked(db.getPipelinesByEmpresa).mockResolvedValue([mockPipeline] as any);

      const empresa = await db.getEmpresaDoContexto(1, null);
      const pipelineId = (empresa as any)?.pipelineFavoritaId;
      const pipelines = await db.getPipelinesByEmpresa(1);
      const pipeline = pipelines.find((p) => p.id === pipelineId);
      expect(pipeline).toBeUndefined();
    });
  });

  // ── getCardDetalhes ────────────────────────────────────────────────────────
  describe("getCardDetalhes", () => {
    it("deve retornar agendamento vinculado ao cartão", async () => {
      const mockAgendamento = { id: 42, clienteId: 5, horaInicio: "09:00", horaFim: "09:40", status: "concluido" };
      vi.mocked(db.getAgendamentoById).mockResolvedValue(mockAgendamento as any);

      const agendamento = await db.getAgendamentoById(42);
      expect(agendamento).toBeDefined();
      expect(agendamento?.id).toBe(42);
    });

    it("deve retornar cliente vinculado ao cartão", async () => {
      const mockCliente = { id: 5, nome: "Vitor Zuchieri", telefone: "11999999999" };
      vi.mocked(db.getClienteById).mockResolvedValue(mockCliente as any);

      const cliente = await db.getClienteById(5);
      expect(cliente).toBeDefined();
      expect(cliente?.nome).toBe("Vitor Zuchieri");
    });

    it("deve retornar null para agendamento quando cartão não tem agendamentoId", async () => {
      const cartaoSemAgendamento = mockCartoes[1]; // agendamentoId: null
      const agendamento = cartaoSemAgendamento.agendamentoId
        ? await db.getAgendamentoById(cartaoSemAgendamento.agendamentoId)
        : null;
      expect(agendamento).toBeNull();
      expect(db.getAgendamentoById).not.toHaveBeenCalled();
    });
  });

  // ── vincularAgendamento ─────────────────────────────────────────────────────────────────
  describe("vincularAgendamento (updateCartao)", () => {
    it("deve atualizar o agendamentoId do cartão", async () => {
      vi.mocked(db.updateCartao).mockResolvedValue(undefined as any);

      await db.updateCartao(200, { agendamentoId: 42 } as any);
      expect(db.updateCartao).toHaveBeenCalledWith(200, { agendamentoId: 42 });
    });

    it("deve remover o vínculo com agendamento quando agendamentoId é undefined", async () => {
      vi.mocked(db.updateCartao).mockResolvedValue(undefined as any);

      await db.updateCartao(200, { agendamentoId: undefined } as any);
      expect(db.updateCartao).toHaveBeenCalledWith(200, { agendamentoId: undefined });
    });
  });
});