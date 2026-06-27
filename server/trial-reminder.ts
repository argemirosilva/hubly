/**
 * trial-reminder.ts
 * Handler do cron diário que envia notificação push para donos de empresas
 * em período de trial sem cartão cadastrado no Stripe.
 *
 * Cron: 0 0 12 * * *  (diariamente às 12h UTC = 9h Brasília)
 * Endpoint: POST /api/scheduled/trial-reminder
 */

import type { Request, Response } from "express";
import { getDb } from "./db";
import { assinaturas, empresas, profissionais } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, lt } from "drizzle-orm";
import { sendPushToUser } from "./pushNotifications";

export async function trialReminderHandler(req: Request, res: Response) {
  // Verificar autenticação do cron via header injetado pela plataforma
  const taskUid = req.headers["x-manus-cron-task-uid"];
  if (!taskUid) {
    return res.status(403).json({ error: "cron-only" });
  }

  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "db-unavailable" });

    const agora = new Date();

    // Buscar assinaturas em trial sem stripeSubscriptionId (sem cartão)
    const assinaturasEmTrial = await db
      .select({
        assinaturaId: assinaturas.id,
        empresaId: assinaturas.empresaId,
        trialFim: assinaturas.trialFim,
        stripeSubscriptionId: assinaturas.stripeSubscriptionId,
      })
      .from(assinaturas)
      .where(
        and(
          eq(assinaturas.status, "trial"),
          isNull(assinaturas.stripeSubscriptionId),
          isNotNull(assinaturas.trialFim)
        )
      );

    let notificacoesEnviadas = 0;
    let notificacoesFalhadas = 0;
    const resultados: Array<{ empresaId: number; diasRestantes: number; status: string }> = [];

    for (const assinatura of assinaturasEmTrial) {
      if (!assinatura.trialFim) continue;

      const trialFim = new Date(assinatura.trialFim);

      // Ignorar trials já expirados
      if (trialFim <= agora) continue;

      const msRestantes = trialFim.getTime() - agora.getTime();
      const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

      // Buscar o dono da empresa (isOwner = true)
      const donos = await db
        .select({ id: profissionais.id, userId: profissionais.userId, nome: profissionais.nome })
        .from(profissionais)
        .where(
          and(
            eq(profissionais.empresaId, assinatura.empresaId),
            eq(profissionais.isOwner, true),
            isNotNull(profissionais.userId)
          )
        )
        .limit(1);

      if (donos.length === 0 || !donos[0].userId) {
        resultados.push({ empresaId: assinatura.empresaId, diasRestantes, status: "sem-dono" });
        continue;
      }

      const dono = donos[0];

      // Montar mensagem com urgência progressiva
      let titulo: string;
      let corpo: string;

      if (diasRestantes <= 1) {
        titulo = "⚠️ Seu trial expira hoje!";
        corpo = "Cadastre seu cartão agora para não perder o acesso. Após o trial, o acesso será suspenso até que um plano seja contratado.";
      } else if (diasRestantes <= 3) {
        titulo = `⏰ Trial expira em ${diasRestantes} dias`;
        corpo = `Faltam apenas ${diasRestantes} dias para o fim do seu período de teste. Cadastre seu cartão para continuar com todos os recursos.`;
      } else if (diasRestantes <= 7) {
        titulo = `📅 ${diasRestantes} dias restantes no trial`;
        corpo = "Seu período de teste está chegando ao fim. Assine um plano para manter o acesso completo ao Hubly.";
      } else {
        titulo = `🎁 Trial ativo — ${diasRestantes} dias restantes`;
        corpo = "Aproveite o período de teste! Quando quiser, cadastre seu cartão para garantir a continuidade do serviço.";
      }

      try {
        const resultado = await sendPushToUser(dono.userId!, {
          title: titulo,
          body: corpo,
          icon: "/icons/icon-192x192.png",
          tag: `trial-reminder-${assinatura.empresaId}`,
          url: "/admin/assinatura",
          data: {
            type: "trial-reminder",
            empresaId: assinatura.empresaId,
            diasRestantes,
          },
        });

        if (resultado.sent > 0) {
          notificacoesEnviadas++;
          resultados.push({ empresaId: assinatura.empresaId, diasRestantes, status: "enviado" });
        } else {
          // Sem subscription push — usuário não habilitou notificações
          resultados.push({ empresaId: assinatura.empresaId, diasRestantes, status: "sem-push-subscription" });
        }
      } catch (err) {
        notificacoesFalhadas++;
        resultados.push({ empresaId: assinatura.empresaId, diasRestantes, status: "erro" });
        console.error(`[TrialReminder] Erro ao notificar empresa ${assinatura.empresaId}:`, err);
      }
    }

    console.log(`[TrialReminder] Concluído: ${notificacoesEnviadas} enviadas, ${notificacoesFalhadas} falhas, ${assinaturasEmTrial.length} trials verificados`);

    return res.json({
      ok: true,
      trialsVerificados: assinaturasEmTrial.length,
      notificacoesEnviadas,
      notificacoesFalhadas,
      resultados,
      timestamp: agora.toISOString(),
    });
  } catch (err: any) {
    console.error("[TrialReminder] Erro geral:", err);
    return res.status(500).json({
      error: err?.message ?? "unknown",
      stack: err?.stack,
      context: { taskUid, timestamp: new Date().toISOString() },
    });
  }
}
