/**
 * Helper para chamadas à API OpenAI.
 * Interface compatível com invokeLLM para facilitar substituição.
 *
 * Usa a variável de ambiente OPENAI_API_KEY configurada no servidor.
 * Nunca exposta ao frontend.
 */

import OpenAI from "openai";

// ─── Tipos de conteúdo (texto, imagem, arquivo) ───────────────────────────────
type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
type MessageContent = string | Array<TextContent | ImageContent>;

type Role = "system" | "user" | "assistant";

export interface OpenAIMessage {
  role: Role;
  content: MessageContent;
}

// ─── Formatos de resposta ─────────────────────────────────────────────────────
type ResponseFormatText = { type: "text" };
type ResponseFormatJson = { type: "json_object" };
type ResponseFormatJsonSchema = {
  type: "json_schema";
  json_schema: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
};
type ResponseFormat = ResponseFormatText | ResponseFormatJson | ResponseFormatJsonSchema;

export interface OpenAIOptions {
  messages: OpenAIMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  response_format?: ResponseFormat;
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("[OpenAI] OPENAI_API_KEY não configurada. Verifique as variáveis de ambiente.");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Chama a API OpenAI e retorna a resposta completa.
 * Usa gpt-4o-mini por padrão (custo baixo, alta qualidade).
 * Para conteúdo multimodal (imagens), usa gpt-4o automaticamente.
 */
export async function invokeOpenAI(options: OpenAIOptions) {
  const client = getClient();

  // Auto-selecionar modelo com visão se houver imagens no conteúdo
  const hasImages = options.messages.some(
    (m) => Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")
  );
  const model = options.model ?? (hasImages ? "gpt-4o" : "gpt-4o-mini");

  const response = await client.chat.completions.create({
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: options.messages as any,
    max_tokens: options.max_tokens ?? 1000,
    temperature: options.temperature ?? 0.7,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options.response_format ? { response_format: options.response_format as any } : {}),
  });

  return response;
}

/**
 * Atalho: retorna apenas o texto da primeira resposta.
 */
export async function invokeOpenAIText(options: OpenAIOptions): Promise<string> {
  const response = await invokeOpenAI(options);
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Atalho: retorna resposta estruturada como objeto JSON.
 * Garante que o modelo retorne JSON válido via response_format.
 */
export async function invokeOpenAIJson<T = Record<string, unknown>>(
  options: Omit<OpenAIOptions, "response_format">
): Promise<T> {
  const response = await invokeOpenAI({ ...options, response_format: { type: "json_object" } });
  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
