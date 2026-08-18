import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryState = vi.hoisted(() => ({
  value: {
    data: [
      {
        type: "SOLO",
        label: "Hubly Solo",
        description: "Para profissionais autônomos",
        monthly: 49,
        annual: 40.83,
        annualTotal: 490,
        limits: { profissionais: 1, notificacoesWhatsappMes: 100, usuarios: 1, pacotesServicos: true, comissoes: true, relatoriosAvancados: true, multiplosCaixas: false, portalCliente: true, iaFinanceira: false, iaMarketing: false, iaTotal: false },
      },
      {
        type: "PLUS",
        label: "Hubly Plus",
        description: "Para salões com pequena equipe",
        monthly: 149,
        annual: 124.17,
        annualTotal: 1490,
        limits: { profissionais: 5, notificacoesWhatsappMes: 400, usuarios: 3, pacotesServicos: true, comissoes: true, relatoriosAvancados: true, multiplosCaixas: true, portalCliente: true, iaFinanceira: true, iaMarketing: false, iaTotal: false },
      },
      {
        type: "PRO",
        label: "Hubly Pro",
        description: "Para redes e empresas em crescimento",
        monthly: 299,
        annual: 249.17,
        annualTotal: 2990,
        limits: { profissionais: 20, notificacoesWhatsappMes: 1000, usuarios: -1, pacotesServicos: true, comissoes: true, relatoriosAvancados: true, multiplosCaixas: true, portalCliente: true, iaFinanceira: true, iaMarketing: true, iaTotal: true },
      },
    ],
    isLoading: false,
    isError: false,
  } as { data: unknown[] | undefined; isLoading: boolean; isError: boolean },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { planos: { getPlans: { useQuery: () => queryState.value } } },
}));

import AssinaturasPublicas from "../client/src/pages/AssinaturasPublicas";

describe("página pública de assinaturas", () => {
  beforeEach(() => {
    queryState.value = {
      data: queryState.value.data,
      isLoading: false,
      isError: false,
    };
  });

  it("apresenta os três planos, valores oficiais, detalhes e chamadas para iniciar o teste", () => {
    const html = renderToStaticMarkup(createElement(AssinaturasPublicas));

    expect(html).toContain("Hubly Solo");
    expect(html).toContain("Hubly Plus");
    expect(html).toContain("Hubly Pro");
    expect(html).toContain("R$ 49,00");
    expect(html).toContain("R$ 149,00");
    expect(html).toContain("R$ 299,00");
    expect(html).toContain("100 notificações WhatsApp/mês");
    expect(html).toContain("IA Financeira, Clientes e Marketing");
    expect(html).toContain("Começar 7 dias grátis");
    expect(html).toContain('href="/admin"');
  });

  it("mostra uma indicação clara enquanto o catálogo está carregando", () => {
    queryState.value = { data: undefined, isLoading: true, isError: false };

    const html = renderToStaticMarkup(createElement(AssinaturasPublicas));

    expect(html).toContain("Carregando opções de assinatura...");
  });

  it("mostra uma mensagem de recuperação se o catálogo estiver indisponível", () => {
    queryState.value = { data: undefined, isLoading: false, isError: true };

    const html = renderToStaticMarkup(createElement(AssinaturasPublicas));

    expect(html).toContain("Não foi possível carregar os planos agora.");
  });
});
