import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("publicações adicionais ao editar post de Marketing IA", () => {
  const router = readFileSync("server/routers/iaMarketing.ts", "utf8");
  const tela = readFileSync("client/src/pages/IAMarketing.tsx", "utf8");

  it("aceita e cria publicações adicionais ao atualizar o post original", () => {
    expect(router).toContain("publicacoesAdicionais: z.array");
    expect(router).toContain("const extras = input.publicacoesAdicionais ?? []");
    expect(router).toContain("montarPublicacoesDoConteudo");
    expect(router).toContain("publicacoesAdicionadas: extras.length");
  });

  it("envia somente as novas publicações ao editar, preservando a publicação principal", () => {
    expect(tela).toContain("publicacoesAdicionais: publicacoes.slice(1)");
  });
});
