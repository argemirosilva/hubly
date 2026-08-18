import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import SitePublico from "../client/src/pages/SitePublico";

describe("site público do Hubly", () => {
  it("apresenta a proposta de valor e o caminho para acessar a plataforma", () => {
    const html = renderToStaticMarkup(createElement(SitePublico));

    expect(html).toContain("Seu negócio não precisa ser uma bagunça");
    expect(html).toContain("Começar agora");
    expect(html).toContain('href="/admin"');
    expect(html).toContain("hubly-logo-dark_ecdf0ad5.png");
    expect(html).toContain("Agenda no controle");
    expect(html).toContain("Clique em cada card para ver o que ele resolve no seu dia a dia.");
    expect(html).toContain("Pré-agendamento com sinal e confirmação no fluxo certo");
  });

  it("mantém páginas públicas de apoio para recursos e funcionamento", () => {
    const resources = renderToStaticMarkup(createElement(SitePublico, { page: "recursos" }));
    const workflow = renderToStaticMarkup(createElement(SitePublico, { page: "como-funciona" }));

    expect(resources).toContain("Recursos que trabalham juntos");
    expect(workflow).toContain("Simples desde o primeiro dia");
  });
});
