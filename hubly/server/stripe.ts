import Stripe from "stripe";
import { ENV } from "./_core/env";

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.warn("[Stripe] ⚠️ STRIPE_SECRET_KEY não definida. Configure em Settings → Payment.");
}

export const stripe = new Stripe(stripeKey ?? "");

console.log(
  "[Stripe] Inicializado com chave:",
  stripeKey ? stripeKey.substring(0, 14) + "..." : "(não configurada)",
  stripeKey?.startsWith("sk_live_") ? "(LIVE)" : stripeKey?.startsWith("sk_test_") ? "(TEST)" : "(inválida)"
);

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
