/**
 * Integração Z-API — WhatsApp REST para plano Hubly Pro.
 *
 * Documentação: https://developer.z-api.io
 *
 * As credenciais (ZAPI_INSTANCE_ID e ZAPI_TOKEN) são injetadas via ENV e
 * pertencem à conta master da Orizontech. Empresas no plano Pro usam esta
 * integração em vez do Baileys.
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
  // Já tem DDI 55
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Adiciona DDI Brasil
  return `55${digits}`;
}

/** Faz uma requisição POST para a Z-API */
async function zapiPost(endpoint: string, body: Record<string, unknown>): Promise<ZapiSendResult> {
  const instanceId = ENV.zapiInstanceId;
  const token = ENV.zapiToken;

  if (!instanceId || !token) {
    console.error("[Z-API] Credenciais não configuradas (ZAPI_INSTANCE_ID / ZAPI_TOKEN)");
    return { ok: false, error: "Credenciais Z-API não configuradas" };
  }

  const url = `${BASE_URL}/instances/${instanceId}/token/${token}${endpoint}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": token,
      },
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
 * @param telefone Número do destinatário (com ou sem DDI)
 * @param mensagem Texto da mensagem (suporta *negrito*, _itálico_, ~tachado~)
 */
export async function zapiSendText(telefone: string, mensagem: string): Promise<ZapiSendResult> {
  const phone = normalizarTelefone(telefone);
  console.log(`[Z-API] Enviando texto para ${phone}`);
  return zapiPost("/send-text", { phone, message: mensagem });
}

/**
 * Envia uma imagem ou documento via Z-API.
 * @param telefone Número do destinatário
 * @param mediaUrl URL pública do arquivo
 * @param caption Legenda opcional
 * @param mimeType MIME type do arquivo (ex: "image/jpeg", "application/pdf")
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
  // Fallback: enviar como link de texto
  const msg = caption ? `${caption}\n${mediaUrl}` : mediaUrl;
  return zapiSendText(phone, msg);
}

/**
 * Obtém o QR Code da instância Z-API como imagem base64.
 * Retorna null se já estiver conectada ou se houver erro.
 */
export async function zapiGetQrCode(): Promise<{ qrBase64: string | null; connected: boolean; status: string }> {
  const instanceId = ENV.zapiInstanceId;
  const token = ENV.zapiToken;

  if (!instanceId || !token) {
    return { qrBase64: null, connected: false, status: "credentials_missing" };
  }

  try {
    // Primeiro verifica o status
    const statusUrl = `${BASE_URL}/instances/${instanceId}/token/${token}/status`;
    const statusRes = await fetch(statusUrl, { headers: { "Client-Token": token } });
    const statusData = (await statusRes.json()) as Record<string, unknown>;

    if (statusData?.connected === true) {
      return { qrBase64: null, connected: true, status: "connected" };
    }

    // Busca QR code como imagem base64
    const qrUrl = `${BASE_URL}/instances/${instanceId}/token/${token}/qrcode-image`;
    const qrRes = await fetch(qrUrl, { headers: { "Client-Token": token } });

    if (!qrRes.ok) {
      return { qrBase64: null, connected: false, status: "qr_error" };
    }

    // A Z-API retorna a imagem como buffer ou base64
    const contentType = qrRes.headers.get("content-type") ?? "";
    if (contentType.includes("image")) {
      const buffer = await qrRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = contentType.split(";")[0].trim();
      return { qrBase64: `data:${mimeType};base64,${base64}`, connected: false, status: "qr_ready" };
    }

    // Tenta como JSON (alguns endpoints retornam { value: "data:image/png;base64,..." })
    const qrData = (await qrRes.json()) as Record<string, unknown>;
    const qrBase64 = (qrData?.value as string) ?? (qrData?.qrcode as string) ?? null;
    return { qrBase64, connected: false, status: qrBase64 ? "qr_ready" : "qr_error" };
  } catch (err) {
    console.error("[Z-API] Erro ao obter QR Code:", err);
    return { qrBase64: null, connected: false, status: "error" };
  }
}

/**
 * Reinicia a instância Z-API (desconecta e reconecta).
 */
export async function zapiRestart(): Promise<{ ok: boolean; error?: string }> {
  const instanceId = ENV.zapiInstanceId;
  const token = ENV.zapiToken;

  if (!instanceId || !token) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const url = `${BASE_URL}/instances/${instanceId}/token/${token}/restart`;
    const res = await fetch(url, { headers: { "Client-Token": token } });
    return { ok: res.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Desconecta a instância Z-API (logout do WhatsApp).
 */
export async function zapiDisconnect(): Promise<{ ok: boolean; error?: string }> {
  const instanceId = ENV.zapiInstanceId;
  const token = ENV.zapiToken;

  if (!instanceId || !token) return { ok: false, error: "Credenciais não configuradas" };

  try {
    const url = `${BASE_URL}/instances/${instanceId}/token/${token}/disconnect`;
    const res = await fetch(url, { headers: { "Client-Token": token } });
    return { ok: res.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Verifica se a instância Z-API está conectada.
 * Retorna true se o status for "Connected".
 */
export async function zapiCheckStatus(): Promise<{ connected: boolean; status: string }> {
  const instanceId = ENV.zapiInstanceId;
  const token = ENV.zapiToken;

  if (!instanceId || !token) {
    return { connected: false, status: "credentials_missing" };
  }

  try {
    const url = `${BASE_URL}/instances/${instanceId}/token/${token}/status`;
    const res = await fetch(url, {
      headers: { "Client-Token": token },
    });
    const data = (await res.json()) as Record<string, unknown>;
    const status = (data?.connected as boolean) ? "connected" : ((data?.status as string) ?? "unknown");
    return { connected: data?.connected === true, status };
  } catch (err) {
    return { connected: false, status: "error" };
  }
}
