import type { Express, Request, Response } from "express";
import express from "express";
import { stripe } from "./stripe";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { subscriptions, assinaturas, planos, empresas } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { priceIdToPlanType as priceIdToType } from "./stripe-products";
import { invalidatePlanCache } from "./whatsapp-router";
import { sendPushToUser } from "./pushNotifications";
import { notifyOwner } from "./_core/notification";

/**
 * Sincroniza a tabela `assinaturas` (Painel Orizontech) com dados do Stripe.
 * Busca o planoId pelo priceId, atualiza ou cria o registro da empresa.
 */
async function syncAssinatura(params: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  priceId: string;
  billingInterval: string; // 'month' | 'year'
  periodStart: Date;
  periodEnd: Date;
  status: 'ativa' | 'inadimplente' | 'cancelada';
  empresaId?: number | null;
}) {
  const db = await getDb();
  if (!db) return;

  // Mapear priceId para planoId local
  const allPlanos = await db.select().from(planos);
  const plano = allPlanos.find(
    p => p.stripePriceIdMensal === params.priceId || p.stripePriceIdAnual === params.priceId
  );
  if (!plano) {
    console.warn(`[Stripe Webhook] Plano não encontrado para priceId: ${params.priceId}`);
    return;
  }

  const ciclo = params.billingInterval === 'year' ? 'anual' : 'mensal';

  // Tentar encontrar assinatura existente por stripeSubscriptionId ou stripeCustomerId
  let existingRows = await db.select({ id: assinaturas.id, empresaId: assinaturas.empresaId })
    .from(assinaturas)
    .where(eq(assinaturas.stripeSubscriptionId, params.stripeSubscriptionId))
    .limit(1);

  if (existingRows.length === 0 && params.stripeCustomerId) {
    existingRows = await db.select({ id: assinaturas.id, empresaId: assinaturas.empresaId })
      .from(assinaturas)
      .where(eq(assinaturas.stripeCustomerId, params.stripeCustomerId))
      .limit(1);
  }

  if (existingRows.length === 0 && params.empresaId) {
    existingRows = await db.select({ id: assinaturas.id, empresaId: assinaturas.empresaId })
      .from(assinaturas)
      .where(eq(assinaturas.empresaId, params.empresaId))
      .limit(1);
  }

  if (existingRows.length > 0) {
    // Atualizar assinatura existente
    await db.update(assinaturas).set({
      planoId: plano.id,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      status: params.status,
      ciclo,
      periodoInicio: params.periodStart,
      periodoFim: params.periodEnd,
      canceladaEm: params.status === 'cancelada' ? new Date() : null,
    }).where(eq(assinaturas.id, existingRows[0].id));
    console.log(`[Stripe Webhook] assinaturas atualizada: empresaId=${existingRows[0].empresaId} plano=${plano.nome} ${ciclo}`);
  } else if (params.empresaId) {
    // Criar nova assinatura
    await db.insert(assinaturas).values({
      empresaId: params.empresaId,
      planoId: plano.id,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      status: params.status,
      ciclo,
      periodoInicio: params.periodStart,
      periodoFim: params.periodEnd,
    });
    console.log(`[Stripe Webhook] assinaturas criada: empresaId=${params.empresaId} plano=${plano.nome} ${ciclo}`);
  } else {
    console.warn(`[Stripe Webhook] Não foi possível vincular assinatura Stripe a uma empresa local. stripeCustomerId=${params.stripeCustomerId}`);
  }
}

// Webhook Secret carregado de ENV (que já tem fallback para a chave hardcoded)
const webhookSecret = ENV.stripeWebhookSecret;

if (!webhookSecret) {
  console.warn("[Stripe Webhook] ⚠️ STRIPE_WEBHOOK_SECRET não definida. Webhooks não serão verificados.");
} else {
  console.log("[Stripe Webhook] ✅ Webhook secret configurada:", webhookSecret.substring(0, 10) + "...");
}

