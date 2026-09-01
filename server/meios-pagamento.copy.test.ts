import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("linguagem de meios de pagamento", () => {
  it("usa profissional nos descontos exibidos para a pessoa que atende", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/MeiosPagamento.tsx"), "utf8");

    expect(source).toContain("Descontar do profissional");
    expect(source).toContain("comissão do profissional");
    expect(source).not.toContain("Descontar do atendente");
    expect(source).not.toContain("comissão do atendente");
  });
});
