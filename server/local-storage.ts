import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, readFile, lstat, unlink } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import type { Express, Request, Response } from "express";
import { getRuntimeConfig, getPublicAppUrl } from "./runtime-config";

type Scope = { area: "public" | "private" | "shared"; empresaId?: number };
export function storageScope(key: string): Scope {
  if (!key || key.length > 700 || /[\\%\x00-\x1f<>:"|?*]/.test(key)) throw new Error("Chave de arquivo inválida");
  const parts = key.split("/");
  if (parts.some(p => !p || p === "." || p === ".." || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p))) throw new Error("Chave de arquivo inválida");
  if (/^(empresa-logos|empresa-capas|avatars)\/[^/]+$/.test(key)) return { area: "public" };
  const match = /^empresa-([1-9]\d*)\/(clientes\/[1-9]\d*|automacoes)\/[^/]+$/.exec(key);
  if (!match) throw new Error("Categoria de arquivo não permitida");
  return { area: match[2] === "automacoes" ? "shared" : "private", empresaId: Number(match[1]) };
}

async function safePath(root: string, ...parts: string[]) {
  const base = resolve(root), target = resolve(base, ...parts);
  const rel = relative(base, target);
  if (rel.startsWith("..") || rel.includes(":")) throw new Error("Caminho inválido");
  // Junctions e links nao podem redirecionar a leitura/escrita para fora do volume.
  let cursor = target;
  for (;;) {
    try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error("Links não permitidos no armazenamento"); }
    catch (error: any) { if (error.code !== "ENOENT") throw error; }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return target;
}

function rootPath() {
  const root = getRuntimeConfig().storage?.root;
  if (!root) throw new Error("Armazenamento local não configurado");
  return root;
}

function shareSignature(key: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Assinatura de mídia não configurada");
  return createHmac("sha256", secret).update(`hubly-storage-v1:${key}`).digest("hex");
}

function storageUrl(key: string) {
  const scope = storageScope(key);
  const url = new URL(`/api/storage/${key.split("/").map(encodeURIComponent).join("/")}`, getPublicAppUrl());
  if (scope.area === "shared") url.searchParams.set("signature", shareSignature(key));
  return url.toString();
}

const metadataName = (key: string) => createHash("sha256").update(key).digest("hex") + ".json";

export async function localStoragePut(key: string, data: Buffer | Uint8Array | string, contentType: string) {
  const scope = storageScope(key), root = rootPath();
  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  if (!bytes.length || bytes.length > 16 * 1024 * 1024) throw new Error("Arquivo deve ter entre 1 byte e 16 MB");
  const url = storageUrl(key);
  const file = await safePath(root, scope.area, key);
  const metadata = await safePath(root, "metadata", metadataName(key));
  await mkdir(dirname(file), { recursive: true });
  await mkdir(dirname(metadata), { recursive: true });
  await writeFile(file, bytes, { flag: "wx" });
  try {
    await writeFile(metadata, JSON.stringify({ contentType, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }), { flag: "wx" });
  } catch (error) {
    await unlink(file); // Somente o arquivo novo desta tentativa, nunca um existente.
    throw error;
  }
  return { key, url };
}

export async function localStorageGet(key: string) {
  const scope = storageScope(key);
  const file = await safePath(rootPath(), scope.area, key);
  if (!(await lstat(file)).isFile()) throw new Error("Arquivo não encontrado");
  return { key, url: storageUrl(key) };
}

export async function canReadPrivate(req: Request, res: Response, empresaId: number) {
  const { createContext } = await import("./_core/context");
  const ctx = await createContext({ req, res } as Parameters<typeof createContext>[0]);
  if (!ctx.user) return false;
  if (ctx.user.openId === "orizon_admin") return true;
  const { getEmpresaDoContexto } = await import("./db");
  return (await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId))?.id === empresaId;
}

export function registerLocalStorage(app: Express, authorize = canReadPrivate) {
  app.get("/api/storage/*", async (req, res) => {
    res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'", "Referrer-Policy": "no-referrer" });
    try {
      const key = (req.params as Record<string, string>)[0];
      const scope = storageScope(key);
      if (scope.area === "private" && !(await authorize(req, res, scope.empresaId!))) return res.sendStatus(403);
      if (scope.area === "shared") {
        const signature = typeof req.query.signature === "string" ? req.query.signature : "";
        const expected = shareSignature(key);
        if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.sendStatus(403);
      }
      const root = rootPath();
      const file = await safePath(root, scope.area, key);
      const metadata = JSON.parse(await readFile(await safePath(root, "metadata", metadataName(key)), "utf8"));
      const inlineImage = /^image\/(jpeg|png|webp|gif|avif|svg\+xml)$/.test(metadata.contentType);
      res.setHeader("Content-Type", inlineImage ? metadata.contentType : "application/octet-stream");
      res.setHeader("Content-Disposition", inlineImage ? "inline" : "attachment");
      res.sendFile(file, error => { if (error && !res.headersSent) res.sendStatus(404); });
    } catch {
      if (!res.headersSent) res.sendStatus(404);
    }
  });
}
