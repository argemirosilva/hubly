import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ root: "", base: "" }));
vi.mock("./runtime-config", () => ({ getRuntimeConfig: () => ({ storage: { root: state.root } }), getPublicAppUrl: () => state.base }));
import { localStoragePut, localStorageGet, registerLocalStorage, storageScope } from "./local-storage";
let server: Server;
beforeAll(async () => {
  state.root = await mkdtemp(join(tmpdir(), "hubly-storage-test-"));
  vi.stubEnv("JWT_SECRET", "test-only-storage-key");
  const app = express();
  registerLocalStorage(app, async (req, _res, empresaId) => req.header("test-company") === String(empresaId));
  server = await new Promise<Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  state.base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  vi.unstubAllEnvs();
  if (dirname(state.root) !== tmpdir() || !basename(state.root).startsWith("hubly-storage-test-")) throw new Error("Diretorio de teste inesperado");
  await rm(state.root, { recursive: true });
});
describe("armazenamento local", () => {
  it("mantem anexos privados na empresa correta", async () => {
    const key = "empresa-1/clientes/2/test-document.txt";
    const { url } = await localStoragePut(key, "conteudo sintetico", "text/plain");
    expect(await readFile(join(state.root, "private", key), "utf8")).toBe("conteudo sintetico");
    expect((await fetch(url)).status).toBe(403);
    expect((await fetch(url, { headers: { "test-company": "2" } })).status).toBe(403);
    const result = await fetch(url, { headers: { "test-company": "1" } });
    expect(result.status).toBe(200);
    expect(result.headers.get("content-disposition")).toBe("attachment");
    expect(await result.text()).toBe("conteudo sintetico");
    expect((await localStorageGet(key)).url).toBe(url);
  });
  it("permite imagens publicas com protecoes de conteudo", async () => {
    const { url } = await localStoragePut("empresa-logos/logo-1-test.png", Buffer.from([137,80,78,71]), "image/png");
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
  });
  it("exige assinatura da midia enviada a provedores", async () => {
    const { url } = await localStoragePut("empresa-1/automacoes/test.pdf", "PDF sintetico", "application/pdf");
    expect((await fetch(url)).status).toBe(200);
    const changed = new URL(url); changed.search = "";
    expect((await fetch(changed)).status).toBe(403);
    changed.searchParams.set("signature", "0".repeat(64));
    expect((await fetch(changed)).status).toBe(403);
  });
  it("nao sobrescreve arquivos", async () => {
    await localStoragePut("avatars/prof-1-test.jpg", "original", "image/jpeg");
    await expect(localStoragePut("avatars/prof-1-test.jpg", "novo", "image/jpeg")).rejects.toThrow();
    expect(await readFile(join(state.root,"public/avatars/prof-1-test.jpg"),"utf8")).toBe("original");
  });
  it("bloqueia traversal, dispositivos Windows e categorias desconhecidas", () => {
    for (const key of ["../secret", "empresa-logos/../../secret", "avatars/a\\b", "avatars/con.txt", "avatars/a:secret", "avatars/%2e%2e", "backups/database.sql", "avatars/a."]) expect(() => storageScope(key)).toThrow();
  });
  it("limita o tamanho e nao permite listar diretorios", async () => {
    await expect(localStoragePut("avatars/large.jpg", Buffer.alloc(16*1024*1024+1), "image/jpeg")).rejects.toThrow("16 MB");
    expect((await fetch(state.base + "/api/storage/avatars/")).status).toBe(404);
    expect((await fetch(state.base + "/api/storage/metadata/x.json")).status).toBe(404);
  });
});
