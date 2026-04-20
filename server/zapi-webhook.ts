/**
 * Webhook Z-API — recebe eventos de status de entrega e leitura de mensagens.
 *
 * Eventos suportados:
 *   - MessageStatusCallback: status da mensagem (sent, delivered, read, failed)
 *
 * Configurar no painel Z-API:
 *   URL: https://<domínio>/api/zapi/webhook
 *   Eventos: MessageStatusCallback
 */

import type { Express } from "express";
import { getDb } from "./db";
import { historicoEnviosAutomacao } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type ZapiMessageStatus = "sent" | "delivered" | "read" | "failed";

interface ZapiStatusEvent {
  instanceId?: string;
  messageId?: string;
  id?: string;           // alguns eventos usam 'id' em vez de 'messageId'
  status?: string;       // "SENT" | "DELIVERED" | "READ" | "FAILED"
  type?: string;         // tipo do evento
  phone?: string;
  timestamp?: number;
}

function normalizeStatus(raw: string | undefined): ZapiMessageStatus | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s === "SENT" || s === "1") return "sent";
  if (s === "DELIVERED" || s === "2") return "delivered";
  if (s === "READ" || s === "3") return "read";
  if (s === "FAILED" || s === "ERROR" || s === "0") return "failed";
  return null;
}

export function registerZapiWebhook(app: Express) {
  app.post("/api/zapi/webhook", async (req, res) => {
    try {
      const body = req.body as ZapiStatusEvent;

      // Aceitar tanto 'messageId' quanto 'id'
      const messageId = body.messageId ?? body.id;
      const rawStatus = body.status;

      if (!messageId || !rawStatus) {
        // Evento sem dados relevantes — responder 200 para não gerar retry
        return res.json({ ok: true, skipped: true });
      }

      const status = normalizeStatus(rawStatus);
      if (!status) {
        return res.json({ ok: true, skipped: true, reason: "unknown_status" });
      }

      // Atualizar o registro no histórico de envios pelo zapiMessageId
      const db = await getDb();
      if (db) {
        await db
          .update(historicoEnviosAutomacao)
          .set({
            messageStatus: status,
            messageStatusAt: new Date(),
          })
          .where(eq(historicoEnviosAutomacao.zapiMessageId, messageId));
      }

      console.log(`[ZapiWebhook] messageId=${messageId} status=${status}`);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[ZapiWebhook] Erro ao processar evento:", err);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });
}
