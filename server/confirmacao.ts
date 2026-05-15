/**
 * Módulo de Confirmação de Agendamento via Link
 * 
 * Fluxo:
 * 1. Admin/automação gera um token de confirmação para um agendamento
 * 2. Token é incluído na mensagem de lembrete do WhatsApp como link
 * 3. Cliente clica no link → GET /api/confirmar/:token
 * 4. Servidor marca agendamento como "confirmado" e invalida o token
 * 5. Notificação push é enviada para admin e profissional responsável
 */

import type { Express } from "express";
import { getDb } from "./db";
import {
  tokensConfirmacao,
  agendamentos,
  profissionais,
  empresas,
  pushSubscriptions,
} from "../drizzle/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { sendPushToUser } from "./pushNotifications";

// ─── Gerar token de confirmação ───────────────────────────────────────────────
export async function gerarTokenConfirmacao(agendamentoId: number, empresaId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Invalidar tokens anteriores não usados para o mesmo agendamento
  await db.update(tokensConfirmacao)
    .set({ usadoEm: new Date() })
    .where(and(
      eq(tokensConfirmacao.agendamentoId, agendamentoId),
      isNull(tokensConfirmacao.usadoEm),
    ));

  // Buscar a data do agendamento para calcular a validade do token dinamicamente.
  // O token deve expirar 1 dia APÓS o agendamento (ou mínimo 48h a partir de agora).
  // Isso garante que links enviados com antecedência (ex: 7 dias antes) continuem válidos.
  const [ag] = await db.select({ data: agendamentos.data })
    .from(agendamentos)
    .where(eq(agendamentos.id, agendamentoId))
    .limit(1);

  let expiresAt: Date;
  if (ag?.data) {
    // data é varchar(10) no banco, sempre string "YYYY-MM-DD"
    const dataStr = String(ag.data).slice(0, 10);
    // Expirar às 23:59 do dia seguinte ao agendamento
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const expiracao = new Date(ano, mes - 1, dia + 1, 23, 59, 59);
    // Garantir mínimo de 48h a partir de agora
    const minimo48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
    expiresAt = expiracao > minimo48h ? expiracao : minimo48h;
  } else {
    expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // fallback: 48 horas
  }

  const token = crypto.randomBytes(32).toString("hex");

  await db.insert(tokensConfirmacao).values({
    agendamentoId,
    empresaId,
    token,
    expiresAt,
  });

  return token;
}

// ─── Rota pública de confirmação ──────────────────────────────────────────────
export function registerConfirmacaoRoute(app: Express) {
  app.get("/api/confirmar/:token", async (req, res) => {
    const { token } = req.params;
    const db = await getDb();
    if (!db) {
      return res.redirect(`/confirmar/${token}?status=erro`);
    }

    try {
      // Buscar token válido (não usado e não expirado)
      const agora = new Date();
      const [tokenRow] = await db.select()
        .from(tokensConfirmacao)
        .where(and(
          eq(tokensConfirmacao.token, token),
          isNull(tokensConfirmacao.usadoEm),
          gt(tokensConfirmacao.expiresAt, agora),
        ))
        .limit(1);

      if (!tokenRow) {
        // Verificar se já foi usado
        const [tokenUsado] = await db.select()
          .from(tokensConfirmacao)
          .where(eq(tokensConfirmacao.token, token))
          .limit(1);

        if (tokenUsado?.usadoEm) {
          return res.redirect(`/confirmar/${token}?status=ja_confirmado`);
        }
        return res.redirect(`/confirmar/${token}?status=expirado`);
      }

      // Buscar agendamento
      const [ag] = await db.select()
        .from(agendamentos)
        .where(eq(agendamentos.id, tokenRow.agendamentoId))
        .limit(1);

      if (!ag) {
        return res.redirect(`/confirmar/${token}?status=erro`);
      }

      // Marcar token como usado
      await db.update(tokensConfirmacao)
        .set({ usadoEm: agora })
        .where(eq(tokensConfirmacao.id, tokenRow.id));

      // Atualizar status do agendamento para "confirmado"
      await db.update(agendamentos)
        .set({ status: "confirmado", confirmadoEm: agora })
        .where(eq(agendamentos.id, ag.id));

      // Enviar notificações push para admin e profissional
      try {
        await notificarConfirmacao(ag, tokenRow.empresaId, db);
      } catch (err) {
        console.error("[Confirmação] Erro ao enviar notificações push:", err);
      }

      return res.redirect(`/confirmar/${token}?status=confirmado`);
    } catch (err) {
      console.error("[Confirmação] Erro ao processar token:", err);
      return res.redirect(`/confirmar/${token}?status=erro`);
    }
  });
}

// ─── Notificar admin e profissional após confirmação ─────────────────────────
export async function notificarConfirmacaoPublica(
  ag: typeof agendamentos.$inferSelect,
  empresaId: number,
  db: Awaited<ReturnType<typeof getDb>>
) {
  return notificarConfirmacao(ag, empresaId, db);
}
async function notificarConfirmacao(
  ag: typeof agendamentos.$inferSelect,
  empresaId: number,
  db: Awaited<ReturnType<typeof getDb>>
) {
  if (!db) return;

  // Buscar empresa para obter o ownerId
  const [empresa] = await db.select({ ownerId: empresas.ownerId })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .limit(1);

  // Buscar profissional responsável
  const [prof] = ag.profissionalId
    ? await db.select({ nome: profissionais.nome })
        .from(profissionais)
        .where(eq(profissionais.id, ag.profissionalId))
        .limit(1)
    : [null];

  const dataFormatada = ag.data.split("-").reverse().join("/");
  const hora = ag.horaInicio.slice(0, 5);
  const titulo = "✅ Agendamento Confirmado";
  const corpo = `${dataFormatada} às ${hora}${prof ? ` com ${prof.nome}` : ""}`;

  // Buscar subscriptions do owner (admin)
  if (empresa?.ownerId) {
    const ownerSubs = await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, empresa.ownerId));

    if (ownerSubs.length > 0) {
      await sendPushToUser(empresa.ownerId, { title: titulo, body: corpo, sound: true }).catch(() => {});
    }
  }

  // Buscar subscriptions do profissional responsável (se tiver userId)
  if (ag.profissionalId) {
    const [profRow] = await db.select({ userId: profissionais.userId })
      .from(profissionais)
      .where(eq(profissionais.id, ag.profissionalId))
      .limit(1);

    if (profRow?.userId && profRow.userId !== empresa?.ownerId) {
      const profSubs = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, profRow.userId));

      if (profSubs.length > 0) {
        await sendPushToUser(profRow.userId, { title: titulo, body: corpo, sound: true }).catch(() => {});
      }
    }
  }
}
