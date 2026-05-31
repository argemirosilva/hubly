import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { subscriptions, usageTracker } from "../drizzle/schema";
import type { PlanType } from "./plans";
import { getMesAnoAtual, PLAN_LIMITS } from "./plans";

// ─── Subscription helpers ─────────────────────────────────────────────────────

/** Busca ou cria a subscription de uma empresa. Novas empresas entram em trial de 7 dias no SOLO. */
export async function getOrCreateSubscription(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  const existing = await db.select().from(subscriptions)
    .where(eq(subscriptions.empresaId, empresaId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Criar subscription de trial (7 dias no SOLO)
  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(subscriptions).values({
    empresaId,
    planType: "SOLO",
    billingCycle: "monthly",
    status: "trial",
    trialEnd,
    currentPeriodStart: new Date(),
    currentPeriodEnd: trialEnd,
  });

  const created = await db.select().from(subscriptions)
    .where(eq(subscriptions.empresaId, empresaId))
    .limit(1);
  return created[0];
}

/** Retorna o plano efetivo da empresa (considera expiração do trial) */
export async function getEmpresaPlan(empresaId: number): Promise<PlanType> {
  const db = await getDb();
  if (!db) return "FREE";

  const sub = await db.select().from(subscriptions)
    .where(eq(subscriptions.empresaId, empresaId))
    .limit(1);

  if (sub.length === 0) return "FREE";
  const s = sub[0];

  // Trial expirado → SUSPENDED (dados preservados, criação bloqueada)
  if (s.status === "trial" && s.trialEnd && new Date() > s.trialEnd) {
    await db.update(subscriptions)
      .set({ planType: "SOLO", status: "suspended" })
      .where(eq(subscriptions.empresaId, empresaId));
    return "SOLO";
  }

  // Plano cancelado → mantém plano mas status suspended bloqueia criação
  if (s.status === "canceled" || s.status === "past_due") return s.planType as PlanType;

  return s.planType as PlanType;
}

/** Retorna os dados completos da subscription */
export async function getSubscriptionData(empresaId: number) {
  const db = await getDb();
  if (!db) return null;

  const sub = await db.select().from(subscriptions)
    .where(eq(subscriptions.empresaId, empresaId))
    .limit(1);

  return sub[0] ?? null;
}

// ─── Usage tracker helpers ────────────────────────────────────────────────────

/** Busca ou cria o registro de uso do mês atual */
export async function getOrCreateUsage(empresaId: number) {
  const db = await getDb();
  if (!db) return null;

  const mesAno = getMesAnoAtual();
  const existing = await db.select().from(usageTracker)
    .where(and(
      eq(usageTracker.empresaId, empresaId),
      eq(usageTracker.mesAno, mesAno),
    ))
    .limit(1);

  if (existing.length > 0) return existing[0];

  await db.insert(usageTracker).values({
    empresaId,
    mesAno,
    agendamentosCount: 0,
    notificacoesWhatsappCount: 0,
  });

  const created = await db.select().from(usageTracker)
    .where(and(
      eq(usageTracker.empresaId, empresaId),
      eq(usageTracker.mesAno, mesAno),
    ))
    .limit(1);
  return created[0] ?? null;
}

/** Incrementa o contador de agendamentos do mês */
export async function incrementAgendamentosCount(empresaId: number) {
  const db = await getDb();
  if (!db) return;

  const usage = await getOrCreateUsage(empresaId);
  if (!usage) return;

  await db.update(usageTracker)
    .set({ agendamentosCount: usage.agendamentosCount + 1 })
    .where(eq(usageTracker.id, usage.id));
}

/** Decrementa o contador de agendamentos (ao cancelar) */
export async function decrementAgendamentosCount(empresaId: number) {
  const db = await getDb();
  if (!db) return;

  const usage = await getOrCreateUsage(empresaId);
  if (!usage) return;

  const newCount = Math.max(0, usage.agendamentosCount - 1);
  await db.update(usageTracker)
    .set({ agendamentosCount: newCount })
    .where(eq(usageTracker.id, usage.id));
}

/** Incrementa o contador de notificações WhatsApp */
export async function incrementWhatsappCount(empresaId: number) {
  const db = await getDb();
  if (!db) return;

  const usage = await getOrCreateUsage(empresaId);
  if (!usage) return;

  await db.update(usageTracker)
    .set({ notificacoesWhatsappCount: usage.notificacoesWhatsappCount + 1 })
    .where(eq(usageTracker.id, usage.id));
}

/** Verifica se pode criar agendamento (retorna null se OK, ou mensagem de erro) */
export async function checkAgendamentoLimit(empresaId: number): Promise<string | null> {
  const plan = await getEmpresaPlan(empresaId);
  const limit = PLAN_LIMITS[plan].agendamentosMes;
  if (limit === -1) return null; // ilimitado

  const usage = await getOrCreateUsage(empresaId);
  const count = usage?.agendamentosCount ?? 0;

  if (count >= limit) {
    return `LIMIT_REACHED:agendamentos:${plan}:${count}:${limit}`;
  }
  return null;
}

/** Verifica se pode adicionar profissional */
export async function checkProfissionalLimit(empresaId: number, currentCount: number): Promise<string | null> {
  const plan = await getEmpresaPlan(empresaId);
  const limit = PLAN_LIMITS[plan].profissionais;
  if (limit === -1) return null;

  if (currentCount >= limit) {
    return `LIMIT_REACHED:profissionais:${plan}:${currentCount}:${limit}`;
  }
  return null;
}

// ─── Suspended check ─────────────────────────────────────────────────────────

/**
 * Verifica se a empresa está suspensa (trial expirado sem assinatura ou cancelada).
 * Retorna mensagem de erro se suspensa, null se pode operar normalmente.
 * Suspenso = pode ler dados existentes, mas NÃO pode criar novos registros.
 */
export async function checkSuspended(empresaId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const sub = await db.select().from(subscriptions)
    .where(eq(subscriptions.empresaId, empresaId))
    .limit(1);

  if (sub.length === 0) return null;
  const s = sub[0];

  // Trial expirado sem assinatura
  if (s.status === "trial" && s.trialEnd && new Date() > s.trialEnd) {
    return "SUSPENDED:trial_expired";
  }
  // Explicitamente suspenso
  if (s.status === "suspended") {
    return "SUSPENDED:no_active_plan";
  }
  return null;
}

/** Retorna true se a empresa está suspensa */
export async function isEmpresaSuspended(empresaId: number): Promise<boolean> {
  const result = await checkSuspended(empresaId);
  return result !== null;
}

// ─── Feature gating ────────────────────────────────────────────────────────────

/** Chaves de feature booleana disponíveis em PLAN_LIMITS. */
export type FeatureKey =
  | "iaMarketing"
  | "iaFinanceira"
  | "iaTotal"
  | "linkPersonalizado"
  | "pacotesServicos"
  | "comissoes"
  | "relatoriosAvancados"
  | "multiplosCaixas"
  | "portalCliente";

/** Retorna true se o plano EFETIVO da empresa tem a feature liberada. */
export async function empresaHasFeature(empresaId: number, feature: FeatureKey): Promise<boolean> {
  const plan = await getEmpresaPlan(empresaId);
  return !!PLAN_LIMITS[plan][feature];
}

// ─── Limite de notificações WhatsApp ───────────────────────────────────────────

/**
 * Verifica se a empresa ainda pode enviar notificações WhatsApp este mês.
 * Retorna null se OK, ou string de erro padronizada se o teto foi atingido.
 */
export async function checkWhatsappLimit(empresaId: number): Promise<string | null> {
  const plan = await getEmpresaPlan(empresaId);
  const limit = PLAN_LIMITS[plan].notificacoesWhatsappMes;
  if (limit === -1) return null; // ilimitado

  const usage = await getOrCreateUsage(empresaId);
  const count = usage?.notificacoesWhatsappCount ?? 0;

  if (count >= limit) {
    return `LIMIT_REACHED:whatsapp:${plan}:${count}:${limit}`;
  }
  return null;
}
