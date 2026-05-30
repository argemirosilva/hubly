/**
 * Integração Z-API — WhatsApp REST para plano Hubly Pro.
 *
 * Documentação: https://developer.z-api.io
 *
 * Credenciais por empresa (tabela assinaturas):
 *   zapiInstanceId, zapiToken, zapiAtivo
 *
 * Fallback para ENV global (instância única legada):
 *   ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN
 */
import { ENV } from "./_core/env";

const BASE_URL = "https://api.z-api.io";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ZapiSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface ZapiCreds {
  instanceId: string;
  token: string;
  clientToken: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Normaliza telefone para o formato esperado pela Z-API (DDI + DDD + número, sem +) */
function normalizarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

/** Credenciais globais (ENV) */
function globalCreds(): ZapiCreds | null {
  if (ENV.zapiInstanceId && ENV.zapiToken && ENV.zapiClientToken) {
    return { instanceId: ENV.zapiInstanceId, token: ENV.zapiToken, clientToken: ENV.zapiClientToken };
  }
  return null;
}

/** Busca credenciais Z-API da empresa no banco (multi-instância) */
async function getEmpresaCreds(empresaId: number): Promise<ZapiCreds | null> {
  try {
    const { getDb } = await import("./db");
    const { assinaturas } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select({ zapiInstanceId: assinaturas.zapiInstanceId, zapiToken: assinaturas.zapiToken, zapiAtivo: assinaturas.zapiAtivo })
      .from(assinaturas)
      .where(eq(assinaturas.empresaId, empresaId))
      .limit(1);
    if (row?.zapiAtivo && row.zapiInstanceId && row.zapiToken) {
      const clientToken = ENV.zapiClientToken;
      if (!clientToken) return null;
      return { instanceId: row.zapiInstanceId, token: row.zapiToken, clientToken };
    }
  } catch (err) {
    console.error("[Z-API] Erro ao buscar credenciais da empresa:", err);
  }
  return null;
}

/** Resolve credenciais: tenta empresa primeiro, fallback para ENV global */
async function resolveCreds(empresaId?: number): Promise<ZapiCreds | null> {
  if (empresaId) {
    const creds = await getEmpresaCreds(empresaId);
    if (creds) return creds;
  }
  return globalCreds();
}

/** Headers padrão com Client-Token */
function zapiHeaders(creds: ZapiCreds): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Client-Token": creds.clientToken,
  };
}

/** URL base da instância */
function instanceUrl(creds: ZapiCreds, path: string): string {
  return `${BASE_URL}/instances/${creds.instanceId}/token/${creds.token}${path}`;
}

