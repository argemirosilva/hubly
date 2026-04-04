/**
 * Testes para o endpoint getMetricasJornada (Fase 2 - Painel de Jornada ao Vivo)
 * Verifica a lógica de agregação de métricas e construção do feed de eventos.
 */

import { describe, it, expect } from "vitest";

// ─── Helpers locais (replicam a lógica do endpoint) ──────────────────────────

function calcularDesde(periodo: "24h" | "7d" | "30d"): Date {
  const horasPorPeriodo: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };
  const horas = horasPorPeriodo[periodo] ?? 168;
  return new Date(Date.now() - horas * 60 * 60 * 1000);
}

function filtrarPorPeriodo(
  rows: { status: string; criadoEm: Date }[],
  periodo: "24h" | "7d" | "30d"
) {
  const desde = calcularDesde(periodo);
  return rows.filter(r => r.criadoEm >= desde);
}

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

describe("filtrarPorPeriodo", () => {
  const now = new Date();
  const h1ago = new Date(now.getTime() - 1 * 60 * 60 * 1000);   // 1h atrás
  const h25ago = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25h atrás
  const d8ago = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 dias atrás

  const rows = [
    { status: "enviado", criadoEm: h1ago },
    { status: "falhou",  criadoEm: h25ago },
    { status: "enviado", criadoEm: d8ago },
  ];

  it("24h: retorna apenas eventos das últimas 24h", () => {
    const result = filtrarPorPeriodo(rows, "24h");
    expect(result).toHaveLength(1);
    expect(result[0].criadoEm).toBe(h1ago);
  });

  it("7d: retorna eventos dos últimos 7 dias", () => {
    const result = filtrarPorPeriodo(rows, "7d");
    expect(result).toHaveLength(2); // 1h e 25h atrás
  });

  it("30d: retorna todos os eventos dos últimos 30 dias", () => {
    const result = filtrarPorPeriodo(rows, "30d");
    expect(result).toHaveLength(3);
  });
});

describe("contarFalhasRecentes – lógica local", () => {
  function contarFalhas(rows: { status: string; criadoEm: Date }[], horas = 24): number {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
    return rows.filter(r => r.status === "falhou" && r.criadoEm >= desde).length;
  }

  const now = new Date();
  const h1ago = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const h25ago = new Date(now.getTime() - 25 * 60 * 60 * 1000);

  it("conta apenas falhas dentro das últimas 24h", () => {
    const rows = [
      { status: "falhou",  criadoEm: h1ago },
      { status: "falhou",  criadoEm: h25ago },
      { status: "enviado", criadoEm: h1ago },
    ];
    expect(contarFalhas(rows, 24)).toBe(1);
  });

  it("retorna 0 quando não há falhas recentes", () => {
    const rows = [{ status: "enviado", criadoEm: h1ago }];
    expect(contarFalhas(rows, 24)).toBe(0);
  });

  it("retorna 0 para array vazio", () => {
    expect(contarFalhas([], 24)).toBe(0);
  });
});
