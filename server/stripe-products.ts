/**
 * Definição centralizada dos produtos e preços do Stripe para os planos do Hubly.
 * Preços em centavos (BRL).
 * Gerado automaticamente em 2026-04-03T19:44:13.397Z
 */
export interface PlanoStripe {
  nome: string;
  descricao: string;
  mensal: {
    priceId: string | null;
    valorCentavos: number;
  };
  anual: {
    priceId: string | null;
    valorCentavos: number;
  };
}

export const PLANOS_STRIPE: Record<string, PlanoStripe> = {
  SOLO: {
    nome: "Hubly Solo",
    descricao: "Para profissionais autônomos — 1 profissional, agendamentos ilimitados",
    mensal: { priceId: "price_1TIDdSBbN12GNJRM5nsicm99", valorCentavos: 4900 },
    anual:  { priceId: "price_1TIDdTBbN12GNJRMSRPVIgjc", valorCentavos: 49000 },
  },
  PLUS: {
    nome: "Hubly Plus",
    descricao: "Para equipes pequenas — até 5 profissionais, agendamentos ilimitados",
    mensal: { priceId: "price_1TIDdVBbN12GNJRM59VMnBp8", valorCentavos: 14900 },
    anual:  { priceId: "price_1TIDdWBbN12GNJRMfFcdGw2R", valorCentavos: 149000 },
  },
  PRO: {
    nome: "Hubly Pro",
    descricao: "Para salões e clínicas — até 20 profissionais, IA + relatórios avançados",
    mensal: { priceId: "price_1TIDdYBbN12GNJRMhzZ0Vy4f", valorCentavos: 29900 },
    anual:  { priceId: "price_1TIDdYBbN12GNJRMMzn7M81r", valorCentavos: 299000 },
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

/** Converte um Price ID do Stripe para o plan_type do banco */
export function priceIdToPlanType(priceId: string): "FREE" | "SOLO" | "PLUS" | "PRO" {
  if (priceId === PLANOS_STRIPE.SOLO.mensal.priceId) return "SOLO";
  if (priceId === PLANOS_STRIPE.SOLO.anual.priceId) return "SOLO";
  if (priceId === PLANOS_STRIPE.PLUS.mensal.priceId) return "PLUS";
  if (priceId === PLANOS_STRIPE.PLUS.anual.priceId) return "PLUS";
  if (priceId === PLANOS_STRIPE.PRO.mensal.priceId) return "PRO";
  if (priceId === PLANOS_STRIPE.PRO.anual.priceId) return "PRO";
  return "SOLO";
}
