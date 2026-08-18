import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import SitePublico from "../client/src/pages/SitePublico";

describe("site público do Hubly", () => {
  it("apresenta a proposta de valor e o caminho para acessar a plataforma", () => {
    const html = renderToStaticMarkup(createElement(SitePublico));

    expect(html).toContain("Seu negócio não precisa ser uma bagunça");
    expect(html).toContain("Entrar");
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/assinaturas"');
    expect(html).toContain("hubly-icon-gold_40021193.png");
    expect(html).toContain("Agenda no controle");
    expect(html).toContain("Clique em cada card para ver o que ele resolve no seu dia a dia.");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="recurso-agenda-no-controle"');
    expect(html).toContain('href="/solucoes/agenda"');
    expect(html).toContain('href="/solucoes/marketing"');
  });

  it("mantém páginas públicas de apoio para recursos e funcionamento", () => {
    const resources = renderToStaticMarkup(createElement(SitePublico, { page: "recursos" }));
    const workflow = renderToStaticMarkup(createElement(SitePublico, { page: "como-funciona" }));

    expect(resources).toContain("Recursos que trabalham juntos");
    expect(workflow).toContain("Simples desde o primeiro dia");
  });

  it("apresenta páginas específicas para cada solução pública", () => {
    const agenda = renderToStaticMarkup(createElement(SitePublico, { topic: "agenda" }));
    const marketing = renderToStaticMarkup(createElement(SitePublico, { topic: "marketing" }));

    expect(agenda).toContain("Seu dia deixa de depender da memória.");
    expect(marketing).toContain("Transforme ideias em conteúdo sem perder o ritmo de postagem.");
  });
});
