import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("navegação da análise financeira", () => {
  it("mantém uma rota dedicada e preserva período, visão e recorte no endereço", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const analise = readFileSync(new URL("../client/src/components/AnaliseFinanceiraDetalhada.tsx", import.meta.url), "utf8");

    expect(app).toContain('path="/admin/financeiro/analise"');
    expect(analise).toContain('new URLSearchParams({ visao: proximaVisao, periodo: proximoPeriodo, inicio, fim })');
    expect(analise).toContain('query.set("foco", foco)');
    expect(analise).toContain("paginaDedicada");
    expect(analise).toContain("compacta");
    expect(analise).toContain("Profissional líder");
  });

  it("mantém Relatórios como atalho para a análise, sem duplicar o painel", () => {
    const relatorios = readFileSync(new URL("../client/src/pages/Relatorios.tsx", import.meta.url), "utf8");
    expect(relatorios).toContain("Análise detalhada de vendas");
    expect(relatorios).toContain("/admin/financeiro/analise?visao=servicos&periodo=mes");
  });
});
