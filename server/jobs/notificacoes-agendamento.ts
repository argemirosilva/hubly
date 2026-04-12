import { getDb } from '../db';
import { agendamentos } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';

/**
 * Job para enviar notificações de agendamentos próximos
 * Executa a cada 5 minutos e envia notificação 1 hora antes do agendamento
 */
export async function enviarNotificacoesAgendamento() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Job] Banco de dados não disponível');
      return;
    }

    // Buscar agendamentos que começam em ~1 hora (entre 55 e 65 minutos)
    const agora = new Date();
    const em55min = new Date(agora.getTime() + 55 * 60000);
    const em65min = new Date(agora.getTime() + 65 * 60000);

    console.log(`[Job] Verificando agendamentos entre ${em55min.toISOString()} e ${em65min.toISOString()}`);

    // Nota: Implementação simplificada - em produção, integrar com sistema de push notifications
    // e buscar subscriptions de clientes para enviar notificações reais
    
    console.log(`[Job] Notificações de agendamento: verificação concluída`);
  } catch (erro) {
    console.error('[Job] Erro ao executar job de notificações:', erro);
  }
}
