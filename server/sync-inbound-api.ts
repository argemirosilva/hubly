import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  marketingPosts,
  syncAuditLog,
  syncInboundRequests,
  syncIntegrationClients,
  syncMarketingIdeaLinks,
} from "../drizzle/schema";
import { getDb } from "./db";
import { hashIpSync, hashSecretSync } from "./sync-auth";

const MAX_EVENT_AGE_MS = 5 * 60 * 1000;
const WRITE_SCOPE = "sync.write.marketing";

const isoUtc = z.string().refine(value => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}, "Data/hora UTC inválida");

const publicationDate = z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Data de publicação inválida");

const marketingIdeaSchema = z.object({
  operation: z.literal("upsert"),
  externalId: z.string().trim().min(1).max(255),
  updatedAtSource: isoUtc,
  tema: z.string().trim().min(1).max(255),
  tipo: z.enum(["promocao", "servico", "dica", "depoimento", "novidade", "sazonal", "outro"]),
  plataforma: z.enum(["instagram", "tiktok", "ambos"]),
  formato: z.enum(["feed", "reels", "stories", "tiktok", "outro"]),
  tags: z.array(z.string().trim().min(1).max(100)).max(30).optional().default([]),
  observacoes: z.string().max(10_000).nullable().optional(),
  roteiro: z.string().max(100_000).nullable().optional(),
  dataPublicacao: publicationDate.nullable(),
  horarioPublicacao: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
}).superRefine((item, ctx) => {
  if (!item.dataPublicacao && item.horarioPublicacao) {
    ctx.addIssue({ code: "custom", path: ["horarioPublicacao"], message: "Horário exige dataPublicacao" });
  }
  if (item.tags.join(",").length > 500) {
    ctx.addIssue({ code: "custom", path: ["tags"], message: "Tags excedem 500 caracteres" });
  }
});

export const marketingIdeasBatchSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(100),
  sentAt: isoUtc,
  items: z.array(marketingIdeaSchema).min(1).max(100),
});

type MarketingIdea = z.infer<typeof marketingIdeaSchema>;

export function mapMarketingIdeaToPost(item: MarketingIdea, empresaId: number) {
  return {
    empresaId,
    tema: item.tema,
    tipo: item.tipo,
    plataforma: item.plataforma,
    formato: item.formato,
    tags: item.tags.join(","),
    observacoes: item.observacoes ?? null,
    roteiro: item.roteiro ?? null,
    dataPublicacao: item.dataPublicacao,
    horarioPublicacao: item.dataPublicacao ? item.horarioPublicacao : null,
    status: "rascunho" as const,
    statusProducao: "planejado" as const,
    updatedAt: new Date(),
  };
}

function safeEqualHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function inboundAudit(req: Request, clientId: string, statusCode: number, records = 0) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(syncAuditLog).values({
      clientId,
      rota: req.path,
      statusCode,
      recordsEntregues: records,
      ipHash: hashIpSync(req.ip),
    });
  } catch (error) {
    console.error("[Reverse Sync] Falha ao auditar requisição", error);
  }
}

