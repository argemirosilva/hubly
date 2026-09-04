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
    expect(html).toContain('href="/cadastro"');
    expect(html).toContain('href="/assinaturas"');
    expect(html).toContain("hubly-icon-gold.png");
    expect(html).toContain("hubly-agenda-finance-dashboard_e7009168.jpg");
    expect(html).toContain("Agenda, resultados e financeiro no mesmo lugar");
    expect(html).toContain("Agenda no controle");
    expect(html).toContain("Clique em cada card para ver o que ele resolve no seu dia a dia.");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="recurso-agenda-no-controle"');
    expect(html).toContain('href="/solucoes/agenda"');
    expect(html).toContain('href="/solucoes/marketing"');
    expect(html).toContain("Perguntas frequentes");
    expect(html).toContain("O que a IA Financeira faz no Hubly?");
    expect(html).toContain("Consigo organizar ideias e roteiros de posts?");
    expect(html).toContain("Meus clientes conseguem agendar online?");
    expect(html).toContain("Dá para vender e acompanhar pacotes de serviços?");
    expect(html).toContain("Funciona bem no celular?");
  });

  it("mantém páginas públicas de apoio para recursos e funcionamento", () => {
    const resources = renderToStaticMarkup(createElement(SitePublico, { page: "recursos" }));
    const workflow = renderToStaticMarkup(createElement(SitePublico, { page: "como-funciona" }));

    expect(resources).toContain("Recursos que trabalham juntos");
    expect(workflow).toContain("Você organiza a rotina. O Hubly mostra o que merece sua atenção.");
    expect(workflow).toContain("IA Financeira");
    expect(workflow).toContain("Marketing que sai da ideia e chega à postagem");
  });

  it("apresenta páginas específicas para cada solução pública", () => {
    const agenda = renderToStaticMarkup(createElement(SitePublico, { topic: "agenda" }));
    const marketing = renderToStaticMarkup(createElement(SitePublico, { topic: "marketing" }));

    expect(agenda).toContain("Seu dia deixa de depender da memória.");
    expect(marketing).toContain("Transforme ideias em conteúdo sem perder o ritmo de postagem.");
  });
});
