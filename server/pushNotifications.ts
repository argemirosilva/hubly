/**
 * Push Notifications Service (PWA)
 * Gerencia subscriptions e envio de notificações push com suporte a som.
 */
import webpush from "web-push";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { pushSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Configurar VAPID
webpush.setVapidDetails(
  "mailto:noreply@agendei.app",
  ENV.vapidPublicKey,
  ENV.vapidPrivateKey
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  sound?: boolean; // Se true, o SW tocará um som
  data?: Record<string, unknown>;
  url?: string; // URL para abrir ao clicar
}

/**
 * Salva ou atualiza uma subscription de push para um usuário.
 */
export async function savePushSubscription(params: {
  userId: number;
  empresaId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  // Verificar se já existe subscription com este endpoint
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, params.endpoint))
    .limit(1);

  if (existing.length > 0) {
    // Atualizar
    await db
      .update(pushSubscriptions)
      .set({
        userId: params.userId,
        empresaId: params.empresaId,
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent,
      })
      .where(eq(pushSubscriptions.endpoint, params.endpoint));
  } else {
    // Inserir
    await db.insert(pushSubscriptions).values({
      userId: params.userId,
      empresaId: params.empresaId,
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      userAgent: params.userAgent,
    });
  }
}

/**
 * Remove uma subscription de push.
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * Envia uma notificação push para todos os dispositivos de um usuário.
 */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return sendPushToSubscriptions(subs, payload);
}

/**
 * ID especial para subscriptions de atendentes (sem login individual).
 * Atendentes da central /atendimento são registrados com userId=0.
 */
export const ATENDENTE_USER_ID = 0;

/**
 * Envia uma notificação push para todos os atendentes registrados de uma empresa.
 * Atendentes são identificados por userId=0 na tabela push_subscriptions.
 */
export async function sendPushToAtendentes(
  empresaId: number,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.empresaId, empresaId),
        eq(pushSubscriptions.userId, ATENDENTE_USER_ID)
      )
    );

  return sendPushToSubscriptions(subs, payload);
}

/**
 * Envia uma notificação push para todos os usuários de uma empresa.
 */
export async function sendPushToEmpresa(
  empresaId: number,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.empresaId, empresaId));

  return sendPushToSubscriptions(subs, payload);
}

/**
 * Envia para uma lista de subscriptions.
 */
async function sendPushToSubscriptions(
  subs: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadStr,
          { TTL: 86400 } // 24 horas
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        // Se a subscription expirou (410 Gone), remover do banco
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          await removePushSubscription(sub.endpoint).catch(() => {});
        } else {
          console.error("[Push] Erro ao enviar notificação:", err);
        }
      }
    })
  );

  return { sent, failed };
}