async function authenticateInbound(req: Request, res: Response) {
  const auth = req.header("authorization");
  const companyKey = req.header("x-hubly-company-key");
  if (!auth?.startsWith("Bearer ") || !companyKey) {
    res.status(401).json({ error: "missing_integration_credentials" });
    return null;
  }

  const token = auth.slice("Bearer ".length).trim();
  const separator = token.indexOf(".");
  if (separator <= 0) {
    res.status(401).json({ error: "invalid_integration_key" });
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
  const secretHash = hashSecretSync(secret);
  const companyHash = hashSecretSync(companyKey);
  if (!client
    || !safeEqualHex(client.secretHash, secretHash)
    || !client.companyKeyHash
    || !safeEqualHex(client.companyKeyHash, companyHash)) {
    await inboundAudit(req, clientId, 401);
    res.status(401).json({ error: "invalid_integration_credentials" });
    return null;
  }
  if (client.escopo !== WRITE_SCOPE || !client.empresaId) {
    await inboundAudit(req, clientId, 403);
    res.status(403).json({ error: "integration_not_allowed_for_company" });
    return null;
  }

  const eventTimestamp = req.header("x-event-timestamp");
  const eventTime = Date.parse(eventTimestamp ?? "");
  if (!Number.isFinite(eventTime) || Math.abs(Date.now() - eventTime) > MAX_EVENT_AGE_MS) {
    await inboundAudit(req, clientId, 401);
    res.status(401).json({ error: "invalid_or_expired_event_timestamp" });
    return null;
  }

  const signatureHeader = req.header("x-signature");
  if (signatureHeader) {
    const received = signatureHeader.replace(/^sha256=/i, "");
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody?.toString("utf8")
      ?? JSON.stringify(req.body ?? {});
    const expected = crypto.createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    if (!safeEqualHex(received, expected)) {
      await inboundAudit(req, clientId, 401);
      res.status(401).json({ error: "invalid_signature" });
      return null;
    }
  }

  await db.update(syncIntegrationClients).set({ ultimoUsoEm: new Date() })
    .where(eq(syncIntegrationClients.id, client.id));
  return client;
}

function storedResponse(responseJson: string | null) {
  if (!responseJson) return null;
  try {
    return JSON.parse(responseJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function registerSyncInboundRoutes(app: Express) {
  app.post("/api/integrations/v1/sync/marketing-ideas", async (req, res) => {
    const client = await authenticateInbound(req, res);
    if (!client) return;

    const requestIdResult = z.string().uuid().safeParse(req.header("x-request-id"));
    const bodyResult = marketingIdeasBatchSchema.safeParse(req.body);
    if (!requestIdResult.success || !bodyResult.success) {
      await inboundAudit(req, client.clientId, 400);
      res.status(400).json({
        error: "invalid_request",
        fields: [
          ...(!requestIdResult.success ? [{ path: "x-request-id", message: "UUID obrigatório" }] : []),
          ...(!bodyResult.success ? bodyResult.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })) : []),
        ],
      });
      return;
    }
    if (client.sourceSystem && client.sourceSystem !== bodyResult.data.sourceSystem) {
      await inboundAudit(req, client.clientId, 403);
      res.status(403).json({ error: "source_system_not_allowed" });
      return;
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "sync_database_unavailable" });
    const requestId = requestIdResult.data;
    const bodyHash = sha256(JSON.stringify(bodyResult.data));
    const requestKey = sha256(`${client.clientId}:${requestId}`);

    const [previous] = await db.select().from(syncInboundRequests)
      .where(eq(syncInboundRequests.requestKey, requestKey)).limit(1);
    if (previous) {
      if (previous.bodyHash !== bodyHash) {
        await inboundAudit(req, client.clientId, 409);
        return res.status(409).json({ error: "request_id_payload_mismatch" });
      }
      const replay = storedResponse(previous.responseJson);
      if (previous.status === "processed" && replay) {
        await inboundAudit(req, client.clientId, 200);
        return res.status(200).json(replay);
      }
      await inboundAudit(req, client.clientId, 409);
      return res.status(409).json({ error: "request_in_progress" });
    }

    try {
      const responseBody = await db.transaction(async tx => {
        await tx.insert(syncInboundRequests).values({
          requestKey,
          clientId: client.clientId,
          requestId,
          bodyHash,
          status: "processing",
        });

        const results: Array<Record<string, unknown>> = [];
        let created = 0;
        let updated = 0;
        let ignored = 0;

        for (const item of bodyResult.data.items) {
          const linkKey = sha256(`${client.clientId}:${item.externalId}`);
          const normalizedSourceTime = new Date(item.updatedAtSource).toISOString();
          const [link] = await tx.select().from(syncMarketingIdeaLinks)
            .where(eq(syncMarketingIdeaLinks.linkKey, linkKey)).limit(1);

          if (link) {
            const currentTime = Date.parse(link.updatedAtSource);
            const incomingTime = Date.parse(normalizedSourceTime);
            if (incomingTime < currentTime) {
              ignored++;
              results.push({ externalId: item.externalId, status: "skipped_stale", hublyId: link.marketingPostId });
              continue;
            }
            if (incomingTime === currentTime) {
              ignored++;
              results.push({ externalId: item.externalId, status: "ignored", hublyId: link.marketingPostId });
              continue;
            }

            const [post] = await tx.select({ id: marketingPosts.id }).from(marketingPosts)
              .where(and(eq(marketingPosts.id, link.marketingPostId), eq(marketingPosts.empresaId, client.empresaId!)))
              .limit(1);
            if (post) {
              await tx.update(marketingPosts)
                .set(mapMarketingIdeaToPost(item, client.empresaId!))
                .where(and(eq(marketingPosts.id, post.id), eq(marketingPosts.empresaId, client.empresaId!)));
              await tx.update(syncMarketingIdeaLinks).set({ updatedAtSource: normalizedSourceTime })
                .where(eq(syncMarketingIdeaLinks.id, link.id));
              updated++;
              results.push({ externalId: item.externalId, status: "updated", hublyId: post.id });
              continue;
            }
          }

          const [inserted] = await tx.insert(marketingPosts)
            .values(mapMarketingIdeaToPost(item, client.empresaId!));
          const marketingPostId = Number((inserted as { insertId?: number }).insertId);
          if (link) {
            await tx.update(syncMarketingIdeaLinks)
              .set({ marketingPostId, updatedAtSource: normalizedSourceTime })
              .where(eq(syncMarketingIdeaLinks.id, link.id));
          } else {
            await tx.insert(syncMarketingIdeaLinks).values({
              linkKey,
              clientId: client.clientId,
              externalId: item.externalId,
              marketingPostId,
              updatedAtSource: normalizedSourceTime,
            });
          }
          created++;
          results.push({ externalId: item.externalId, status: "created", hublyId: marketingPostId });
        }

        const response = {
          requestId,
          status: "processed",
          summary: {
            received: bodyResult.data.items.length,
            created,
            updated,
            ignored,
            failed: 0,
          },
          items: results,
        };
        await tx.update(syncInboundRequests)
          .set({ status: "processed", responseJson: JSON.stringify(response) })
          .where(eq(syncInboundRequests.requestKey, requestKey));
        return response;
      });

      await inboundAudit(req, client.clientId, 200, bodyResult.data.items.length);
      res.status(200).json(responseBody);
    } catch (error) {
      console.error("[Reverse Sync] Falha ao processar lote de ideias", error);
      await inboundAudit(req, client.clientId, 500);
      res.status(500).json({ error: "reverse_sync_processing_failed" });
    }
  });
}
