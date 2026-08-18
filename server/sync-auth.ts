import crypto from "node:crypto";

export function gerarCredencialSync() {
  const clientId = `hubly-remote-${crypto.randomBytes(8).toString("hex")}`;
  const secret = crypto.randomBytes(32).toString("base64url");
  return { clientId, secret, secretHash: hashSecretSync(secret) };
}

export function hashSecretSync(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function hashIpSync(ip?: string) {
  return crypto.createHash("sha256").update(ip ?? "unknown").digest("hex");
}

export function gerarAssinaturaSync(params: { method: string; path: string; timestamp: string; body?: string; secret: string }) {
  const canonical = `${params.method.toUpperCase()}\n${params.path}\n${params.timestamp}\n${params.body ?? ""}`;
  return crypto.createHmac("sha256", params.secret).update(canonical).digest("hex");
}

export function assinaturaSyncValida(params: { method: string; path: string; timestamp: string; body?: string; secret: string; signature: string; agora?: number }) {
  const instante = Date.parse(params.timestamp);
  const agora = params.agora ?? Date.now();
  if (!Number.isFinite(instante) || Math.abs(agora - instante) > 5 * 60 * 1000) return false;
  const expected = gerarAssinaturaSync(params);
  if (params.signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(params.signature), Buffer.from(expected));
}
