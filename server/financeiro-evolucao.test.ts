import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { criarSerieEvolucaoRecebimentos } from "../shared/financeiroEvolucao";

describe("criarSerieEvolucaoRecebimentos", () => {
  it("preenche os dias do período e soma somente as baixas dentro do intervalo", () => {
    const serie = criarSerieEvolucaoRecebimentos([
      { data: "2026-09-01", valor: "100.50" },
      { data: "2026-09-01T18:00:00.000Z", valor: 50 },
      { data: "2026-09-03", valor: 25 },
      { data: "2026-08-31", valor: 99 },
    ], "2026-09-01", "2026-09-03");

    expect(serie).toEqual([
      { chave: "2026-09-01", rotulo: "01/09", recebido: 150.5, quantidade: 2 },
      { chave: "2026-09-02", rotulo: "02/09", recebido: 0, quantidade: 0 },
      { chave: "2026-09-03", rotulo: "03/09", recebido: 25, quantidade: 1 },
    ]);
  });

  it("agrupa por mês em períodos longos para manter o gráfico legível", () => {
    const serie = criarSerieEvolucaoRecebimentos([
      { data: "2026-01-31", valor: 50 },
      { data: "2026-02-01", valor: 75 },
      { data: "2026-03-18", valor: 25 },
    ], "2026-01-01", "2026-03-31");

    expect(serie).toEqual([
      { chave: "2026-01", rotulo: "Jan/26", recebido: 50, quantidade: 1 },
      { chave: "2026-02", rotulo: "Fev/26", recebido: 75, quantidade: 1 },
      { chave: "2026-03", rotulo: "Mar/26", recebido: 25, quantidade: 1 },
    ]);
  });

  it("mantém o gráfico no panorama financeiro com filtro próprio e movimento acessível", () => {
    const tela = readFileSync(new URL("../client/src/pages/Financeiro.tsx", import.meta.url), "utf8");

    expect(tela).toContain("Evolução dos recebimentos");
    expect(tela).toContain("trpc.analiseFinanceira.resumo.useQuery");
    expect(tela).toContain("aplicarPeriodoEvolucao");
    expect(tela).toContain("isAnimationActive={animarGrafico}");
    expect(tela).toContain("HUBLY_MOTION.chartDurationMs");
  });
});
