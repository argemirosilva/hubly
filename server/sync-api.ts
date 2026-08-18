import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { syncAuditLog, syncChangeLog, syncIntegrationClients, syncSnapshots } from "../drizzle/schema";
import { and, eq, gt, lte } from "drizzle-orm";
import { getSyncEntity, sanitizeSyncRecord, SYNC_ENTITIES } from "./sync-catalog";
import { assinaturaSyncValida, hashIpSync, hashSecretSync } from "./sync-auth";
import { normalizarCursorSync, normalizarLimiteSync, paginaSync } from "./sync-pagination";

const MAX_PAGE_SIZE = 500;
const MAX_CHANGE_SIZE = 1000;
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

type SyncClient = { clientId: string; escopo: string };

function rowsFrom(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as Record<string, unknown>[];
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return [];
}

async function audit(req: Request, clientId: string, statusCode: number, recordsEntregues = 0) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(syncAuditLog).values({
      clientId,
      rota: req.path,
      statusCode,
      recordsEntregues,
      cursorSolicitado: typeof req.query.after === "string" ? req.query.after : undefined,
      ipHash: hashIpSync(req.ip),
    });
  } catch (error) {
    console.error("[Sync API] Falha ao auditar chamada", error);
  }
}

async function authenticate(req: Request, res: Response): Promise<SyncClient | null> {
  const auth = req.header("authorization");
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing_bearer_token" });
    return null;
  }
  const token = auth.slice("Bearer ".length).trim();
  const separator = token.indexOf(".");
  if (separator <= 0) {
    res.status(401).json({ error: "invalid_bearer_token" });
    return null;
  }
  const clientId = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "sync_database_unavailable" });
    return null;
  }
  const [client] = await db.select().from(syncIntegrationClients)
    .where(and(eq(syncIntegrationClients.clientId, clientId), eq(syncIntegrationClients.ativo, true)))
    .limit(1);
  if (!client || !crypto.timingSafeEqual(Buffer.from(client.secretHash), Buffer.from(hashSecretSync(secret)))) {
    await audit(req, clientId, 401);
    res.status(401).json({ error: "invalid_or_revoked_credential" });
    return null;
  }
  const timestamp = req.header("x-hubly-timestamp");
  const signatureHeader = req.header("x-hubly-signature");
  const signature = signatureHeader?.replace(/^sha256=/i, "") ?? "";
  const body = req.method === "GET" ? "" : JSON.stringify(req.body ?? {});
  if (!timestamp || !signature || !assinaturaSyncValida({ method: req.method, path: req.originalUrl, timestamp, body, secret, signature })) {
    await audit(req, clientId, 401);
    res.status(401).json({ error: "invalid_or_expired_request_signature" });
    return null;
  }
  await db.update(syncIntegrationClients).set({ ultimoUsoEm: new Date() })
    .where(eq(syncIntegrationClients.id, client.id));
  return { clientId: client.clientId, escopo: client.escopo };
}

function requireGlobalRead(client: SyncClient, res: Response) {
  if (client.escopo !== "sync.read.all") {
    res.status(403).json({ error: "missing_scope", required: "sync.read.all" });
    return false;
  }
  return true;
}

