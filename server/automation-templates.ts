/**
 * Templates de automação pré-configurados para novas empresas.
 *
 * Ao criar uma empresa, o sistema insere automaticamente estas automações
 * com isTemplate=true. Quando o usuário edita manualmente, isTemplate
 * passa a false e o template original deixa de ser referência.
 */

import { createAutomacao, getAutomacaoByEvento } from "./db";
import {
  createPipeline,
  createColuna,
  getPipelinesByEmpresa,
} from "./db";

// ─── DEFINIÇÃO DOS TEMPLATES ─────────────────────────────────────────────────

interface AutomacaoTemplate {
  nome: string;
  descricao: string;
  tipoGatilho: "evento" | "dias_antes_agendamento" | "horas_antes_agendamento" | "horas_apos_agendamento" | "dias_depois_agendamento" | "aniversario_mes";
  evento?: string;
  diasAntesDepois?: number;
  delayMinutos?: number;
  horaDisparo?: string;
  dataFixaDia?: number;
  dataFixaMes?: number;
  canalEnvio: "whatsapp" | "email";
  corpoMensagem: string;
  flowJson: string;
}

function buildFlowJson(trigger: { id: string; tipo: string; label: string; [k: string]: any }, action: { id: string; label: string; tipo: string; mensagem: string }): string {
  return JSON.stringify([
    { id: trigger.id, type: "trigger", x: 300, y: 60, data: trigger, connections: [action.id] },
    { id: action.id, type: "action", x: 300, y: 220, data: action, connections: [] },
  ]);
}

