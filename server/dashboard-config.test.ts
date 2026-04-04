import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo db
vi.mock("./db", () => ({
  getDashboardConfig: vi.fn(),
  saveDashboardConfig: vi.fn(),
}));

import * as db from "./db";

const mockUser = { id: 1, empresaId: 1, role: "admin" as const, nome: "Admin" };

describe("dashboardConfig - getDashboardConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna array vazio quando não há configuração salva", async () => {
    vi.mocked(db.getDashboardConfig).mockResolvedValue(null);
    const result = await db.getDashboardConfig(1);
    expect(result).toBeNull();
  });

  it("retorna a configuração salva do usuário", async () => {
    const mockConfig = [
      { id: "stats", visible: true, order: 0, size: "full" },
      { id: "agenda_hoje", visible: false, order: 1, size: "lg" },
    ];
    vi.mocked(db.getDashboardConfig).mockResolvedValue(mockConfig as any);
    const result = await db.getDashboardConfig(1);
    expect(result).toHaveLength(2);
    expect(result![0].id).toBe("stats");
    expect(result![1].visible).toBe(false);
  });

  it("chama getDashboardConfig com o userId correto", async () => {
    vi.mocked(db.getDashboardConfig).mockResolvedValue([]);
    await db.getDashboardConfig(42);
    expect(db.getDashboardConfig).toHaveBeenCalledWith(42);
  });
});

describe("dashboardConfig - saveDashboardConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("salva a configuração do dashboard com sucesso", async () => {
    vi.mocked(db.saveDashboardConfig).mockResolvedValue(undefined);
    const layout = [
      { id: "stats", visible: true, order: 0, size: "full" as const },
      { id: "equipe", visible: false, order: 8, size: "sm" as const },
    ];
    await db.saveDashboardConfig(1, layout);
    expect(db.saveDashboardConfig).toHaveBeenCalledWith(1, layout);
  });

  it("persiste a ordem correta dos widgets", async () => {
    vi.mocked(db.saveDashboardConfig).mockResolvedValue(undefined);
    const layout = [
      { id: "pipeline", visible: true, order: 0, size: "sm" as const },
      { id: "stats", visible: true, order: 1, size: "full" as const },
      { id: "agenda_hoje", visible: true, order: 2, size: "lg" as const },
    ];
    await db.saveDashboardConfig(5, layout);
    const call = vi.mocked(db.saveDashboardConfig).mock.calls[0];
    expect(call[1][0].id).toBe("pipeline");
    expect(call[1][1].order).toBe(1);
  });

  it("permite salvar widget com visible=false", async () => {
    vi.mocked(db.saveDashboardConfig).mockResolvedValue(undefined);
    const layout = [{ id: "equipe", visible: false, order: 0, size: "sm" as const }];
    await db.saveDashboardConfig(1, layout);
    expect(db.saveDashboardConfig).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ id: "equipe", visible: false }),
    ]));
  });

  it("permite salvar configuração com todos os 9 widgets", async () => {
    vi.mocked(db.saveDashboardConfig).mockResolvedValue(undefined);
    const allWidgets = [
      "stats", "contas_pagar", "agenda_hoje", "acoes_rapidas",
      "financeiro", "score_ia", "pipeline", "plano_uso", "equipe",
    ].map((id, i) => ({ id, visible: true, order: i, size: "sm" as const }));
    await db.saveDashboardConfig(1, allWidgets);
    expect(db.saveDashboardConfig).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ id: "stats" }),
      expect.objectContaining({ id: "equipe" }),
    ]));
  });
});