/** Faz uma requisição POST para a Z-API */
async function zapiPost(creds: ZapiCreds, endpoint: string, body: Record<string, unknown>): Promise<ZapiSendResult> {
  const url = instanceUrl(creds, endpoint);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: zapiHeaders(creds),
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg = (data?.message as string) ?? (data?.error as string) ?? `HTTP ${res.status}`;
      console.error(`[Z-API] Erro ao enviar (${endpoint}):`, errMsg);
      return { ok: false, error: errMsg };
    }

    const messageId = (data?.zaapId as string) ?? (data?.messageId as string) ?? undefined;
    return { ok: true, messageId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Z-API] Exceção ao chamar ${endpoint}:`, errMsg);
    return { ok: false, error: errMsg };
  }
}

// ─── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Envia uma mensagem de texto simples via Z-API.
 */
export async function zapiSendText(telefone: string, mensagem: string, empresaId?: number): Promise<ZapiSendResult> {
  const creds = await resolveCreds(empresaId);
  if (!creds) {
    console.error("[Z-API] Credenciais não configuradas");
    return { ok: false, error: "Credenciais Z-API não configuradas" };
  }
  const phone = normalizarTelefone(telefone);
  console.log(`[Z-API] Enviando texto para ${phone}`);
  return zapiPost(creds, "/send-text", { phone, message: mensagem });
}

/**
 * Envia uma imagem ou documento via Z-API.
 */
export async function zapiSendMedia(
  telefone: string,
  mediaUrl: string,
  caption?: string,
  mimeType?: string,
  empresaId?: number,
): Promise<ZapiSendResult> {
  const creds = await resolveCreds(empresaId);
  if (!creds) {
    return { ok: false, error: "Credenciais Z-API não configuradas" };
  }
  const phone = normalizarTelefone(telefone);
  const isImage = mimeType?.startsWith("image/") ?? /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl);
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(mediaUrl);

  if (isImage) {
    return zapiPost(creds, "/send-image", { phone, image: mediaUrl, caption: caption ?? "" });
  }
  if (isPdf) {
    return zapiPost(creds, "/send-document/pdf", { phone, document: mediaUrl, fileName: caption ?? "documento.pdf" });
  }
  const msg = caption ? `${caption}\n${mediaUrl}` : mediaUrl;
  return zapiSendText(phone, msg, empresaId);
}

/**
 * Obtém o QR Code da instância Z-API como imagem base64.
 * Retorna null se já estiver conectada ou se houver erro.
 */
export async function zapiGetQrCode(empresaId?: number): Promise<{ qrBase64: string | null; connected: boolean; status: string }> {
  const creds = await resolveCreds(empresaId);
  if (!creds) {
    return { qrBase64: null, connected: false, status: "credentials_missing" };
  }

  try {
    // Primeiro verifica o status
    const statusRes = await fetch(instanceUrl(creds, "/status"), { headers: zapiHeaders(creds) });
    const statusData = (await statusRes.json()) as Record<string, unknown>;

    if (statusData?.connected === true) {
      return { qrBase64: null, connected: true, status: "connected" };
    }

    // Busca QR code — Z-API retorna JSON com { value: "data:image/png;base64,..." }
    const qrRes = await fetch(instanceUrl(creds, "/qr-code/image"), { headers: zapiHeaders(creds) });

    if (!qrRes.ok) {
      const errBody = await qrRes.text();
      console.error("[Z-API] Erro ao obter QR Code:", qrRes.status, errBody);
      return { qrBase64: null, connected: false, status: "qr_error" };
    }

    const contentType = qrRes.headers.get("content-type") ?? "";

    // Se retornar imagem binária diretamente
    if (contentType.includes("image/") && !contentType.includes("json")) {
      const buffer = await qrRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = contentType.split(";")[0].trim();
      return { qrBase64: `data:${mimeType};base64,${base64}`, connected: false, status: "qr_ready" };
    }

    // JSON com { value: "data:image/png;base64,..." } (formato padrão Z-API)
    const qrData = (await qrRes.json()) as Record<string, unknown>;
    const qrBase64 = (qrData?.value as string) ?? (qrData?.qrcode as string) ?? (qrData?.qrCode as string) ?? null;
    if (qrBase64) {
      console.log("[Z-API] QR Code obtido com sucesso");
    }
    return { qrBase64, connected: false, status: qrBase64 ? "qr_ready" : "qr_error" };
  } catch (err) {
    console.error("[Z-API] Erro ao obter QR Code:", err);
    return { qrBase64: null, connected: false, status: "error" };
  }
}

/**
 * Reinicia a instância Z-API.
 */
export async function zapiRestart(empresaId?: number): Promise<{ ok: boolean; error?: string }> {
  const creds = await resolveCreds(empresaId);
  if (!creds) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const res = await fetch(instanceUrl(creds, "/restart"), { headers: zapiHeaders(creds) });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Desconecta a instância Z-API (logout do WhatsApp).
 */
export async function zapiDisconnect(empresaId?: number): Promise<{ ok: boolean; error?: string }> {
  const creds = await resolveCreds(empresaId);
  if (!creds) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const res = await fetch(instanceUrl(creds, "/disconnect"), { headers: zapiHeaders(creds) });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Configura todos os webhooks da instância Z-API para a mesma URL.
 * Chamado automaticamente ao conectar a instância.
 */
export async function zapiSetWebhook(empresaId: number | undefined, webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  const creds = await resolveCreds(empresaId);
  if (!creds) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const res = await fetch(instanceUrl(creds, "/update-every-webhooks"), {
      method: "PUT",
      headers: zapiHeaders(creds),
      body: JSON.stringify({ value: webhookUrl, notifySentByMe: true }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (data?.value === true) {
      console.log(`[Z-API] Webhook configurado para: ${webhookUrl}`);
      return { ok: true };
    }
    return { ok: false, error: JSON.stringify(data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Obtém o número de telefone conectado à instância Z-API.
 */
export async function zapiGetConnectedPhone(empresaId?: number): Promise<{ phone: string | null; name: string | null }> {
  const creds = await resolveCreds(empresaId);
  if (!creds) return { phone: null, name: null };

  try {
    const res = await fetch(instanceUrl(creds, "/device-properties"), { headers: zapiHeaders(creds) });
    if (!res.ok) return { phone: null, name: null };
    const data = (await res.json()) as Record<string, unknown>;
    const phone = (data?.phone as string) ?? (data?.wid as string) ?? null;
    const name = (data?.name as string) ?? (data?.pushName as string) ?? null;
    return { phone, name };
  } catch {
    return { phone: null, name: null };
  }
}

/**
 * Verifica se a instância Z-API está conectada.
 */
export async function zapiCheckStatus(empresaId?: number): Promise<{ connected: boolean; status: string }> {
  const creds = await resolveCreds(empresaId);
  if (!creds) {
    return { connected: false, status: "credentials_missing" };
  }

  try {
    const res = await fetch(instanceUrl(creds, "/status"), { headers: zapiHeaders(creds) });
    const data = (await res.json()) as Record<string, unknown>;
    const connected = data?.connected === true;
    const status = connected ? "connected" : ((data?.status as string) ?? "disconnected");
    return { connected, status };
  } catch (_err) {
    return { connected: false, status: "error" };
  }
}
