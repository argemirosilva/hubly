import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Marketing sem geracao de imagens", () => {
  it("remove a opcao da interface e preserva imagens cadastradas", () => {
    const source = readFileSync(resolve("client/src/pages/IAMarketing.tsx"), "utf8");
    expect(source).not.toMatch(/gerarImagem|imagemGerada|imagemPrompt|Gerar Imagem com IA/);
    expect(source).toContain("post.imagemUrl");
    expect(source).toContain("Gerar Post com IA");
  });
  it("remove a rota e o pedido de prompt visual sem apagar dados historicos", () => {
    const source = readFileSync(resolve("server/routers/iaMarketing.ts"), "utf8");
    expect(source).not.toMatch(/gerarImagem:|images\.generate|getOpenAIClient|DALL-E|resultado\.imagemPrompt/);
    expect(source).toContain("gerarPost:");
    expect(source).toContain("invokeOpenAIJson");
  });
});