export const AUTOMATION_TEMPLATES: AutomacaoTemplate[] = [
  // 1. Confirmação de agendamento (imediato)
  {
    nome: "Confirmação de agendamento",
    descricao: "Envia confirmação automática quando um agendamento é criado",
    tipoGatilho: "evento",
    evento: "agendamento_criado",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "✅ *Agendamento Confirmado!*\n\n" +
      "Olá, *{{nome_cliente}}*! Seu agendamento foi registrado com sucesso.\n\n" +
      "📅 *Data:* {{data}}\n" +
      "⏰ *Horário:* {{hora}}\n" +
      "✂️ *Serviço:* {{servico}}\n" +
      "👩‍💼 *Profissional:* {{profissional}}\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "evento_agendamento_criado", label: "Agendamento criado" },
      { id: "a1", label: "Confirmação WhatsApp", tipo: "enviar_whatsapp", mensagem: "✅ *Agendamento Confirmado!*\n\nOlá, *{{nome_cliente}}*! Seu agendamento foi registrado com sucesso.\n\n📅 *Data:* {{data}}\n⏰ *Horário:* {{hora}}\n✂️ *Serviço:* {{servico}}\n👩‍💼 *Profissional:* {{profissional}}\n\n_{{empresa}}_" },
    ),
  },

  // 2. Lembrete 1 dia antes
  {
    nome: "Lembrete 1 dia antes",
    descricao: "Envia lembrete 1 dia antes do agendamento com link de confirmação",
    tipoGatilho: "dias_antes_agendamento",
    diasAntesDepois: 1,
    horaDisparo: "09:00",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "🔔 *Lembrete de Agendamento*\n\n" +
      "Olá, *{{nome_cliente}}*! Passando pra lembrar que você tem um horário amanhã.\n\n" +
      "📅 *Data:* {{data}}\n" +
      "⏰ *Horário:* {{hora}}\n" +
      "✂️ *Serviço:* {{servico}}\n" +
      "👩‍💼 *Profissional:* {{profissional}}\n\n" +
      "✅ *Confirme seu agendamento:*\n{{link_confirmacao}}\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "dias_antes_agendamento", label: "1 dia antes", dias: 1, hora: "09:00" },
      { id: "a1", label: "Lembrete WhatsApp", tipo: "enviar_whatsapp", mensagem: "🔔 *Lembrete de Agendamento*\n\nOlá, *{{nome_cliente}}*! Passando pra lembrar que você tem um horário amanhã.\n\n📅 *Data:* {{data}}\n⏰ *Horário:* {{hora}}\n✂️ *Serviço:* {{servico}}\n👩‍💼 *Profissional:* {{profissional}}\n\n✅ *Confirme seu agendamento:*\n{{link_confirmacao}}\n\n_{{empresa}}_" },
    ),
  },

  // 3. Lembrete 2h antes
  {
    nome: "Lembrete 2h antes",
    descricao: "Envia lembrete 2 horas antes do horário do agendamento",
    tipoGatilho: "horas_antes_agendamento",
    delayMinutos: 120,
    canalEnvio: "whatsapp",
    corpoMensagem:
      "⏰ *Faltam 2 horas!*\n\n" +
      "Olá, *{{nome_cliente}}*! Seu horário de {{servico}} é daqui a pouco, às {{hora}}.\n\n" +
      "👩‍💼 *Profissional:* {{profissional}}\n\n" +
      "Te esperamos! 😊\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "horas_antes_agendamento", label: "2h antes", horas: 2 },
      { id: "a1", label: "Lembrete 2h", tipo: "enviar_whatsapp", mensagem: "⏰ *Faltam 2 horas!*\n\nOlá, *{{nome_cliente}}*! Seu horário de {{servico}} é daqui a pouco, às {{hora}}.\n\n👩‍💼 *Profissional:* {{profissional}}\n\nTe esperamos! 😊\n\n_{{empresa}}_" },
    ),
  },

  // 4. Agendamento confirmado
  {
    nome: "Agendamento confirmado",
    descricao: "Notifica o cliente quando o agendamento é confirmado pelo profissional",
    tipoGatilho: "evento",
    evento: "agendamento_confirmado",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "✅ *Agendamento Confirmado!*\n\n" +
      "Olá, *{{nome_cliente}}*! Seu agendamento foi confirmado.\n\n" +
      "📅 *Data:* {{data}}\n" +
      "⏰ *Horário:* {{hora}}\n" +
      "✂️ *Serviço:* {{servico}}\n" +
      "👩‍💼 *Profissional:* {{profissional}}\n\n" +
      "Nos vemos em breve! 💜\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "evento_agendamento_confirmado", label: "Agendamento confirmado" },
      { id: "a1", label: "Notificar confirmação", tipo: "enviar_whatsapp", mensagem: "✅ *Agendamento Confirmado!*\n\nOlá, *{{nome_cliente}}*! Seu agendamento foi confirmado.\n\n📅 *Data:* {{data}}\n⏰ *Horário:* {{hora}}\n✂️ *Serviço:* {{servico}}\n👩‍💼 *Profissional:* {{profissional}}\n\nNos vemos em breve! 💜\n\n_{{empresa}}_" },
    ),
  },

  // 5. Agendamento cancelado
  {
    nome: "Aviso de cancelamento",
    descricao: "Notifica o cliente quando um agendamento é cancelado",
    tipoGatilho: "evento",
    evento: "agendamento_cancelado",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "❌ *Agendamento Cancelado*\n\n" +
      "Olá, *{{nome_cliente}}*. Seu agendamento de {{servico}} em {{data}} às {{hora}} foi cancelado.\n\n" +
      "Se desejar reagendar, acesse:\n{{link_agendamento}}\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "evento_agendamento_cancelado", label: "Agendamento cancelado" },
      { id: "a1", label: "Aviso cancelamento", tipo: "enviar_whatsapp", mensagem: "❌ *Agendamento Cancelado*\n\nOlá, *{{nome_cliente}}*. Seu agendamento de {{servico}} em {{data}} às {{hora}} foi cancelado.\n\nSe desejar reagendar, acesse:\n{{link_agendamento}}\n\n_{{empresa}}_" },
    ),
  },

  // 6. Feedback pós-atendimento (3h após conclusão)
  {
    nome: "Feedback pós-atendimento",
    descricao: "Solicita feedback 3 horas após o atendimento ser concluído",
    tipoGatilho: "horas_apos_agendamento",
    delayMinutos: 180,
    canalEnvio: "whatsapp",
    corpoMensagem:
      "💬 *Como foi seu atendimento?*\n\n" +
      "Olá, *{{nome_cliente}}*! Esperamos que esteja bem! 😊\n\n" +
      "Seu feedback é muito importante pra continuarmos melhorando.\n\n" +
      "De 1 a 5, como você avalia o atendimento de hoje?\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "horas_apos_agendamento", label: "3h após atendimento", horas: 3 },
      { id: "a1", label: "Pedir feedback", tipo: "enviar_whatsapp", mensagem: "💬 *Como foi seu atendimento?*\n\nOlá, *{{nome_cliente}}*! Esperamos que esteja bem! 😊\n\nSeu feedback é muito importante pra continuarmos melhorando.\n\nDe 1 a 5, como você avalia o atendimento de hoje?\n\n_{{empresa}}_" },
    ),
  },

  // 7. Reagendamento (30 dias após)
  {
    nome: "Convite de reagendamento",
    descricao: "Convida o cliente a reagendar 30 dias após o último atendimento",
    tipoGatilho: "dias_depois_agendamento",
    diasAntesDepois: 30,
    horaDisparo: "10:00",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "💜 *Sentimos sua falta!*\n\n" +
      "Olá, *{{nome_cliente}}*! Faz 30 dias desde seu último {{servico}}.\n\n" +
      "Que tal agendar novamente? Estamos com horários disponíveis!\n\n" +
      "📅 Agende agora: {{link_agendamento}}\n\n" +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "dias_depois_agendamento", label: "30 dias depois", dias: 30, hora: "10:00" },
      { id: "a1", label: "Convite reagendamento", tipo: "enviar_whatsapp", mensagem: "💜 *Sentimos sua falta!*\n\nOlá, *{{nome_cliente}}*! Faz 30 dias desde seu último {{servico}}.\n\nQue tal agendar novamente? Estamos com horários disponíveis!\n\n📅 Agende agora: {{link_agendamento}}\n\n_{{empresa}}_" },
    ),
  },

  // 8. Reserva paga / sinal confirmado
  {
    nome: "Reserva paga",
    descricao: "Notifica o cliente quando o sinal/reserva é confirmado",
    tipoGatilho: "evento",
    evento: "reserva_paga",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "✅ *Reserva Confirmada!*\n\n" +
      "Olá, *{{nome_cliente}}*! Sua reserva foi confirmada com sucesso.\n\n" +
      "📅 *Data:* {{data}}\n" +
      "⏰ *Horário:* {{hora}}\n" +
      "✂️ *Serviço:* {{servico}}\n" +
      "👩‍💼 *Profissional:* {{profissional}}\n" +
      ("🔒 *Reserva paga:* {{valor_reserva}}\n\n" ) +
      "_{{empresa}}_",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "evento_reserva_paga", label: "Reserva paga / sinal confirmado" },
      { id: "a1", label: "Confirmação de reserva", tipo: "enviar_whatsapp", mensagem: "✅ *Reserva Confirmada!*\n\nOlá, *{{nome_cliente}}*! Sua reserva foi confirmada com sucesso.\n\n📅 *Data:* {{data}}\n⏰ *Horário:* {{hora}}\n✂️ *Serviço:* {{servico}}\n👩‍💼 *Profissional:* {{profissional}}\n🔒 *Reserva paga:* {{valor_reserva}}\n\n_{{empresa}}_" },
    ),
  },

  // 9. Crédito gerado
  {
    nome: "Notificação de crédito",
    descricao: "Notifica o cliente quando um crédito é adicionado à sua conta",
    tipoGatilho: "evento",
    evento: "credito_gerado",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "💰 *Crédito Disponível!*\n\n" +
      "Olá, *{{nome_cliente}}*! Um crédito foi adicionado à sua conta.\n\n" +
      "📊 *Detalhes:*\n" +
      "• Valor adicionado: *{{valor}}*\n" +
      "• Saldo total: *{{saldo_total}}*\n\n" +
      "_{{empresa}}_\n\n" +
      "_Seu crédito será descontado automaticamente no próximo atendimento._",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "evento_credito_gerado", label: "Crédito gerado" },
      { id: "a1", label: "Notificar crédito", tipo: "enviar_whatsapp", mensagem: "💰 *Crédito Disponível!*\n\nOlá, *{{nome_cliente}}*! Um crédito foi adicionado à sua conta.\n\n📊 *Detalhes:*\n• Valor adicionado: *{{valor}}*\n• Saldo total: *{{saldo_total}}*\n\n_{{empresa}}_\n\n_Seu crédito será descontado automaticamente no próximo atendimento._" },
    ),
  },

  // 10. Aniversariante do mês
  {
    nome: "Aniversariante do mês",
    descricao: "Mensagem especial no mês de aniversário do cliente",
    tipoGatilho: "aniversario_mes",
    horaDisparo: "09:00",
    canalEnvio: "whatsapp",
    corpoMensagem:
      "🎂 *Feliz mês do seu aniversário!*\n\n" +
      "Olá, *{{nome_cliente}}*! Neste mês especial, preparamos um desconto exclusivo pra você.\n\n" +
      "Agende seu horário e aproveite:\n{{link_agendamento}}\n\n" +
      "Com carinho, _{{empresa}}_ 💜",
    flowJson: buildFlowJson(
      { id: "t1", tipo: "aniversario_mes", label: "Aniversário do mês" },
      { id: "a1", label: "Mensagem aniversário", tipo: "enviar_whatsapp", mensagem: "🎂 *Feliz mês do seu aniversário!*\n\nOlá, *{{nome_cliente}}*! Neste mês especial, preparamos um desconto exclusivo pra você.\n\nAgende seu horário e aproveite:\n{{link_agendamento}}\n\nCom carinho, _{{empresa}}_ 💜" },
    ),
  },
];

