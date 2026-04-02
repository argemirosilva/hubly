// Configuração de ambiente - Chaves Stripe LIVE injetadas
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Chaves Stripe LIVE - Injetadas diretamente
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "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",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_SBQMnwGkruzwOcxHV8Tern6V3kPSpdsv",
};

// Validação de chaves Stripe
if (ENV.stripeSecretKey?.startsWith("sk_live_")) {
  console.log("[INFO] ✅ Stripe em modo LIVE - Chaves de produção ativas");
} else {
  console.warn("[WARN] ⚠️ Stripe em modo TESTE - Verifique as chaves");
}