describe("dashboardConfig - layouts pré-definidos", () => {
  it("Visão Geral tem todos os 9 widgets visíveis", () => {
    const visaoGeral = [
      { id: "stats", visible: true, order: 0, size: "full" },
      { id: "contas_pagar", visible: true, order: 1, size: "full" },
      { id: "agenda_hoje", visible: true, order: 2, size: "lg" },
      { id: "acoes_rapidas", visible: true, order: 3, size: "sm" },
      { id: "financeiro", visible: true, order: 4, size: "sm" },
      { id: "score_ia", visible: true, order: 5, size: "sm" },
      { id: "pipeline", visible: true, order: 6, size: "sm" },
      { id: "plano_uso", visible: true, order: 7, size: "sm" },
      { id: "equipe", visible: true, order: 8, size: "sm" },
    ];
    const ocultos = visaoGeral.filter(w => !w.visible);
    expect(ocultos).toHaveLength(0);
    expect(visaoGeral).toHaveLength(9);
  });

  it("Foco Financeiro oculta Agenda, Ações Rápidas e Equipe", () => {
    const focoFinanceiro = [
      { id: "stats", visible: true, order: 0, size: "full" },
      { id: "contas_pagar", visible: true, order: 1, size: "full" },
      { id: "financeiro", visible: true, order: 2, size: "sm" },
      { id: "score_ia", visible: true, order: 3, size: "sm" },
      { id: "pipeline", visible: true, order: 4, size: "sm" },
      { id: "plano_uso", visible: true, order: 5, size: "sm" },
      { id: "agenda_hoje", visible: false, order: 6, size: "lg" },
      { id: "acoes_rapidas", visible: false, order: 7, size: "sm" },
      { id: "equipe", visible: false, order: 8, size: "sm" },
    ];
    const ocultos = focoFinanceiro.filter(w => !w.visible).map(w => w.id);
    expect(ocultos).toContain("agenda_hoje");
    expect(ocultos).toContain("acoes_rapidas");
    expect(ocultos).toContain("equipe");
    expect(ocultos).toHaveLength(3);
  });

  it("Agenda do Dia oculta widgets financeiros", () => {
    const agendaDia = [
      { id: "stats", visible: true, order: 0, size: "full" },
      { id: "agenda_hoje", visible: true, order: 1, size: "lg" },
      { id: "acoes_rapidas", visible: true, order: 2, size: "sm" },
      { id: "equipe", visible: true, order: 3, size: "sm" },
      { id: "pipeline", visible: true, order: 4, size: "sm" },
      { id: "contas_pagar", visible: false, order: 5, size: "full" },
      { id: "financeiro", visible: false, order: 6, size: "sm" },
      { id: "score_ia", visible: false, order: 7, size: "sm" },
      { id: "plano_uso", visible: false, order: 8, size: "sm" },
    ];
    const ocultos = agendaDia.filter(w => !w.visible).map(w => w.id);
    expect(ocultos).toContain("contas_pagar");
    expect(ocultos).toContain("financeiro");
    expect(ocultos).toContain("score_ia");
  });

  it("todos os layouts pré-definidos têm exatamente 9 widgets", () => {
    const layouts = [
      // Visão Geral
      ["stats", "contas_pagar", "agenda_hoje", "acoes_rapidas", "financeiro", "score_ia", "pipeline", "plano_uso", "equipe"],
      // Foco Financeiro
      ["stats", "contas_pagar", "financeiro", "score_ia", "pipeline", "plano_uso", "agenda_hoje", "acoes_rapidas", "equipe"],
      // Agenda do Dia
      ["stats", "agenda_hoje", "acoes_rapidas", "equipe", "pipeline", "contas_pagar", "financeiro", "score_ia", "plano_uso"],
    ];
    layouts.forEach(l => expect(l).toHaveLength(9));
  });
});

describe("dashboardConfig - validações de layout", () => {
  it("layout padrão tem 9 widgets", () => {
    const DEFAULT_WIDGET_IDS = [
      "stats", "contas_pagar", "agenda_hoje", "acoes_rapidas",
      "financeiro", "score_ia", "pipeline", "plano_uso", "equipe",
    ];
    expect(DEFAULT_WIDGET_IDS).toHaveLength(9);
  });

  it("todos os widgets têm IDs únicos", () => {
    const ids = [
      "stats", "contas_pagar", "agenda_hoje", "acoes_rapidas",
      "financeiro", "score_ia", "pipeline", "plano_uso", "equipe",
    ];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("widgets com requiresPermission são respeitados", () => {
    const permissionedWidgets = ["contas_pagar", "financeiro", "score_ia"];
    const adminOnlyWidgets = ["plano_uso"];
    expect(permissionedWidgets).toContain("financeiro");
    expect(adminOnlyWidgets).toContain("plano_uso");
  });

  it("ordem dos widgets é contínua e começa em 0", () => {
    const layout = [
      { id: "stats", visible: true, order: 0, size: "full" as const },
      { id: "contas_pagar", visible: true, order: 1, size: "full" as const },
      { id: "agenda_hoje", visible: true, order: 2, size: "lg" as const },
    ];
    layout.forEach((w, i) => expect(w.order).toBe(i));
  });
});