// ─── PROVISIONAMENTO ─────────────────────────────────────────────────────────

/**
 * Cria as automações default para uma nova empresa.
 * Só deve ser chamado ao criar empresa — empresas existentes não são afetadas.
 */
export async function provisionarAutomacoesDefault(empresaId: number): Promise<void> {
  try {
    const automacaoIds: { id: number; nome: string; tipoGatilho: string; evento?: string }[] = [];

    for (const template of AUTOMATION_TEMPLATES) {
      const id = await createAutomacao({
        empresaId,
        nome: template.nome,
        descricao: template.descricao,
        tipoGatilho: template.tipoGatilho,
        evento: template.evento,
        diasAntesDepois: template.diasAntesDepois,
        delayMinutos: template.delayMinutos,
        horaDisparo: template.horaDisparo,
        dataFixaDia: template.dataFixaDia,
        dataFixaMes: template.dataFixaMes,
        canalEnvio: template.canalEnvio,
        corpoMensagem: template.corpoMensagem,
        flowJson: template.flowJson,
        ativo: true,
        isTemplate: true,
      });

      automacaoIds.push({
        id,
        nome: template.nome,
        tipoGatilho: template.tipoGatilho,
        evento: template.evento,
      });
    }

    // Gerar pipeline default baseado nas automações criadas
    await gerarPipelineDefault(empresaId, automacaoIds);

    console.log(`[Templates] ${AUTOMATION_TEMPLATES.length} automações + pipeline criados para empresa ${empresaId}`);
  } catch (err) {
    console.error(`[Templates] Erro ao provisionar automações para empresa ${empresaId}:`, err);
  }
}