export function registerSyncIntegrationRoutes(app: Express) {
  app.get("/api/integrations/v1/health", async (req, res) => {
    const client = await authenticate(req, res);
    if (!client || !requireGlobalRead(client, res)) return;
    const payload = { apiVersion: "v1", status: "ok", serverTime: new Date().toISOString(), mode: "full-snapshot-batch-read-only" };
    await audit(req, client.clientId, 200);
    res.json(payload);
  });

  app.get("/api/integrations/v1/schema", async (req, res) => {
    const client = await authenticate(req, res);
    if (!client || !requireGlobalRead(client, res)) return;
    const payload = { apiVersion: "v1", syncMode: "full_snapshot_batch", entities: SYNC_ENTITIES.map(({ name, description }) => ({ name, description, cursor: "primary_key" })) };
    await audit(req, client.clientId, 200, payload.entities.length);
    res.json(payload);
  });

  app.post("/api/integrations/v1/bootstrap", async (req, res) => {
    const client = await authenticate(req, res);
    if (!client || !requireGlobalRead(client, res)) return;
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "sync_database_unavailable" });
    const cursorResult = await db.execute(sql`SELECT COALESCE(MAX(cursor), 0) AS cursor FROM sync_change_log`);
    const snapshotCursor = Number(rowsFrom(cursorResult)[0]?.cursor ?? 0);
    const snapshotId = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + SNAPSHOT_TTL_MS);
    const manifest = SYNC_ENTITIES.map(({ name, description }) => ({ name, description }));
    await db.insert(syncSnapshots).values({
      id: snapshotId,
      clientId: client.clientId,
      manifestJson: JSON.stringify(manifest),
      snapshotCursor,
      expiresAt,
    });
    await audit(req, client.clientId, 201, manifest.length);
    res.status(201).json({ apiVersion: "v1", snapshotId, snapshotCursor, expiresAt: expiresAt.toISOString(), deletionStrategy: "remote-reconciliation", entities: manifest });
  });

  app.get("/api/integrations/v1/bootstrap/:snapshotId/:entity", async (req, res) => {
    const client = await authenticate(req, res);
    if (!client || !requireGlobalRead(client, res)) return;
    const entity = getSyncEntity(req.params.entity);
    if (!entity) return res.status(404).json({ error: "unknown_entity" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "sync_database_unavailable" });
    const [snapshot] = await db.select().from(syncSnapshots).where(and(
      eq(syncSnapshots.id, req.params.snapshotId),
      eq(syncSnapshots.clientId, client.clientId),
      gt(syncSnapshots.expiresAt, new Date()),
    )).limit(1);
    if (!snapshot) return res.status(410).json({ error: "invalid_or_expired_snapshot" });
    const after = normalizarCursorSync(req.query.after);
    const limit = normalizarLimiteSync(req.query.limit, MAX_PAGE_SIZE);
    const result = await db.execute(sql.raw(`SELECT * FROM \`${entity.table}\` WHERE id > ${after} ORDER BY id ASC LIMIT ${limit + 1}`));
    const fetched = rowsFrom(result);
    const page = paginaSync(fetched, limit, after);
    const records = page.records.map(sanitizeSyncRecord);
    await audit(req, client.clientId, 200, records.length);
    res.json({ apiVersion: "v1", snapshotId: snapshot.id, entity: entity.name, after, nextCursor: page.nextCursor, hasMore: page.hasMore, records });
  });

  app.get("/api/integrations/v1/records/:entity/:id", async (req, res) => {
    const client = await authenticate(req, res);
    if (!client || !requireGlobalRead(client, res)) return;
    const entity = getSyncEntity(req.params.entity);
    const id = normalizarCursorSync(req.params.id);
    if (!entity || !id) return res.status(404).json({ error: "unknown_entity_or_record" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "sync_database_unavailable" });
    const result = await db.execute(sql.raw(`SELECT * FROM \`${entity.table}\` WHERE id = ${id} LIMIT 1`));
    const record = rowsFrom(result)[0];
    if (!record) return res.status(404).json({ error: "record_not_found" });
    await audit(req, client.clientId, 200, 1);
    res.json({ apiVersion: "v1", entity: entity.name, record: sanitizeSyncRecord(record) });
  });

  app.get("/api/integrations/v1/changes", async (req, res) => {
    const client = await authenticate(req, res);
    if (!client || !requireGlobalRead(client, res)) return;
    await audit(req, client.clientId, 409);
    res.status(409).json({
      error: "incremental_log_not_enabled",
      message: "Use POST /bootstrap e percorra todas as entidades. A reconciliação completa é o modo seguro ativo nesta versão.",
      requiredSyncMode: "full_snapshot_batch",
    });
  });
}
