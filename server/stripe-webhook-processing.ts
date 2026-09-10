import type Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import { getDb } from './db';
import { stripe } from './stripe';
import { subscriptions, assinaturas, planos, empresas } from '../drizzle/schema';
import { stripeWebhookEvents } from './stripe-event-store';
import { PLANOS_STRIPE, priceIdToPlanType } from './stripe-products';
import { invalidatePlanCache } from './whatsapp-router';
import { notifyOwner } from './_core/notification';
import { sendPushToUser } from './pushNotifications';

export const STRIPE_SUBSCRIPTION_EVENTS = [
  'checkout.session.completed', 'customer.subscription.created',
  'customer.subscription.updated', 'customer.subscription.deleted',
  'invoice.paid', 'invoice.payment_failed',
] as const;

type Reference = string | { id: string } | null | undefined;
type SubscriptionSnapshot = {
  id: string; customer: Reference; status: string; livemode?: boolean;
  metadata?: { empresaId?: string }; cancel_at_period_end?: boolean; trial_end?: number | null;
  current_period_start?: number; current_period_end?: number;
  items: { data: Array<{ current_period_start?: number; current_period_end?: number;
    price: { id: string; recurring?: { interval: string } | null } }> };
};
export function stripeReferenceId(value: Reference): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}
export function stripeSubscriptionState(status: string) {
  switch (status) {
    case 'active': return { subscription: 'active', assinatura: 'ativa' } as const;
    case 'trialing': return { subscription: 'trial', assinatura: 'trial' } as const;
    case 'past_due': case 'unpaid': return { subscription: 'past_due', assinatura: 'inadimplente' } as const;
    case 'canceled': case 'incomplete_expired': return { subscription: 'canceled', assinatura: 'cancelada' } as const;
    case 'paused': return { subscription: 'paused', assinatura: 'suspensa' } as const;
    case 'incomplete': return { subscription: 'suspended', assinatura: 'suspensa' } as const;
    default: throw new Error('Estado de assinatura Stripe desconhecido');
  }
}
export function stripeSubscriptionPeriod(sub: SubscriptionSnapshot) {
  if (sub.items.data.length !== 1) throw new Error('Assinatura Hubly deve conter exatamente um plano');
  const item = sub.items.data[0];
  const start = item.current_period_start ?? sub.current_period_start;
  const end = item.current_period_end ?? sub.current_period_end;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start! <= 0 || end! <= start!) {
    throw new Error('Período de assinatura Stripe inválido');
  }
  return { start: new Date(start! * 1000), end: new Date(end! * 1000) };
}