/**
 * Gera um pipeline Kanban default baseado nas automações provisionadas.
 * Usa estrutura fixa (sem IA) para ser instantâneo.
 */
async function gerarPipelineDefault(
  empresaId: number,
  automacoes: { id: number; nome: string; tipoGatilho: string; evento?: string }[],
): Promise<void> {
  try {
    const pipelines = await getPipelinesByEmpresa(empresaId);

    const novoPipeline = await createPipeline({
      empresaId,
      nome: "Jornada do Cliente",
      ordem: pipelines.length,
    });

    const colunas = [
      { nome: "Agendado", cor: "#6366f1", descricao: "Agendamento criado" },
      { nome: "Lembrete Enviado", cor: "#f59e0b", descricao: "Lembrete enviado antes do atendimento" },
      { nome: "Confirmado", cor: "#10b981", descricao: "Agendamento confirmado" },
      { nome: "Atendido", cor: "#0ea5e9", descricao: "Atendimento concluído" },
      { nome: "Feedback", cor: "#8b5cf6", descricao: "Feedback solicitado" },
    ];

    for (let i = 0; i < colunas.length; i++) {
      await createColuna({
        pipelineId: novoPipeline.id,
        empresaId,
        nome: colunas[i].nome,
        cor: colunas[i].cor,
        ordem: i,
      });
    }

    console.log(`[Templates] Pipeline "Jornada do Cliente" criado para empresa ${empresaId}`);
  } catch (err) {
    console.error(`[Templates] Erro ao gerar pipeline para empresa ${empresaId}:`, err);
  }
}

