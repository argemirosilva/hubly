/**
 * Testes para o endpoint getMetricasJornada (Fase 2 - Painel de Jornada ao Vivo)
 * Verifica a lógica de agregação de métricas e construção do feed de eventos.
 */

import { describe, it, expect } from "vitest";

// ─── Helpers locais (replicam a lógica do endpoint) ──────────────────────────

const LABELS: Record<string, { label: string; cor: string; emoji: string }> = {
  enviado:      { label: "Enviados",    cor: "#22c55e", emoji: "✅" },
  pendente:     { label: "Pendentes",   cor: "#f59e0b", emoji: "⏳" },
  falhou:       { label: "Com falha",   cor: "#ef4444", emoji: "❌" },
  desconhecido: { label: "Outros",      cor: "#a78bfa", emoji: "❓" },
};

function buildMetricas(rows: { status: string }[]) {
  const contadores: Record<string, number> = {};
  for (const row of rows) {
    const key = row.status ?? "desconhecido";
    contadores[key] = (contadores[key] ?? 0) + 1;
  }
  return Object.entries(contadores).map(([status, total]) => ({
    status,
    total,
    label: LABELS[status]?.label ?? status,
    cor: LABELS[status]?.cor ?? "#6b7280",
    emoji: LABELS[status]?.emoji ?? "•",
  }));
}

function buildFeed(rows: {
  id: number;
  clienteNome: string | null;
  automacaoNome: string | null;
  canal: string;
  status: string;
  criadoEm: Date;
}[]) {
  return rows.slice(0, 30).map((row) => ({
    id: row.id,
    clienteNome: row.clienteNome ?? "Cliente",
    automacaoNome: row.automacaoNome ?? "Automação",
    canal: row.canal ?? "whatsapp",
    status: row.status ?? "desconhecido",
    criadoEm: row.criadoEm,
    emoji: LABELS[row.status ?? "desconhecido"]?.emoji ?? "•",
  }));
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("getMetricasJornada – buildMetricas", () => {
  it("retorna array vazio quando não há rows", () => {
    const result = buildMetricas([]);
    expect(result).toEqual([]);
  });

  it("conta corretamente cada status", () => {
    const rows = [
      { status: "enviado" },
      { status: "enviado" },
      { status: "falhou" },
      { status: "pendente" },
    ];
    const result = buildMetricas(rows);

    const enviado = result.find((m) => m.status === "enviado");
    const falhou  = result.find((m) => m.status === "falhou");
    const pendente = result.find((m) => m.status === "pendente");

    expect(enviado?.total).toBe(2);
    expect(falhou?.total).toBe(1);
    expect(pendente?.total).toBe(1);
  });

  it("aplica os labels e cores corretos para status conhecidos", () => {
    const result = buildMetricas([{ status: "enviado" }]);
    const m = result[0];
    expect(m.label).toBe("Enviados");
    expect(m.cor).toBe("#22c55e");
    expect(m.emoji).toBe("✅");
  });

  it("usa fallback para status desconhecido", () => {
    const result = buildMetricas([{ status: "cancelado" }]);
    const m = result[0];
    expect(m.label).toBe("cancelado"); // sem label mapeado → usa o próprio status
    expect(m.cor).toBe("#6b7280");
    expect(m.emoji).toBe("•");
  });
});

describe("getMetricasJornada – buildFeed", () => {
  const now = new Date();

  it("retorna array vazio quando não há rows", () => {
    expect(buildFeed([])).toEqual([]);
  });

  it("limita o feed a 30 itens", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      clienteNome: `Cliente ${i}`,
      automacaoNome: `Automação ${i}`,
      canal: "whatsapp",
      status: "enviado",
      criadoEm: now,
    }));
    expect(buildFeed(rows)).toHaveLength(30);
  });

  it("usa fallback 'Cliente' quando clienteNome é null", () => {
    const rows = [{
      id: 1,
      clienteNome: null,
      automacaoNome: "Teste",
      canal: "whatsapp",
      status: "enviado",
      criadoEm: now,
    }];
    expect(buildFeed(rows)[0].clienteNome).toBe("Cliente");
  });

  it("usa fallback 'Automação' quando automacaoNome é null", () => {
    const rows = [{
      id: 1,
      clienteNome: "João",
      automacaoNome: null,
      canal: "whatsapp",
      status: "enviado",
      criadoEm: now,
    }];
    expect(buildFeed(rows)[0].automacaoNome).toBe("Automação");
  });

  it("mapeia o emoji correto para cada status", () => {
    const cases: { status: string; expectedEmoji: string }[] = [
      { status: "enviado",  expectedEmoji: "✅" },
      { status: "falhou",   expectedEmoji: "❌" },
      { status: "pendente", expectedEmoji: "⏳" },
    ];
    for (const { status, expectedEmoji } of cases) {
      const rows = [{ id: 1, clienteNome: "X", automacaoNome: "Y", canal: "whatsapp", status, criadoEm: now }];
      expect(buildFeed(rows)[0].emoji).toBe(expectedEmoji);
    }
  });
});
