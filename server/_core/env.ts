// Configuração de ambiente — variáveis injetadas pela plataforma
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Chaves Stripe — injetadas via variáveis de ambiente (Settings → Payment)
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  // Z-API — WhatsApp exclusivo para plano Pro
  zapiInstanceId: process.env.ZAPI_INSTANCE_ID ?? "",
  zapiToken: process.env.ZAPI_TOKEN ?? "",
  zapiClientToken: process.env.ZAPI_CLIENT_TOKEN ?? "",
  // VAPID keys para notificações push PWA
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "BL5ONrRJObnn-Mff2nK9KksbBbQReTfQRY3o08JiW9To4DD5HU8uvWf6gm_BAbHbyJOIEysVNdkK3j0YsgOvlgM",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "eGXYtexS8ZZ0fQb9v2qQNvCu1DX7HvLQIyh90uHuRv0",
};

// Validação de chaves Stripe
if (!ENV.stripeSecretKey) {
  console.warn("[WARN] ⚠️ STRIPE_SECRET_KEY não configurada. Configure em Settings → Payment.");
} else if (ENV.stripeSecretKey.startsWith("sk_live_")) {
  console.log("[INFO] ✅ Stripe em modo LIVE - Chaves de produção ativas");
} else if (ENV.stripeSecretKey.startsWith("sk_test_")) {
  console.warn("[WARN] ⚠️ Stripe em modo TESTE - Pagamentos reais não serão processados");
} else {
  console.warn("[WARN] ⚠️ Stripe com chave inválida - Verifique em Settings → Payment");
}
