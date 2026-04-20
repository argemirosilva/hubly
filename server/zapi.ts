/**
 * Integração Z-API — WhatsApp REST para plano Hubly Pro.
 *
 * Documentação: https://developer.z-api.io
 *
 * Credenciais necessárias (injetadas via ENV):
 *   ZAPI_INSTANCE_ID  — ID da instância
 *   ZAPI_TOKEN        — Token da instância
 *   ZAPI_CLIENT_TOKEN — Client-Token de segurança (em Segurança no painel Z-API)
 */
import { ENV } from "./_core/env";

const BASE_URL = "https://api.z-api.io";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ZapiSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Normaliza telefone para o formato esperado pela Z-API (DDI + DDD + número, sem +) */
function normalizarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

/** Headers padrão com Client-Token */
function zapiHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Client-Token": ENV.zapiClientToken,
  };
}

/** URL base da instância */
function instanceUrl(path: string): string {
  return `${BASE_URL}/instances/${ENV.zapiInstanceId}/token/${ENV.zapiToken}${path}`;
}

/** Verifica se as credenciais estão configuradas */
function credenciaisOk(): boolean {
  return !!(ENV.zapiInstanceId && ENV.zapiToken && ENV.zapiClientToken);
}

/** Faz uma requisição POST para a Z-API */
async function zapiPost(endpoint: string, body: Record<string, unknown>): Promise<ZapiSendResult> {
  if (!credenciaisOk()) {
    console.error("[Z-API] Credenciais não configuradas (ZAPI_INSTANCE_ID / ZAPI_TOKEN / ZAPI_CLIENT_TOKEN)");
    return { ok: false, error: "Credenciais Z-API não configuradas" };
  }

  const url = instanceUrl(endpoint);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: zapiHeaders(),
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
export async function zapiSendText(telefone: string, mensagem: string): Promise<ZapiSendResult> {
  const phone = normalizarTelefone(telefone);
  console.log(`[Z-API] Enviando texto para ${phone}`);
  return zapiPost("/send-text", { phone, message: mensagem });
}

/**
 * Envia uma imagem ou documento via Z-API.
 */
export async function zapiSendMedia(
  telefone: string,
  mediaUrl: string,
  caption?: string,
  mimeType?: string,
): Promise<ZapiSendResult> {
  const phone = normalizarTelefone(telefone);
  const isImage = mimeType?.startsWith("image/") ?? /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl);
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(mediaUrl);

  if (isImage) {
    return zapiPost("/send-image", { phone, image: mediaUrl, caption: caption ?? "" });
  }
  if (isPdf) {
    return zapiPost("/send-document/pdf", { phone, document: mediaUrl, fileName: caption ?? "documento.pdf" });
  }
  const msg = caption ? `${caption}\n${mediaUrl}` : mediaUrl;
  return zapiSendText(phone, msg);
}

/**
 * Obtém o QR Code da instância Z-API como imagem base64.
 * Retorna null se já estiver conectada ou se houver erro.
 */
export async function zapiGetQrCode(): Promise<{ qrBase64: string | null; connected: boolean; status: string }> {
  if (!credenciaisOk()) {
    return { qrBase64: null, connected: false, status: "credentials_missing" };
  }

  try {
    // Primeiro verifica o status
    const statusRes = await fetch(instanceUrl("/status"), { headers: zapiHeaders() });
    const statusData = (await statusRes.json()) as Record<string, unknown>;

    if (statusData?.connected === true) {
      return { qrBase64: null, connected: true, status: "connected" };
    }

    // Busca QR code — Z-API retorna JSON com { value: "data:image/png;base64,..." }
    const qrRes = await fetch(instanceUrl("/qr-code/image"), { headers: zapiHeaders() });

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
export async function zapiRestart(): Promise<{ ok: boolean; error?: string }> {
  if (!credenciaisOk()) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const res = await fetch(instanceUrl("/restart"), { headers: zapiHeaders() });
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
export async function zapiDisconnect(): Promise<{ ok: boolean; error?: string }> {
  if (!credenciaisOk()) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const res = await fetch(instanceUrl("/disconnect"), { headers: zapiHeaders() });
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
export async function zapiSetWebhook(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  if (!credenciaisOk()) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const res = await fetch(instanceUrl("/update-every-webhooks"), {
      method: "PUT",
      headers: zapiHeaders(),
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
export async function zapiGetConnectedPhone(): Promise<{ phone: string | null; name: string | null }> {
  if (!credenciaisOk()) return { phone: null, name: null };

  try {
    const res = await fetch(instanceUrl("/device-properties"), { headers: zapiHeaders() });
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
export async function zapiCheckStatus(): Promise<{ connected: boolean; status: string }> {
  if (!credenciaisOk()) {
    return { connected: false, status: "credentials_missing" };
  }

  try {
    const res = await fetch(instanceUrl("/status"), { headers: zapiHeaders() });
    const data = (await res.json()) as Record<string, unknown>;
    const connected = data?.connected === true;
    const status = connected ? "connected" : ((data?.status as string) ?? "disconnected");
    return { connected, status };
  } catch (err) {
    return { connected: false, status: "error" };
  }
}
