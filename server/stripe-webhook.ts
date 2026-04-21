import type { Express, Request, Response } from "express";
import express from "express";
import { stripe } from "./stripe";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { subscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { priceIdToPlanType as priceIdToType } from "./stripe-products";
import { invalidatePlanCache } from "./whatsapp-router";

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

            if (empresaId && stripeSubscriptionId) {
              // Buscar detalhes da assinatura para obter o plano
              const subRaw = await stripe.subscriptions.retrieve(stripeSubscriptionId);
              const sub = subRaw as unknown as {
                current_period_end: number;
                items: { data: Array<{ price: { id: string; recurring?: { interval: string } } }> };
              };
              const priceId = sub.items.data[0]?.price?.id ?? "";
              const planType = priceIdToPlanType(priceId);
              const billingCycle = sub.items.data[0]?.price?.recurring?.interval === "year"
                ? "annual"
                : "monthly";
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
                    stripeSubscriptionId,
                    currentPeriodEnd: periodEnd,
                    trialEnd: null,
                    updatedAt: new Date(),
                  })
                  .where(eq(subscriptions.empresaId, empresaId));
              }

              // Invalida cache de plano para que o roteamento WhatsApp use o novo plano imediatamente
              invalidatePlanCache(empresaId);
              console.log(`[Stripe Webhook] Assinatura ativada para empresa ${empresaId}: ${planType} ${billingCycle}`);
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as unknown as {
              id: string;
              status: string;
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
            const periodEnd = new Date(sub.current_period_end * 1000);
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
                  currentPeriodEnd: periodEnd,
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
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as { id: string };
            const db3 = await getDb();
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

            // Invalida cache de plano para todas as empresas com essa subscription
            if (db3) {
              const rows = await db3
                .select({ empresaId: subscriptions.empresaId })
                .from(subscriptions)
                .where(eq(subscriptions.stripeSubscriptionId, sub.id))
                .limit(1);
              if (rows[0]?.empresaId) invalidatePlanCache(rows[0].empresaId);
            }
            console.log(`[Stripe Webhook] Assinatura cancelada: ${sub.id} → migrado para FREE`);
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
        // IMPORTANTE: Retornar 200 mesmo em caso de erro de processamento
        // para que a Stripe não fique reenviando o mesmo evento.
        // O erro é logado para investigação, mas o evento é marcado como recebido.
        res.json({ received: true, error: "Internal processing error" });
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
