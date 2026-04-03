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
  // VAPID keys para notificações push PWA
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "BL5ONrRJObnn-Mff2nK9KksbBbQReTfQRY3o08JiW9To4DD5HU8uvWf6gm_BAbHbyJOIEysVNdkK3j0YsgOvlgM",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "eGXYtexS8ZZ0fQb9v2qQNvCu1DX7HvLQIyh90uHuRv0",
};

// Validação de chaves Stripe
if (ENV.stripeSecretKey?.startsWith("sk_live_")) {
  console.log("[INFO] ✅ Stripe em modo LIVE - Chaves de produção ativas");
} else {
  console.warn("[WARN] ⚠️ Stripe em modo TESTE - Verifique as chaves");
}
