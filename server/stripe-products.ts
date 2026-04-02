/**
 * Definição centralizada dos produtos e preços do Stripe para os planos do Agendei.
 * Preços em centavos (BRL).
 */

export interface PlanoStripe {
  nome: string;
  descricao: string;
  mensal: {
    priceId: string | null; // null = ainda não criado no Stripe
    valorCentavos: number;
  };
  anual: {
    priceId: string | null;
    valorCentavos: number; // valor total anual
  };
}

/**
 * Mapeamento dos planos para os Price IDs do Stripe.
 * Os Price IDs são criados programaticamente na primeira execução
 * e depois armazenados como variáveis de ambiente ou no banco.
 * Por ora, usamos os valores de referência e criamos via API.
 */
export const PLANOS_STRIPE: Record<string, PlanoStripe> = {
  SOLO: {
    nome: "Agendei Solo",
    descricao: "Para profissionais autônomos — 1 profissional, agendamentos ilimitados",
    mensal: { priceId: null, valorCentavos: 2990 },  // R$ 29,90/mês
    anual:  { priceId: null, valorCentavos: 23300 },  // R$ 233,00/ano (≈ R$ 19,42/mês)
  },
  PLUS: {
    nome: "Agendei Plus",
    descricao: "Para equipes pequenas — até 8 profissionais, agendamentos ilimitados",
    mensal: { priceId: null, valorCentavos: 5990 },  // R$ 59,90/mês
    anual:  { priceId: null, valorCentavos: 46700 },  // R$ 467,00/ano (≈ R$ 38,92/mês)
  },
  PRO: {
    nome: "Agendei Pro",
    descricao: "Para salões e clínicas — até 20 profissionais, IA + relatórios avançados",
    mensal: { priceId: null, valorCentavos: 11990 }, // R$ 119,90/mês
    anual:  { priceId: null, valorCentavos: 93500 },  // R$ 935,00/ano (≈ R$ 77,92/mês)
  },
};

/** Mapeia plan_type do banco para a chave do PLANOS_STRIPE */
export function planTypeToStripeKey(planType: string): string | null {
  const map: Record<string, string> = {
    SOLO: "SOLO",
    PLUS: "PLUS",
    PRO: "PRO",
  };
  return map[planType] ?? null;
}
