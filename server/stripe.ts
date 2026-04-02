import Stripe from "stripe";
import { ENV } from "./_core/env";

export const stripe = new Stripe(ENV.stripeSecretKey);

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
