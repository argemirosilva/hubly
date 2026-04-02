/**
 * Sistema de alertas de uso de recursos
 * Envia notificações push (via Manus) quando o uso atinge 80% ou 95% dos limites.
 * Utiliza a tabela usage_alerts para cooldown de 24h por tipo de alerta.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { usageAlerts } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { getMesAnoAtual, PLAN_LIMITS, PLAN_PRICES } from "./plans";
import type { PlanType } from "./plans";

const COOLDOWN_HOURS = 24;

type AlertType =
  | "agendamentos_80"
  | "agendamentos_95"
  | "whatsapp_80"
  | "whatsapp_95";

/** Verifica se um alerta já foi enviado no período de cooldown */
async function wasAlertSentRecently(
  empresaId: number,
  alertType: AlertType,
  mesAno: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Fail safe: não enviar se DB indisponível

  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);

  const existing = await db
    .select()
    .from(usageAlerts)
    .where(
      and(
        eq(usageAlerts.empresaId, empresaId),
        eq(usageAlerts.alertType, alertType),
        eq(usageAlerts.mesAno, mesAno)
      )
    )
    .limit(1);

  if (existing.length === 0) return false;

  // Verificar se foi enviado nas últimas 24h
  return existing[0].sentAt > cutoff;
}

/** Registra que um alerta foi enviado */
async function recordAlert(
  empresaId: number,
  alertType: AlertType,
  mesAno: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Upsert: deletar registro antigo e inserir novo
  await db
    .delete(usageAlerts)
    .where(
      and(
        eq(usageAlerts.empresaId, empresaId),
        eq(usageAlerts.alertType, alertType),
        eq(usageAlerts.mesAno, mesAno)
      )
    );

  await db.insert(usageAlerts).values({
    empresaId,
    alertType,
    mesAno,
    sentAt: new Date(),
  });
}

/** Formata a mensagem de notificação */
function buildAlertMessage(
  plan: PlanType,
  resource: "agendamentos" | "whatsapp",
  percent: number,
  count: number,
  limit: number,
  empresaNome: string
): { title: string; content: string } {
  const planLabel = PLAN_PRICES[plan].label;
  const resourceLabel = resource === "agendamentos" ? "agendamentos" : "notificações WhatsApp";
  const emoji = percent >= 95 ? "🚨" : "⚠️";
  const urgency = percent >= 95 ? "CRÍTICO" : "Atenção";

  return {
    title: `${emoji} ${urgency}: ${percent}% do limite de ${resourceLabel} usado`,
    content: [
      `Empresa: ${empresaNome}`,
      `Plano: ${planLabel}`,
      `Recurso: ${resourceLabel}`,
      `Uso atual: ${count} de ${limit} (${percent}%)`,
      ``,
      percent >= 95
        ? `⚠️ Você está prestes a atingir o limite! Ao atingir 100%, novos ${resourceLabel} serão bloqueados.`
        : `Considere fazer upgrade do plano para evitar interrupções.`,
      ``,
      `Acesse o painel em /admin/planos para ver as opções de upgrade.`,
    ].join("\n"),
  };
}

export interface UsageCheckInput {
  empresaId: number;
  empresaNome: string;
  plan: PlanType;
  agendamentosCount: number;
  notificacoesWhatsappCount: number;
}

/**
 * Verifica o uso atual e envia notificações se necessário.
 * Deve ser chamado após cada incremento de uso.
 */
export async function checkAndNotifyUsageLimits(
  input: UsageCheckInput
): Promise<void> {
  const { empresaId, empresaNome, plan, agendamentosCount, notificacoesWhatsappCount } = input;
  const limits = PLAN_LIMITS[plan];
  const mesAno = getMesAnoAtual();

  // ── Verificar agendamentos ──────────────────────────────────────────────────
  if (limits.agendamentosMes !== -1 && limits.agendamentosMes > 0) {
    const agendamentosPercent = Math.round(
      (agendamentosCount / limits.agendamentosMes) * 100
    );

    if (agendamentosPercent >= 95) {
      const alreadySent = await wasAlertSentRecently(empresaId, "agendamentos_95", mesAno);
      if (!alreadySent) {
        const msg = buildAlertMessage(
          plan, "agendamentos", agendamentosPercent,
          agendamentosCount, limits.agendamentosMes, empresaNome
        );
        const sent = await notifyOwner(msg).catch(() => false);
        if (sent) await recordAlert(empresaId, "agendamentos_95", mesAno);
      }
    } else if (agendamentosPercent >= 80) {
      const alreadySent = await wasAlertSentRecently(empresaId, "agendamentos_80", mesAno);
      if (!alreadySent) {
        const msg = buildAlertMessage(
          plan, "agendamentos", agendamentosPercent,
          agendamentosCount, limits.agendamentosMes, empresaNome
        );
        const sent = await notifyOwner(msg).catch(() => false);
        if (sent) await recordAlert(empresaId, "agendamentos_80", mesAno);
      }
    }
  }

  // ── Verificar WhatsApp ──────────────────────────────────────────────────────
  if (limits.notificacoesWhatsappMes !== -1 && limits.notificacoesWhatsappMes > 0) {
    const waPercent = Math.round(
      (notificacoesWhatsappCount / limits.notificacoesWhatsappMes) * 100
    );

    if (waPercent >= 95) {
      const alreadySent = await wasAlertSentRecently(empresaId, "whatsapp_95", mesAno);
      if (!alreadySent) {
        const msg = buildAlertMessage(
          plan, "whatsapp", waPercent,
          notificacoesWhatsappCount, limits.notificacoesWhatsappMes, empresaNome
        );
        const sent = await notifyOwner(msg).catch(() => false);
        if (sent) await recordAlert(empresaId, "whatsapp_95", mesAno);
      }
    } else if (waPercent >= 80) {
      const alreadySent = await wasAlertSentRecently(empresaId, "whatsapp_80", mesAno);
      if (!alreadySent) {
        const msg = buildAlertMessage(
          plan, "whatsapp", waPercent,
          notificacoesWhatsappCount, limits.notificacoesWhatsappMes, empresaNome
        );
        const sent = await notifyOwner(msg).catch(() => false);
        if (sent) await recordAlert(empresaId, "whatsapp_80", mesAno);
      }
    }
  }
}