/** Apenas leitura na Stripe; escritas locais e deduplicação são atômicas. */
export async function processStripeSubscriptionEvent(event: Stripe.Event) {
  const db = await getDb();
  if (!db) throw new Error('Banco indisponível');
  const afterCommit: Array<() => void | Promise<unknown>> = [];
  const result = await db.transaction(async tx => {
    // Consulta Stripe APÓS o lock: reenvios não reaplicam snapshots antigos.
    await tx.execute(sql`SET LOCAL lock_timeout = '10s'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(3010, 7821)`);
    const inserted = await tx.insert(stripeWebhookEvents).values({
      id: event.id, type: event.type, livemode: event.livemode,
    }).onConflictDoNothing().returning({ id: stripeWebhookEvents.id });
    if (!inserted.length) return { duplicate: true };

    const object = event.data.object as unknown as {
      id: string; mode?: string; subscription?: Reference;
      metadata?: { empresaId?: string };
      parent?: { subscription_details?: { subscription?: Reference } | null } | null;
    };
    const checkout = event.type === 'checkout.session.completed';
    // A conta Stripe também hospeda outro produto: checkout avulso não é Hubly Billing.
    if (checkout && object.mode && object.mode !== 'subscription') return { ignored: true };
    const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id
      : stripeReferenceId(object.subscription ?? object.parent?.subscription_details?.subscription);
    if (!subscriptionId) {
      if (checkout && object.mode === 'subscription') throw new Error('Checkout sem assinatura');
      return { ignored: true };
    }
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {}, {
      timeout: 15000, maxNetworkRetries: 0,
    }) as unknown as SubscriptionSnapshot;
    if (sub.id !== subscriptionId || (typeof sub.livemode === 'boolean' && sub.livemode !== event.livemode)) {
      throw new Error('Assinatura Stripe incompatível com evento');
    }
    const customerId = stripeReferenceId(sub.customer);
    if (!customerId) throw new Error('Assinatura sem cliente Stripe');
    const priceId = sub.items.data[0]?.price?.id;
    const knownPrice = Object.values(PLANOS_STRIPE).some(p => p.mensal.priceId === priceId || p.anual.priceId === priceId);
    const [linked] = await tx.select().from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId)).limit(1);
    if (!knownPrice) {
      if (linked) throw new Error('Preço não reconhecido para assinatura Hubly vinculada');
      return { ignored: true };
    }
    const [adminLinked] = await tx.select().from(assinaturas)
      .where(eq(assinaturas.stripeSubscriptionId, subscriptionId)).limit(1);
    const metadataId = checkout ? object.metadata?.empresaId ?? sub.metadata?.empresaId : sub.metadata?.empresaId;
    const parsedId = metadataId && /^\d+$/.test(metadataId) ? Number(metadataId) : null;
    const empresaId = linked?.empresaId ?? adminLinked?.empresaId ?? parsedId;
    if (!empresaId || !Number.isSafeInteger(empresaId)) throw new Error('Assinatura Hubly sem empresa local');
    if (parsedId && parsedId !== empresaId) throw new Error('Empresa divergente nos metadados Stripe');
    const [company] = await tx.select().from(empresas).where(eq(empresas.id, empresaId)).limit(1);
    if (!company) throw new Error('Empresa da assinatura não encontrada');
    const [previous] = await tx.select().from(subscriptions).where(eq(subscriptions.empresaId, empresaId)).limit(1);
    if (previous?.stripeSubscriptionId && previous.stripeSubscriptionId !== subscriptionId) {
      throw new Error('Empresa já vinculada a outra assinatura; requer conciliação');
    }
    if (previous?.stripeCustomerId && previous.stripeCustomerId !== customerId) {
      throw new Error('Cliente Stripe divergente da empresa');
    }
    const allPlans = await tx.select().from(planos);
    const plan = allPlans.find(p => p.stripePriceIdMensal === priceId || p.stripePriceIdAnual === priceId);
    if (!plan) throw new Error('Plano Stripe não cadastrado no painel Orizontech');
    const state = stripeSubscriptionState(sub.status);
    const canceled = state.subscription === 'canceled';
    const period = stripeSubscriptionPeriod(sub);
    const interval = sub.items.data[0].price.recurring?.interval;
    if (interval !== 'month' && interval !== 'year') throw new Error('Ciclo de cobrança não suportado');
    const planType = priceIdToPlanType(priceId);
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
    const values = {
      planType: canceled ? 'SOLO' as const : planType,
      billingCycle: !canceled && interval === 'year' ? 'annual' as const : 'monthly' as const,
      status: state.subscription, stripeCustomerId: customerId,
      stripeSubscriptionId: canceled ? null : subscriptionId,
      currentPeriodStart: period.start, currentPeriodEnd: canceled ? null : period.end,
      trialEnd, cancelAtPeriodEnd: !!sub.cancel_at_period_end, updatedAt: new Date(),
    };
    await tx.insert(subscriptions).values({ empresaId, ...values })
      .onConflictDoUpdate({ target: subscriptions.empresaId, set: values });
    const adminRows = await tx.select().from(assinaturas).where(eq(assinaturas.empresaId, empresaId)).limit(2);
    if (adminRows.length > 1) throw new Error('Mais de uma assinatura local para empresa; requer conciliação');
    const adminValues = {
      planoId: plan.id, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
      status: state.assinatura, ciclo: interval === 'year' ? 'anual' as const : 'mensal' as const,
      periodoInicio: period.start, periodoFim: period.end, trialFim: trialEnd,
      canceladaEm: canceled ? adminRows[0]?.canceladaEm ?? new Date() : null, updatedAt: new Date(),
    };
    if (adminRows[0]) {
      await tx.update(assinaturas).set(adminValues).where(eq(assinaturas.id, adminRows[0].id));
    } else {
      await tx.insert(assinaturas).values({ empresaId, ...adminValues });
    }
    afterCommit.push(() => invalidatePlanCache(empresaId));
    // Best-effort após commit: falha externa não repete a mudança financeira.
    if (checkout && state.subscription === 'active' && (planType === 'PLUS' || planType === 'PRO')) {
      const action = planType === 'PRO' ? '\nConfigurar a instância Z-API no painel Orizontech, se necessário.' : '';
      afterCommit.push(() => notifyOwner({
        title: `🚀 Nova assinatura ${planType} — ${company.nome}`,
        content: `A empresa **${company.nome}** (ID: ${empresaId}) assinou **${planType} ${interval === 'year' ? 'Anual' : 'Mensal'}**.${action}`,
      }));
    }
    if (canceled && previous && previous.status !== 'canceled' && company.ownerId) {
      afterCommit.push(() => sendPushToUser(company.ownerId, {
        title: 'Assinatura cancelada',
        body: 'Sua assinatura foi cancelada. Novos cadastros estão bloqueados. Reative para continuar usando todos os recursos.',
        tag: 'subscription-canceled', sound: true, url: '/admin/assinatura',
      }));
    }
    return { duplicate: false };
  });
  for (const action of afterCommit) {
    try { await action(); } catch { console.error('[Stripe Webhook] Falha em notificação/cache após commit'); }
  }
  return result;
}
