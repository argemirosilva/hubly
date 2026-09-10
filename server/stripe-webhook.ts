import type { Express, Request, Response } from 'express';
import express from 'express';
import { stripe } from './stripe';
import { ENV } from './_core/env';
import { processStripeSubscriptionEvent, STRIPE_SUBSCRIPTION_EVENTS } from './stripe-webhook-processing';

const webhookSecret = ENV.stripeWebhookSecret;

/** Registrar ANTES de express.json(): a assinatura exige o corpo original. */
export function registerStripeWebhook(app: Express) {
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      if (!webhookSecret) {
        res.status(500).send('Webhook secret not configured');
        return;
      }
      const sig = req.headers['stripe-signature'];
      if (typeof sig !== 'string') {
        res.status(400).send('Missing stripe-signature header');
        return;
      }
      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch {
        res.status(400).send('Invalid webhook signature');
        return;
      }
      if (!(STRIPE_SUBSCRIPTION_EVENTS as readonly string[]).includes(event.type)) {
        res.json({ received: true, ignored: true });
        return;
      }
      // Não há bypass por prefixo de ID. Eventos TEST nunca alteram dados LIVE.
      const live = ENV.stripeSecretKey.startsWith('sk_live_');
      if (event.livemode !== live) {
        res.status(400).send('Webhook mode mismatch');
        return;
      }
      try {
        const result = await processStripeSubscriptionEvent(event);
        res.json({ received: true, ...result });
      } catch (err) {
        // Erros do driver podem conter parâmetros SQL e dados pessoais.
        console.error('[Stripe Webhook] Falha no evento', event.id,
          err instanceof Error ? err.name : 'erro interno');
        res.status(500).json({ received: false, error: 'Internal processing error', willRetry: true });
      }
    });
}
