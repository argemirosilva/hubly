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

  // Trial expirado → FREE
  if (s.status === "trial" && s.trialEnd && new Date() > s.trialEnd) {
    // Atualizar para FREE automaticamente
    await db.update(subscriptions)
      .set({ planType: "FREE", status: "active" })
      .where(eq(subscriptions.empresaId, empresaId));
    return "FREE";
  }

  // Plano cancelado ou com pagamento em atraso → FREE
  if (s.status === "canceled" || s.status === "past_due") return "FREE";

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
