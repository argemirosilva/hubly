/**
 * Limites de uso por plano
 * Define quantos clientes, profissionais, serviços, etc. cada plano permite
 */

export const PLAN_LIMITS = {
  FREE: {
    clientes: 10,
    profissionais: 1,
    servicos: 5,
    pacotes: 0,
    agendamentosPoMes: 50,
    automacoes: 0,
    usuarios: 1,
    alertaPercentual: 80, // Alerta quando atingir 80% do limite
  },
  SOLO: {
    clientes: 50,
    profissionais: 1,
    servicos: 20,
    pacotes: 5,
    agendamentosPoMes: 500,
    automacoes: 5,
    usuarios: 1,
    alertaPercentual: 80,
  },
  PLUS: {
    clientes: 200,
    profissionais: 5,
    servicos: 50,
    pacotes: 20,
    agendamentosPoMes: 2000,
    automacoes: 20,
    usuarios: 3,
    alertaPercentual: 80,
  },
  PRO: {
    clientes: -1, // Ilimitado
    profissionais: -1,
    servicos: -1,
    pacotes: -1,
    agendamentosPoMes: -1,
    automacoes: -1,
    usuarios: -1,
    alertaPercentual: 80,
  },
};

export type PlanType = keyof typeof PLAN_LIMITS;

/**
 * Obtém os limites de um plano
 */
export function getPlanLimits(plan: PlanType) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

/**
 * Verifica se um valor atingiu o limite de alerta
 * @param atual Valor atual
 * @param limite Limite máximo (-1 = ilimitado)
 * @param alertaPercentual Percentual para disparar alerta (padrão 80%)
 */
export function verificarAlerta(
  atual: number,
  limite: number,
  alertaPercentual: number = 80
): boolean {
  if (limite === -1) return false; // Ilimitado, sem alerta
  const percentualUsado = (atual / limite) * 100;
  return percentualUsado >= alertaPercentual;
}

/**
 * Calcula o percentual de uso
 */
export function calcularPercentualUso(atual: number, limite: number): number {
  if (limite === -1) return 0; // Ilimitado
  return Math.round((atual / limite) * 100);
}
