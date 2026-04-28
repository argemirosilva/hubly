import Stripe from "stripe";
import { ENV } from "./_core/env";

const stripeKey = ENV.stripeSecretKey;

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
 * Se o stripeCustomerId salvo no banco não existir mais no Stripe
 * (ex: troca de ambiente test→live, sandbox resetado), cria um novo.
 */
export async function getOrCreateStripeCustomer(
  empresaId: number,
  email: string,
  nome: string,
  stripeCustomerId: string | null
): Promise<string> {
  // Se temos um ID salvo, verificar se ele ainda existe no Stripe
  if (stripeCustomerId) {
    // Proteção: se a chave é de teste mas o ID salvo é de produção,
    // não validar no Stripe (evita sobrescrever o ID live correto com um ID de teste)
    const isTestKey = (ENV.stripeSecretKey ?? '').startsWith('sk_test_');
    const isLiveCustomerId = stripeCustomerId.startsWith('cus_') && !stripeCustomerId.startsWith('cus_test_');
    if (isTestKey && isLiveCustomerId) {
      console.warn(`[Stripe] Ambiente TEST com customer ID live (${stripeCustomerId}). Usando ID existente sem validar.`);
      return stripeCustomerId;
    }
    try {
      const existing = await stripe.customers.retrieve(stripeCustomerId);
      // Se o customer foi deletado no Stripe, o objeto retorna com deleted: true
      if (!(existing as any).deleted) {
        return stripeCustomerId;
      }
      console.warn(`[Stripe] Customer ${stripeCustomerId} foi deletado no Stripe. Criando novo...`);
    } catch (err: any) {
      // Erro "No such customer" — o ID não existe neste ambiente (test/live)
      console.warn(`[Stripe] Customer ID inválido ou de outro ambiente (${stripeCustomerId}). Criando novo...`);
    }
  }

  // Criar novo customer no Stripe
  const customer = await stripe.customers.create({
    email,
    name: nome,
    metadata: { empresaId: String(empresaId) },
  });

  // Persistir o novo ID no banco
  try {
    const { getDb } = await import("./db");
    const { subscriptions: subsTable } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      await db
        .update(subsTable)
        .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
        .where(eq(subsTable.empresaId, empresaId));
    }
  } catch (e) {
    console.error("[Stripe] Falha ao persistir novo stripeCustomerId:", e);
  }

  console.log(`[Stripe] Novo customer criado: ${customer.id} para empresa ${empresaId}`);
  return customer.id;
}
