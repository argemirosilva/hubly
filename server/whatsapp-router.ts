import { getPublicAppUrl } from "./runtime-config";
/**
 * WhatsApp Router — Roteamento inteligente de envio de mensagens.
 *
 * Regra de negócio:
 *   - Plano PRO  → Z-API (REST, mais confiável, sem necessidade de QR)
 *   - Solo/Plus  → Baileys (WhatsApp Web via QR)
 *
 * IMPORTANTE: O plano NUNCA é alterado por falha de infraestrutura.
 * Se o banco estiver indisponível, o envio é cancelado com erro —
 * nunca ocorre downgrade silencioso de PRO para Baileys.
 */

import { getDb } from "./db";
import { empresas, subscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { zapiSendText, zapiSendMedia } from "./zapi";
import { isReplicaMode } from "./replica-mode";

// ─── Cache simples de plano por empresa (TTL: 5 minutos) ─────────────────────
const planCache = new Map<number, { plan: string; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Uma réplica usada para sincronização de dados não pode compartilhar o poder
// de envio do Hubly oficial. Sem essa barreira, um worker local com as mesmas
// credenciais poderia repetir lembretes já disparados pela produção.
const ORIGENS_OFICIAIS_DE_AUTOMACAO = new Set([
  "https://hubly.orizontech.com.br",
  "https://hubly.manus.space",
  "https://agendei-app-bkct9rps.manus.space",
]);

export function origemEhOficialParaAutomacoes(origem = getPublicAppUrl()): boolean {
  if (!origem) return false;
  return ORIGENS_OFICIAIS_DE_AUTOMACAO.has(origem.replace(/\/+$/, ""));
}

function garantirAmbienteOficialParaEnvio(): boolean {
  if (origemEhOficialParaAutomacoes()) return true;
  console.error(
    `[WA-Router] Envio bloqueado: APP_PUBLIC_URL="${getPublicAppUrl() ?? "ausente"}" não é uma origem oficial do Hubly.`,
  );
  return false;
}

/**
 * Consulta a pausa persistente de envios da empresa. Em caso de banco
 * indisponível, falha de consulta ou empresa inexistente, bloqueia o envio.
 * Nunca deve haver fallback que envie sem conseguir confirmar a autorização.
 */
export async function enviosEstaoPausados(empresaId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error(`[WA-Router] Envio bloqueado: banco indisponível para verificar a pausa da empresa ${empresaId}.`);
    return true;
  }

  try {
    const [empresa] = await db
      .select({ automacoesPausadas: empresas.automacoesPausadas })
      .from(empresas)
      .where(eq(empresas.id, empresaId))
      .limit(1);

    if (!empresa) {
      console.error(`[WA-Router] Envio bloqueado: empresa ${empresaId} não encontrada.`);
      return true;
    }

    return Boolean(empresa.automacoesPausadas);
  } catch (error) {
    console.error(`[WA-Router] Envio bloqueado: falha ao verificar a pausa da empresa ${empresaId}.`, error);
    return true;
  }
}

/**
 * Retorna o plano da empresa consultando o banco.
 * Lança erro se o banco estiver indisponível — sem fallback para FREE.
 */
async function getEmpresaPlan(empresaId: number): Promise<string> {
  const cached = planCache.get(empresaId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.plan;

  const db = await getDb();
  if (!db) {
    throw new Error(
      `[WA-Router] Banco indisponível para empresa ${empresaId}. Envio cancelado até o banco se recuperar.`,
    );
  }

  const [sub] = await db
    .select({ planType: subscriptions.planType })
    .from(subscriptions)
    .where(eq(subscriptions.empresaId, empresaId))
    .limit(1);

  const plan = sub?.planType ?? "FREE";
  planCache.set(empresaId, { plan, ts: Date.now() });
  return plan;
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
 * @throws Error se o banco estiver indisponível
 */
export async function routedSendMessage(
  empresaId: number,
  telefone: string,
  mensagem: string,
): Promise<boolean> {
  if (isReplicaMode()) {
    console.warn(`[WA-Router] Envio bloqueado no modo réplica (empresa ${empresaId}).`);
    return false;
  }

  if (!garantirAmbienteOficialParaEnvio()) return false;
  if (await enviosEstaoPausados(empresaId)) {
    console.warn(`[WA-Router] Envio bloqueado: mensagens estão pausadas para a empresa ${empresaId}.`);
    return false;
  }
  const plan = await getEmpresaPlan(empresaId);

  if (plan === "PRO") {
    console.log(`[WA-Router] Empresa ${empresaId} (PRO) → Z-API`);
    const result = await zapiSendText(telefone, mensagem, empresaId);
    if (!result.ok) {
      console.warn(`[WA-Router] Z-API falhou para empresa ${empresaId}: ${result.error}`);
    }
    return result.ok;
  }

  // Solo / Plus / Free → Baileys
  console.log(`[WA-Router] Empresa ${empresaId} (${plan}) → Baileys`);
  const { waManager } = await import("./whatsapp");
  const manager = waManager.forEmpresa(empresaId);
  if (manager.getState().status !== "connected") {
    console.warn(`[WA-Router] Baileys não conectado para empresa ${empresaId}`);
    return false;
  }
  return manager.sendMessage(telefone, mensagem);
}

/**
 * Envia mídia (imagem, PDF) via WhatsApp, usando a API correta conforme o plano.
 *
 * @throws Error se o banco estiver indisponível
 */
export async function routedSendMedia(
  empresaId: number,
  telefone: string,
  mediaUrl: string,
  caption?: string,
  mimeType?: string,
): Promise<boolean> {
  if (isReplicaMode()) {
    console.warn(`[WA-Router] Envio de mídia bloqueado no modo réplica (empresa ${empresaId}).`);
    return false;
  }

  if (!garantirAmbienteOficialParaEnvio()) return false;
  if (await enviosEstaoPausados(empresaId)) {
    console.warn(`[WA-Router] Envio de mídia bloqueado: mensagens estão pausadas para a empresa ${empresaId}.`);
    return false;
  }
  const plan = await getEmpresaPlan(empresaId);

  if (plan === "PRO") {
    console.log(`[WA-Router] Empresa ${empresaId} (PRO) → Z-API (mídia)`);
    const result = await zapiSendMedia(telefone, mediaUrl, caption, mimeType, empresaId);
    return result.ok;
  }

  // Solo / Plus / Free → Baileys
  const { waManager } = await import("./whatsapp");
  return waManager.forEmpresa(empresaId).sendMediaMessage(telefone, mediaUrl, caption, mimeType);
}
