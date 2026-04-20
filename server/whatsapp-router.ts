/**
 * WhatsApp Router — Roteamento inteligente de envio de mensagens.
 *
 * Regra de negócio:
 *   - Plano PRO  → Z-API (REST, mais confiável, sem necessidade de QR)
 *   - Solo/Plus  → Baileys (WhatsApp Web via QR)
 *
 * A verificação é feita consultando a tabela `subscriptions` da empresa.
 * Se não houver assinatura ou o plano não for PRO, usa Baileys como fallback.
 */

import { getDb } from "./db";
import { subscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { zapiSendText, zapiSendMedia } from "./zapi";

// ─── Cache simples de plano por empresa (TTL: 5 minutos) ─────────────────────
const planCache = new Map<number, { plan: string; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getEmpresaPlan(empresaId: number): Promise<string> {
  const cached = planCache.get(empresaId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.plan;

  try {
    const db = await getDb();
    if (!db) return "FREE";
    const [sub] = await db
      .select({ planType: subscriptions.planType })
      .from(subscriptions)
      .where(eq(subscriptions.empresaId, empresaId))
      .limit(1);
    const plan = sub?.planType ?? "FREE";
    planCache.set(empresaId, { plan, ts: Date.now() });
    return plan;
  } catch {
    return "FREE";
  }
}

/** Invalida o cache de plano para uma empresa (chamar após upgrade/downgrade) */
export function invalidatePlanCache(empresaId: number): void {
  planCache.delete(empresaId);
}

// ─── Função principal de envio ────────────────────────────────────────────────

/**
 * Envia uma mensagem de texto WhatsApp para um cliente, usando a API correta
 * conforme o plano da empresa.
 *
 * @param empresaId  ID da empresa remetente (usado para determinar o plano)
 * @param telefone   Número do destinatário
 * @param mensagem   Texto da mensagem
 * @returns true se enviado com sucesso
 */
export async function routedSendMessage(
  empresaId: number,
  telefone: string,
  mensagem: string,
): Promise<boolean> {
  const plan = await getEmpresaPlan(empresaId);

  if (plan === "PRO") {
    console.log(`[WA-Router] Empresa ${empresaId} (PRO) → Z-API`);
    const result = await zapiSendText(telefone, mensagem);
    if (!result.ok) {
      console.warn(`[WA-Router] Z-API falhou para empresa ${empresaId}, sem fallback: ${result.error}`);
    }
    return result.ok;
  }

  // Solo / Plus / Free → Baileys
  console.log(`[WA-Router] Empresa ${empresaId} (${plan}) → Baileys`);
  const { waManager } = await import("./whatsapp");
  if (waManager.getState().status !== "connected") {
    console.warn(`[WA-Router] Baileys não conectado para empresa ${empresaId}`);
    return false;
  }
  return waManager.sendMessage(telefone, mensagem);
}

/**
 * Envia mídia (imagem, PDF) via WhatsApp, usando a API correta conforme o plano.
 */
export async function routedSendMedia(
  empresaId: number,
  telefone: string,
  mediaUrl: string,
  caption?: string,
  mimeType?: string,
): Promise<boolean> {
  const plan = await getEmpresaPlan(empresaId);

  if (plan === "PRO") {
    console.log(`[WA-Router] Empresa ${empresaId} (PRO) → Z-API (mídia)`);
    const result = await zapiSendMedia(telefone, mediaUrl, caption, mimeType);
    return result.ok;
  }

  // Solo / Plus / Free → Baileys
  const { waManager } = await import("./whatsapp");
  return waManager.sendMediaMessage(telefone, mediaUrl, caption, mimeType);
}
