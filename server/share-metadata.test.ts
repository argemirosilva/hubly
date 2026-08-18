import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("metadados de compartilhamento do Hubly", () => {
  const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

  it("usa a mensagem e a imagem oficiais da página pública", () => {
    expect(html).toContain("Hubly — Você no controle");
    expect(html).toContain("https://hubly.orizontech.com.br/manus-storage/hubly-og-share_5bee94a8.png");
    expect(html).toContain("Agenda, clientes, financeiro, automações e marketing em um só lugar");
  });

  it("mantém a URL canônica de compartilhamento no domínio público", () => {
    expect(html).toContain('<meta property="og:url" content="https://hubly.orizontech.com.br/" />');
  });
});