/**
 * Registra o endpoint do webhook do Stripe.
 * DEVE ser registrado ANTES do express.json() para que a verificação
 * de assinatura funcione corretamente com o raw body.
 */
export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];

      // Se não tiver webhook secret, não podemos verificar a assinatura
      if (!webhookSecret) {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurada. Rejeite a requisição.");
        res.status(500).send("Webhook secret not configured");
        return;
      }

      // Se não tiver assinatura no header, rejeitar
      if (!sig) {
        console.error("[Stripe Webhook] Missing stripe-signature header");
        res.status(400).send("Missing stripe-signature header");
        return;
      }

      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig as string,
          webhookSecret
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Webhook error";
        console.error("[Stripe Webhook] Signature verification failed:", message);
        res.status(400).send(`Webhook Error: ${message}`);
        return;
      }

      // Detectar eventos de teste
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as unknown as {
              metadata?: { empresaId?: string };
              customer?: string;
              subscription?: string;
            };
            const empresaId = session.metadata?.empresaId
              ? parseInt(session.metadata.empresaId)
              : null;
            const stripeCustomerId = session.customer as string | null;
            const stripeSubscriptionId = session.subscription as string | null;

            // Fallback: se stripeSubscriptionId vier nulo na sessão, buscar assinatura ativa do customer
            let resolvedSubscriptionId = stripeSubscriptionId;
            if (!resolvedSubscriptionId && stripeCustomerId) {
              try {
                const activeSubs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 });
                if (activeSubs.data.length > 0) {
                  resolvedSubscriptionId = activeSubs.data[0].id;
                  console.log(`[Stripe Webhook] Fallback: subscription encontrada via customer: ${resolvedSubscriptionId}`);
                }
              } catch (e) {
                console.error('[Stripe Webhook] Erro ao buscar subscription do customer:', e);
              }
            }

            if (empresaId && resolvedSubscriptionId) {
              // Buscar detalhes da assinatura para obter o plano
              const subRaw = await stripe.subscriptions.retrieve(resolvedSubscriptionId);
              const sub = subRaw as unknown as {
                current_period_start: number;
                current_period_end: number;
                items: { data: Array<{ price: { id: string; recurring?: { interval: string } } }> };
              };
              const priceId = sub.items.data[0]?.price?.id ?? "";
              const planType = priceIdToPlanType(priceId);
              const billingCycle = sub.items.data[0]?.price?.recurring?.interval === "year"
                ? "annual"
                : "monthly";
              const periodStart = new Date(sub.current_period_start * 1000);
              const periodEnd = new Date(sub.current_period_end * 1000);

              const db1 = await getDb();
              if (db1) {
                await db1
                  .update(subscriptions)
                  .set({
                    planType,
                    billingCycle,
                    status: "active",
                    stripeCustomerId,
                    stripeSubscriptionId: resolvedSubscriptionId,
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                    trialEnd: null,
                    updatedAt: new Date(),
                  })
                  .where(eq(subscriptions.empresaId, empresaId));
              }

              // Invalida cache de plano para que o roteamento WhatsApp use o novo plano imediatamente
              invalidatePlanCache(empresaId);
              console.log(`[Stripe Webhook] Assinatura ativada para empresa ${empresaId}: ${planType} ${billingCycle}`);

              // Notificar Orizontech sobre novo upgrade
              if (planType === 'PRO' || planType === 'PLUS') {
                try {
                  const dbNotify = await getDb();
                  let empresaNome = `Empresa #${empresaId}`;
                  let empresaEmail = '';
                  if (dbNotify) {
                    const [emp] = await dbNotify
                      .select({ nome: empresas.nome, email: empresas.email })
                      .from(empresas)
                      .where(eq(empresas.id, empresaId))
                      .limit(1);
                    if (emp) { empresaNome = emp.nome; empresaEmail = emp.email ?? ''; }
                  }
                  const cicloLabel = billingCycle === 'annual' ? 'Anual' : 'Mensal';
                  const acaoZapi = planType === 'PRO'
                    ? '\n\n⚡ **Ação necessária:** configurar instância Z-API no painel Orizontech para ativar o WhatsApp desta empresa.'
                    : '';
                  await notifyOwner({
                    title: `🚀 Nova assinatura ${planType} — ${empresaNome}`,
                    content: `A empresa **${empresaNome}** (ID: ${empresaId}${empresaEmail ? `, ${empresaEmail}` : ''}) acabou de assinar o plano **${planType} ${cicloLabel}**.${acaoZapi}`,
                  });
                } catch (notifyErr) {
                  console.error('[Stripe Webhook] Erro ao notificar owner sobre upgrade:', notifyErr);
                }
              }

              // Sincronizar tabela assinaturas (Painel Orizontech)
              await syncAssinatura({
                stripeCustomerId,
                stripeSubscriptionId: resolvedSubscriptionId,
                priceId,
                billingInterval: sub.items.data[0]?.price?.recurring?.interval ?? 'month',
                periodStart,
                periodEnd,
                status: 'ativa',
                empresaId,
              });
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as unknown as {
              id: string;
              status: string;
              current_period_start: number;
              current_period_end: number;
              items: { data: Array<{ price: { id: string; recurring?: { interval: string } } }> };
              metadata?: { empresaId?: string };
              customer: string;
            };
            const stripeSubscriptionId = sub.id;
            const priceId = sub.items.data[0]?.price?.id ?? "";
            const planType = priceIdToPlanType(priceId);
            const billingCycle = sub.items.data[0]?.price?.recurring?.interval === "year"
              ? "annual"
              : "monthly";
            const periodStart2 = new Date(sub.current_period_start * 1000);
            const periodEnd2 = new Date(sub.current_period_end * 1000);
            const status = sub.status === "active" ? "active"
              : sub.status === "past_due" ? "past_due"
              : sub.status === "canceled" ? "canceled"
              : "active";

            const db2 = await getDb();
            if (db2) {
              await db2
                .update(subscriptions)
                .set({
                  planType,
                  billingCycle,
                  status,
                  currentPeriodStart: periodStart2,
                  currentPeriodEnd: periodEnd2,
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
            }

            // Invalida cache de plano para todas as empresas com essa subscription
            if (db2) {
              const rows = await db2
                .select({ empresaId: subscriptions.empresaId })
                .from(subscriptions)
                .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
                .limit(1);
              if (rows[0]?.empresaId) invalidatePlanCache(rows[0].empresaId);
            }
            console.log(`[Stripe Webhook] Assinatura atualizada: ${stripeSubscriptionId} → ${planType} ${status}`);

            // Sincronizar tabela assinaturas (Painel Orizontech)
            const statusAssinatura = status === 'active' ? 'ativa'
              : status === 'past_due' ? 'inadimplente'
              : status === 'canceled' ? 'cancelada'
              : 'ativa';
            await syncAssinatura({
              stripeCustomerId: sub.customer,
              stripeSubscriptionId,
              priceId,
              billingInterval: sub.items.data[0]?.price?.recurring?.interval ?? 'month',
              periodStart: periodStart2,
              periodEnd: periodEnd2,
              status: statusAssinatura as 'ativa' | 'inadimplente' | 'cancelada',
            });
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as { id: string };
            const db3 = await getDb();

            // Capturar empresaId e ownerId ANTES de zerar o stripeSubscriptionId
            let canceledEmpresaId: number | null = null;
            let canceledOwnerId: number | null = null;
            if (db3) {
              const preRows = await db3
                .select({ empresaId: subscriptions.empresaId })
                .from(subscriptions)
                .where(eq(subscriptions.stripeSubscriptionId, sub.id))
                .limit(1);
              if (preRows[0]?.empresaId) {
                canceledEmpresaId = preRows[0].empresaId;
                const ownerRow = await db3
                  .select({ ownerId: empresas.ownerId })
                  .from(empresas)
                  .where(eq(empresas.id, canceledEmpresaId))
                  .limit(1);
                canceledOwnerId = ownerRow[0]?.ownerId ?? null;
              }
            }

            if (db3) {
              await db3
                .update(subscriptions)
                .set({
                  planType: "FREE",
                  billingCycle: "monthly",
                  status: "canceled",
                  stripeSubscriptionId: null,
                  currentPeriodEnd: null,
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, sub.id));
            }

            // Invalida cache de plano
            if (canceledEmpresaId) invalidatePlanCache(canceledEmpresaId);

            console.log(`[Stripe Webhook] Assinatura cancelada: ${sub.id} → migrado para FREE`);

            // Sincronizar tabela assinaturas (Painel Orizontech) — marcar como cancelada
            if (db3) {
              await db3.update(assinaturas).set({
                status: 'cancelada',
                canceladaEm: new Date(),
              }).where(eq(assinaturas.stripeSubscriptionId, sub.id));
            }

            // Notificar o dono da empresa sobre o cancelamento confirmado
            if (canceledOwnerId) {
              await sendPushToUser(canceledOwnerId, {
                title: "Assinatura cancelada",
                body: "Sua assinatura foi cancelada. Novos cadastros estão bloqueados. Reative para continuar usando todos os recursos.",
                tag: "subscription-canceled",
                sound: true,
                url: "/admin/assinatura",
              }).catch((err) =>
                console.error("[Stripe Webhook] Erro ao enviar push de cancelamento:", err)
              );
              console.log(`[Stripe Webhook] Push de cancelamento enviado para ownerId=${canceledOwnerId}`);
            }
            break;
          }

          case "invoice.paid": {
            // Renovação automática: atualizar período no banco
            const invoice = event.data.object as unknown as {
              subscription?: string;
              lines?: { data: Array<{ period?: { start: number; end: number } }> };
            };
            if (invoice.subscription) {
              const line = invoice.lines?.data?.[0];
              if (line?.period?.start && line?.period?.end) {
                const db5 = await getDb();
                if (db5) {
                  await db5
                    .update(subscriptions)
                    .set({
                      currentPeriodStart: new Date(line.period.start * 1000),
                      currentPeriodEnd: new Date(line.period.end * 1000),
                      status: "active",
                      updatedAt: new Date(),
                    })
                    .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));
                  console.log(`[Stripe Webhook] Renovação registrada para assinatura: ${invoice.subscription}`);

                  // Sincronizar tabela assinaturas (Painel Orizontech)
                  await db5.update(assinaturas).set({
                    status: 'ativa',
                    periodoInicio: new Date(line.period.start * 1000),
                    periodoFim: new Date(line.period.end * 1000),
                  }).where(eq(assinaturas.stripeSubscriptionId, invoice.subscription));
                }
              }
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as {
              subscription?: string;
            };
            if (invoice.subscription) {
              const db4 = await getDb();
              if (db4) {
                await db4
                  .update(subscriptions)
                  .set({ status: "past_due", updatedAt: new Date() })
                  .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));
              }
              console.log(`[Stripe Webhook] Pagamento falhou para assinatura: ${invoice.subscription}`);
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Evento não tratado: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err) {
        console.error("[Stripe Webhook] Erro ao processar evento:", err);
        // Eventos CRÍTICOS (mudam estado de assinatura) devem ser reprocessados pela
        // Stripe em caso de falha transitória (ex.: banco fora do ar). Retornamos 500
        // para que a Stripe reenvie. Demais eventos retornam 200 para evitar loops.
        const criticalEvents = [
          "checkout.session.completed",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.paid",
          "invoice.payment_failed",
        ];
        if (criticalEvents.includes(event.type)) {
          res.status(500).json({ received: false, error: "Internal processing error", willRetry: true });
        } else {
          res.json({ received: true, error: "Internal processing error" });
        }
      }
    }
  );
}

/**
 * Converte um Price ID do Stripe para o plan_type do banco.
 * Usa os Price IDs definidos em stripe-products.ts.
 */
function priceIdToPlanType(priceId: string): "FREE" | "SOLO" | "PLUS" | "PRO" {
  return priceIdToType(priceId);
}
