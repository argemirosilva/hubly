/**
 * Limites de uso por plano — DERIVADOS de plans.ts (fonte única de verdade).
 *
 * IMPORTANTE: Este arquivo NÃO define mais valores próprios. Ele apenas re-expõe,
 * no formato que db-usage-alerts.ts espera, os limites centralizados em plans.ts.
 * Assim os números de profissionais/clientes/etc. param de divergir entre os dois
 * arquivos (bug anterior: FREE tinha 15 agendamentos em plans.ts e 50 aqui).
 */

import { PLAN_LIMITS as CANONICAL } from "./plans";
import type { PlanType as CanonicalPlanType } from "./plans";

export type PlanType = CanonicalPlanType;

/** Formato consumido por db-usage-alerts.ts (mantém compatibilidade de campos). */
export interface PlanLimitsView {
  clientes: number;
  profissionais: number;
  servicos: number;
  pacotes: number;
  agendamentosPoMes: number; // alias histórico de agendamentosMes
  automacoes: number;
  usuarios: number;
  alertaPercentual: number;
}

function toView(plan: CanonicalPlanType): PlanLimitsView {
  const c = CANONICAL[plan];
  return {
    clientes: c.clientes,
    profissionais: c.profissionais,
    servicos: c.servicos,
    pacotes: c.pacotes,
    agendamentosPoMes: c.agendamentosMes,
    automacoes: c.automacoes,
    usuarios: c.usuarios,
    alertaPercentual: c.alertaPercentual,
  };
}

/** Mapa de limites no formato de visualização (derivado de plans.ts). */
export const PLAN_LIMITS: Record<PlanType, PlanLimitsView> = {
  SOLO: toView("SOLO"),
  PLUS: toView("PLUS"),
  PRO: toView("PRO"),
};

/**
 * Obtém os limites de um plano (formato de visualização).
 */
export function getPlanLimits(plan: PlanType): PlanLimitsView {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.SOLO;
}

/**
 * Verifica se um valor atingiu o limite de alerta.
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
  if (limite === 0) return false;  // Recurso indisponível, não há "uso" a alertar
  const percentualUsado = (atual / limite) * 100;
  return percentualUsado >= alertaPercentual;
}

/**
 * Calcula o percentual de uso
 */
export function calcularPercentualUso(atual: number, limite: number): number {
  if (limite === -1) return 0; // Ilimitado
  if (limite === 0) return 100;
  return Math.round((atual / limite) * 100);
}
