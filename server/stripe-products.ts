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
 */
export const PLANOS_STRIPE: Record<string, PlanoStripe> = {
  SOLO: {
    nome: "Agendei Solo",
    descricao: "Para profissionais autônomos — 1 profissional, agendamentos ilimitados",
    mensal: { priceId: "price_1THohRPqe8KEHF80W5mlUk0L", valorCentavos: 2990 },  // R$ 29,90/mês
    anual:  { priceId: "price_1THojAPqe8KEHF80Z6ieVPaV", valorCentavos: 23300 },  // R$ 233,00/ano (≈ R$ 19,42/mês)
  },
  PLUS: {
    nome: "Agendei Plus",
    descricao: "Para equipes pequenas — até 8 profissionais, agendamentos ilimitados",
    mensal: { priceId: "price_1THoo5Pqe8KEHF80Lv3vxmvJ", valorCentavos: 5990 },  // R$ 59,90/mês
    anual:  { priceId: "price_1THoo5Pqe8KEHF80QY6il6zl", valorCentavos: 46700 },  // R$ 467,00/ano (≈ R$ 38,92/mês)
  },
  PRO: {
    nome: "Agendei Pro",
    descricao: "Para salões e clínicas — até 20 profissionais, IA + relatórios avançados",
    mensal: { priceId: "price_1THosnPqe8KEHF80AVFlG4kq", valorCentavos: 11990 }, // R$ 119,90/mês
    anual:  { priceId: "price_1THorIPqe8KEHF80cubUcV1P", valorCentavos: 93500 },  // R$ 935,00/ano (≈ R$ 77,92/mês)
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
