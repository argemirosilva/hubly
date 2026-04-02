/**
 * Definição dos planos, limites e feature gating do Agendei.
 * Altere os preços e limites aqui para refletir em todo o sistema.
 */

export type PlanType = "FREE" | "SOLO" | "PLUS" | "PRO";

// ─── Limites por plano ────────────────────────────────────────────────────────
export const PLAN_LIMITS: Record<PlanType, {
  profissionais: number;          // -1 = ilimitado
  agendamentosMes: number;        // -1 = ilimitado
  notificacoesWhatsappMes: number;
  clientes: number;               // -1 = ilimitado
  iaMarketing: boolean;
  iaFinanceira: boolean;
  iaTotal: boolean;
  linkPersonalizado: boolean;
  pacotesServicos: boolean;
  comissoes: boolean;
  relatoriosAvancados: boolean;
  multiplosCaixas: boolean;
  portalCliente: boolean;
}> = {
  FREE: {
    profissionais: 1,
    agendamentosMes: 15,
    notificacoesWhatsappMes: 10,
    clientes: 50,
    iaMarketing: false,
    iaFinanceira: false,
    iaTotal: false,
    linkPersonalizado: false,
    pacotesServicos: false,
    comissoes: false,
    relatoriosAvancados: false,
    multiplosCaixas: false,
    portalCliente: false,
  },
  SOLO: {
    profissionais: 1,
    agendamentosMes: -1,
    notificacoesWhatsappMes: 100,
    clientes: -1,
    iaMarketing: true,
    iaFinanceira: false,
    iaTotal: false,
    linkPersonalizado: true,
    pacotesServicos: true,
    comissoes: true,
    relatoriosAvancados: true,
    multiplosCaixas: false,
    portalCliente: true,
  },
  PLUS: {
    profissionais: 5,
    agendamentosMes: -1,
    notificacoesWhatsappMes: 400,
    clientes: -1,
    iaMarketing: true,
    iaFinanceira: true,
    iaTotal: false,
    linkPersonalizado: true,
    pacotesServicos: true,
    comissoes: true,
    relatoriosAvancados: true,
    multiplosCaixas: true,
    portalCliente: true,
  },
  PRO: {
    profissionais: 20,
    agendamentosMes: -1,
    notificacoesWhatsappMes: 1000,
    clientes: -1,
    iaMarketing: true,
    iaFinanceira: true,
    iaTotal: true,
    linkPersonalizado: true,
    pacotesServicos: true,
    comissoes: true,
    relatoriosAvancados: true,
    multiplosCaixas: true,
    portalCliente: true,
  },
};

// ─── Preços ───────────────────────────────────────────────────────────────────
export const PLAN_PRICES: Record<PlanType, {
  monthly: number;
  annual: number;       // preço por mês no plano anual
  annualTotal: number;  // total cobrado no plano anual
  label: string;
  description: string;
}> = {
  FREE: {
    monthly: 0,
    annual: 0,
    annualTotal: 0,
    label: "Free",
    description: "Para começar sem compromisso",
  },
  SOLO: {
    monthly: 29.90,
    annual: 19.42,
    annualTotal: 233.00,
    label: "Solo",
    description: "Para profissionais autônomos",
  },
  PLUS: {
    monthly: 69.90,
    annual: 45.40,
    annualTotal: 544.80,
    label: "Plus",
    description: "Para salões com pequena equipe",
  },
  PRO: {
    monthly: 129.90,
    annual: 84.40,
    annualTotal: 1012.80,
    label: "Pro",
    description: "Para redes e empresas em crescimento",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna o mês/ano atual no formato "YYYY-MM" */
export function getMesAnoAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Verifica se um plano tem acesso a uma feature */
export function hasFeature(plan: PlanType, feature: keyof typeof PLAN_LIMITS.FREE): boolean {
  return !!PLAN_LIMITS[plan][feature];
}

/** Verifica se o limite de agendamentos foi atingido */
export function isAgendamentosLimitReached(plan: PlanType, count: number): boolean {
  const limit = PLAN_LIMITS[plan].agendamentosMes;
  if (limit === -1) return false;
  return count >= limit;
}

/** Verifica se o limite de profissionais foi atingido */
export function isProfissionaisLimitReached(plan: PlanType, count: number): boolean {
  const limit = PLAN_LIMITS[plan].profissionais;
  if (limit === -1) return false;
  return count >= limit;
}

/** Retorna a porcentagem de uso de agendamentos (0-100) */
export function getAgendamentosUsagePercent(plan: PlanType, count: number): number {
  const limit = PLAN_LIMITS[plan].agendamentosMes;
  if (limit === -1) return 0;
  return Math.min(100, Math.round((count / limit) * 100));
}

/** Mensagem de erro amigável ao atingir limite */
export function getLimitReachedMessage(plan: PlanType, resource: "agendamentos" | "profissionais"): string {
  if (resource === "agendamentos") {
    const limit = PLAN_LIMITS[plan].agendamentosMes;
    return `Você atingiu o limite de ${limit} agendamentos este mês no plano ${PLAN_PRICES[plan].label}. Faça upgrade para continuar agendando sem limites.`;
  }
  const limit = PLAN_LIMITS[plan].profissionais;
  return `Você atingiu o limite de ${limit} profissional(is) no plano ${PLAN_PRICES[plan].label}. Faça upgrade para adicionar mais profissionais.`;
}
