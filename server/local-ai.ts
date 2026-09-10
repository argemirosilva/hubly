import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { getRuntimeConfig } from "./runtime-config";

let active = false;
const waiters: (() => void)[] = [];

/** Backend only. Never forwards prompts to a cloud provider on failure. */
export async function invokeLocalAI(payload: Record<string, any>): Promise<any> {
  const config = getRuntimeConfig().ai;
  if (!config) throw new Error("IA local não configurada.");
  const url = new URL(config.baseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("A IA local deve usar o serviço interno deste servidor.");
  }
  const credentials = parse(readFileSync(config.credentialFile));
  const key = credentials.LM_STUDIO_API_KEY;
  if (!key) throw new Error("Credencial do LM Studio indisponível.");
  if (active) {
    if (waiters.length >= 8) throw new Error("IA ocupada. Tente novamente em instantes.");
    await new Promise<void>(resolve => waiters.push(resolve));
  }
  active = true;
  try {
    const body: Record<string, any> = { ...payload, model: config.model, stream: false };
    body.max_tokens = Math.min(Number(payload.max_tokens) || 4096, 8192);
    delete body.thinking;
    // LM Studio uses a JSON schema for constrained JSON output.
    if (body.response_format?.type === "json_object") {
      body.response_format = { type: "json_schema", json_schema: {
        name: "response", schema: { type: "object", additionalProperties: true },
      } };
    }
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(180_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`IA local indisponível (HTTP ${response.status}).`);
    const result = await response.json();
    if (!result.choices?.length) throw new Error("IA local retornou resposta inválida.");
    if (result.choices[0].finish_reason === "length") throw new Error("Resposta da IA excedeu o limite. Reduza a solicitação.");
    return result;
  } finally {
    const next = waiters.shift();
    if (next) next(); else active = false;
  }
}