/**
 * Provisiona automações de novos tipos (reserva_paga, credito_gerado) para empresas existentes
 * que ainda não possuem essas automações. Seguro para rodar múltiplas vezes (idempotente).
 */
export async function provisionarNovosTemplatesParaEmpresasExistentes(): Promise<void> {
  try {
    const { getDb } = await import('./db');
    const db = await getDb();
    if (!db) return;

    const { empresas } = await import('../drizzle/schema');
    const todasEmpresas = await db.select({ id: empresas.id, nome: empresas.nome }).from(empresas);

    const novosEventos = ['reserva_paga', 'credito_gerado'];
    const templatesPorEvento = new Map<string, AutomacaoTemplate>();
    for (const t of AUTOMATION_TEMPLATES) {
      if (t.evento && novosEventos.includes(t.evento)) {
        templatesPorEvento.set(t.evento, t);
      }
    }

    let totalCriados = 0;

    for (const empresa of todasEmpresas) {
      for (const evento of novosEventos) {
        // Verificar se já existe automação para este evento nesta empresa
        const existente = await getAutomacaoByEvento(empresa.id, evento);
        if (existente) continue; // já existe, pular

        const template = templatesPorEvento.get(evento);
        if (!template) continue;

        await createAutomacao({
          empresaId: empresa.id,
          nome: template.nome,
          descricao: template.descricao,
          tipoGatilho: template.tipoGatilho,
          evento: template.evento,
          diasAntesDepois: template.diasAntesDepois,
          delayMinutos: template.delayMinutos,
          horaDisparo: template.horaDisparo,
          dataFixaDia: template.dataFixaDia,
          dataFixaMes: template.dataFixaMes,
          canalEnvio: template.canalEnvio,
          corpoMensagem: template.corpoMensagem,
          flowJson: template.flowJson,
          ativo: true,
          isTemplate: true,
        });

        totalCriados++;
        console.log(`[Templates] Criada automação "${template.nome}" para empresa ${empresa.nome} (${empresa.id})`);
      }
    }

    if (totalCriados > 0) {
      console.log(`[Templates] ${totalCriados} nova(s) automação(ões) provisionada(s) para empresas existentes.`);
    } else {
      console.log(`[Templates] Todas as empresas já possuem os novos tipos de automação.`);
    }
  } catch (err) {
    console.error('[Templates] Erro ao provisionar novos templates para empresas existentes:', err);
  }
}
