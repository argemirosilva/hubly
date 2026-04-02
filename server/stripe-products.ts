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
    mensal: { priceId: "price_1THsO8LUFOvpH4vDPedJXKt4", valorCentavos: 4900 },  // R$ 49,00/mês
    anual:  { priceId: "price_1THsOELUFOvpH4vDrZQ2cdqQ", valorCentavos: 49000 },  // R$ 490,00/ano
  },
  PLUS: {
    nome: "Agendei Plus",
    descricao: "Para equipes pequenas — até 8 profissionais, agendamentos ilimitados",
    mensal: { priceId: "price_1THsObLUFOvpH4vDkzHLfhbx", valorCentavos: 14900 },  // R$ 149,00/mês
    anual:  { priceId: "price_1THsOcLUFOvpH4vDh7jqFqbH", valorCentavos: 149000 },  // R$ 1.490,00/ano
  },
  PRO: {
    nome: "Agendei Pro",
    descricao: "Para salões e clínicas — até 20 profissionais, IA + relatórios avançados",
    mensal: { priceId: "price_1THsOqLUFOvpH4vDP6JGnszg", valorCentavos: 29900 }, // R$ 299,00/mês
    anual:  { priceId: "price_1THsOrLUFOvpH4vDvKI97lcp", valorCentavos: 299000 },  // R$ 2.990,00/ano
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
