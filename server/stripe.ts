import Stripe from "stripe";
import { ENV } from "./_core/env";

// Chave Stripe LIVE injetada diretamente
const STRIPE_LIVE_KEY = "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";
const stripeKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? process.env.STRIPE_SECRET_KEY : STRIPE_LIVE_KEY;

export const stripe = new Stripe(stripeKey);

console.log("[Stripe] Inicializado com chave:", stripeKey.substring(0, 30) + "...", stripeKey.startsWith("sk_live_") ? "(LIVE)" : "(TESTE)");

/**
 * Cria ou recupera um Customer do Stripe para a empresa.
 * Armazena o stripeCustomerId na tabela subscriptions.
 */
export async function getOrCreateStripeCustomer(
  empresaId: number,
  email: string,
  nome: string,
  stripeCustomerId: string | null
): Promise<string> {
  if (stripeCustomerId) return stripeCustomerId;
  const customer = await stripe.customers.create({
    email,
    name: nome,
    metadata: { empresaId: String(empresaId) },
  });
  return customer.id;
}
