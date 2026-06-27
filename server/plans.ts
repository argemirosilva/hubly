/**
 * Definição dos planos, limites e feature gating do Hubly.
 * Altere os preços e limites aqui para refletir em todo o sistema.
 *
 * Fluxo: Trial (7 dias, acesso total como PRO) → Plano pago (SOLO, PLUS, PRO)
 * O plano FREE foi removido. Novas empresas entram em trial.
 */

export type PlanType = "SOLO" | "PLUS" | "PRO";

// ─── Limites por plano ────────────────────────────────────────────────────────
export const PLAN_LIMITS: Record<PlanType, {
  profissionais: number;          // -1 = ilimitado
  agendamentosMes: number;        // -1 = ilimitado
  notificacoesWhatsappMes: number;
  clientes: number;               // -1 = ilimitado
  servicos: number;               // -1 = ilimitado
  pacotes: number;                // -1 = ilimitado (0 = recurso indisponível)
  automacoes: number;             // -1 = ilimitado
  usuarios: number;               // -1 = ilimitado (system users / membros de equipe)
  alertaPercentual: number;       // % de uso que dispara alerta (ex: 80)
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
  SOLO: {
    profissionais: 1,
    agendamentosMes: -1,
    notificacoesWhatsappMes: 100,
    clientes: -1,
    servicos: 20,
    pacotes: 5,
    automacoes: 5,
    usuarios: 1,
    alertaPercentual: 80,
    iaMarketing: false,
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
    servicos: 50,
    pacotes: 20,
    automacoes: 20,
    usuarios: 3,
    alertaPercentual: 80,
    iaMarketing: false,
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
    servicos: -1,
    pacotes: -1,
    automacoes: -1,
    usuarios: -1,
    alertaPercentual: 80,
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

// ─── Trial ────────────────────────────────────────────────────────────────────
/** Durante o trial, o acesso é equivalente ao PRO (tudo liberado) */
export const TRIAL_PLAN: PlanType = "PRO";
export const TRIAL_DURATION_DAYS = 7;

// ─── Preços ───────────────────────────────────────────────────────────────────
export const PLAN_PRICES: Record<PlanType, {
  monthly: number;
  annual: number;       // preço por mês no plano anual
  annualTotal: number;  // total cobrado no plano anual
  label: string;
  description: string;
}> = {
  SOLO: {
    monthly: 49.00,
    annual: 40.83,
    annualTotal: 490.00,
    label: "Hubly Solo",
    description: "Para profissionais autônomos",
  },
  PLUS: {
    monthly: 149.00,
    annual: 124.17,
    annualTotal: 1490.00,
    label: "Hubly Plus",
    description: "Para salões com pequena equipe",
  },
  PRO: {
    monthly: 299.00,
    annual: 249.17,
    annualTotal: 2990.00,
    label: "Hubly Pro",
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
export function hasFeature(plan: PlanType, feature: keyof typeof PLAN_LIMITS.SOLO): boolean {
  return !!PLAN_LIMITS[plan]?.[feature];
}

/** Verifica se o limite de agendamentos foi atingido */
export function isAgendamentosLimitReached(plan: PlanType, count: number): boolean {
  const limit = PLAN_LIMITS[plan]?.agendamentosMes ?? 0;
  if (limit === -1) return false;
  return count >= limit;
}

/** Verifica se o limite de profissionais foi atingido */
export function isProfissionaisLimitReached(plan: PlanType, count: number): boolean {
  const limit = PLAN_LIMITS[plan]?.profissionais ?? 0;
  if (limit === -1) return false;
  return count >= limit;
}

/** Retorna a porcentagem de uso de agendamentos (0-100) */
export function getAgendamentosUsagePercent(plan: PlanType, count: number): number {
  const limit = PLAN_LIMITS[plan]?.agendamentosMes ?? 0;
  if (limit === -1) return 0;
  return Math.min(100, Math.round((count / limit) * 100));
}

/** Mensagem de erro amigável ao atingir limite */
export function getLimitReachedMessage(plan: PlanType, resource: "agendamentos" | "profissionais"): string {
  if (resource === "agendamentos") {
    const limit = PLAN_LIMITS[plan]?.agendamentosMes ?? 0;
    return `Você atingiu o limite de ${limit} agendamentos este mês no plano ${PLAN_PRICES[plan]?.label ?? plan}. Faça upgrade para continuar agendando sem limites.`;
  }
  const limit = PLAN_LIMITS[plan]?.profissionais ?? 0;
  return `Você atingiu o limite de ${limit} profissional(is) no plano ${PLAN_PRICES[plan]?.label ?? plan}. Faça upgrade para adicionar mais profissionais.`;
}
