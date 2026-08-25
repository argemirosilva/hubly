import { describe, expect, it } from "vitest";
import {
  mapMarketingIdeaToPost,
  marketingIdeasBatchSchema,
  registerSyncInboundRoutes,
} from "./sync-inbound-api";

const baseItem = {
  operation: "upsert" as const,
  externalId: "idea_001",
  updatedAtSource: "2026-08-25T14:29:12.000Z",
  tema: "Como preparar a pele",
  tipo: "dica" as const,
  plataforma: "instagram" as const,
  formato: "reels" as const,
  tags: ["pele", "maquiagem"],
  observacoes: "Ainda sem data.",
  roteiro: "Gancho inicial",
  dataPublicacao: null,
  horarioPublicacao: null,
};

describe("API de sincronização reversa de Marketing", () => {
  it("registra a rota de recebimento", () => {
    const routes: string[] = [];
    registerSyncInboundRoutes({
      post: (path: string) => { routes.push(`POST ${path}`); },
    } as any);
    expect(routes).toContain("POST /api/integrations/v1/sync/marketing-ideas");
  });

  it("aceita lote de ideias e descarta campos inesperados", () => {
    const result = marketingIdeasBatchSchema.parse({
      sourceSystem: "sistema-origem",
      sentAt: "2026-08-25T14:30:00.000Z",
      items: [{ ...baseItem, comandoSql: "DROP TABLE marketing_posts" }],
    });
    expect(result.items[0]).not.toHaveProperty("comandoSql");
  });

  it("mantém ideia sem data fora do calendário", () => {
    const mapped = mapMarketingIdeaToPost(baseItem, 12);
    expect(mapped).toMatchObject({
      empresaId: 12,
      status: "rascunho",
      statusProducao: "planejado",
      dataPublicacao: null,
      horarioPublicacao: null,
      tags: "pele,maquiagem",
    });
  });

  it("leva conteúdo com data para o calendário editorial", () => {
    const mapped = mapMarketingIdeaToPost({
      ...baseItem,
      dataPublicacao: "2026-08-29",
      horarioPublicacao: "19:00",
    }, 12);
    expect(mapped.dataPublicacao).toBe("2026-08-29");
    expect(mapped.horarioPublicacao).toBe("19:00");
  });

  it("bloqueia delete e horário sem data", () => {
    const deleteResult = marketingIdeasBatchSchema.safeParse({
      sourceSystem: "sistema-origem",
      sentAt: "2026-08-25T14:30:00.000Z",
      items: [{ ...baseItem, operation: "delete" }],
    });
    const invalidTime = marketingIdeasBatchSchema.safeParse({
      sourceSystem: "sistema-origem",
      sentAt: "2026-08-25T14:30:00.000Z",
      items: [{ ...baseItem, horarioPublicacao: "19:00" }],
    });
    expect(deleteResult.success).toBe(false);
    expect(invalidTime.success).toBe(false);
  });

  it("limita o lote a 100 itens", () => {
    const result = marketingIdeasBatchSchema.safeParse({
      sourceSystem: "sistema-origem",
      sentAt: "2026-08-25T14:30:00.000Z",
      items: Array.from({ length: 101 }, (_, index) => ({ ...baseItem, externalId: `idea_${index}` })),
    });
    expect(result.success).toBe(false);
  });
});
