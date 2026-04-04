/**
 * Scheduler — tarefas agendadas do servidor
 * Executa verificações periódicas sem depender de ação do usuário.
 */
import { getDb, registrarEnvioAutomacao, getAutomacaoByTipoGatilho } from "./db";
import {
  pacotesClientes,
  pacotesClientesItens,
  notificacoesPacotes,
  clientes,
  empresas,
  agendamentos,
  profissionais,
  servicos,
} from "../drizzle/schema";
import { eq, and, lte, gt, sql, gte, lt } from "drizzle-orm";
import { gerarTokenConfirmacao } from "./confirmacao";
import { waManager } from "./whatsapp";

// ── Verificar pacotes vencendo para todas as empresas ─────────────────────────
async function verificarPacotesVencendoGlobal() {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();
  const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // Buscar todas as empresas ativas
    const todasEmpresas = await db.select({ id: empresas.id }).from(empresas);

    let totalCriadas = 0;

    for (const empresa of todasEmpresas) {
      const empId = empresa.id;

      // ── 1. Pacotes com vencimento próximo (até 7 dias) ──────────────────────
      const pacotesVencendo = await db.select({
        id: pacotesClientes.id,
        clienteId: pacotesClientes.clienteId,
        dataVencimento: pacotesClientes.dataVencimento,
        clienteNome: clientes.nome,
      })
        .from(pacotesClientes)
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          eq(pacotesClientes.status, "ativo"),
          lte(pacotesClientes.dataVencimento, em7Dias),
          gt(pacotesClientes.dataVencimento, agora),
        ));

      for (const pacote of pacotesVencendo) {
        if (!pacote.dataVencimento) continue;
        const venc = new Date(pacote.dataVencimento);
        const diffMs = venc.getTime() - agora.getTime();
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Verificar se já existe notificação recente (últimas 24h)
        const [existente] = await db.select({ id: notificacoesPacotes.id })
          .from(notificacoesPacotes)
          .where(and(
            eq(notificacoesPacotes.pacoteClienteId, pacote.id),
            eq(notificacoesPacotes.tipo, "vencimento_proximo"),
            sql`${notificacoesPacotes.enviadoEm} > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
          ))
          .limit(1);

        if (existente) continue;

        // Buscar sessões restantes
        const itens = await db.select({
          quantidadeTotal: pacotesClientesItens.quantidadeTotal,
          quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        })
          .from(pacotesClientesItens)
          .where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));

        const totalSessoes = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
        const sessoesUsadas = itens.reduce((s, i) => s + i.quantidadeUsada, 0);
        const sessoesRestantes = totalSessoes - sessoesUsadas;

        if (sessoesRestantes <= 0) continue;

        const urgencia = diasRestantes <= 3 ? "URGENTE - " : "";
        const mensagem = `${urgencia}Pacote de ${pacote.clienteNome ?? "cliente"} vence em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}. ${sessoesRestantes} sessão(ões) ainda disponível(is).`;

        await db.insert(notificacoesPacotes).values({
          empresaId: empId,
          pacoteClienteId: pacote.id,
          clienteId: pacote.clienteId,
          tipo: "vencimento_proximo",
          mensagem,
          diasParaVencer: diasRestantes,
          sessoesRestantes,
          canal: "sistema",
          lida: false,
        });
        totalCriadas++;
      }

      // ── 2. Pacotes com poucas sessões restantes (1 ou 2) ───────────────────
      const pacotesAtivos = await db.select({
        id: pacotesClientes.id,
        clienteId: pacotesClientes.clienteId,
        clienteNome: clientes.nome,
      })
        .from(pacotesClientes)
        .leftJoin(clientes, eq(pacotesClientes.clienteId, clientes.id))
        .where(and(
          eq(pacotesClientes.empresaId, empId),
          eq(pacotesClientes.status, "ativo"),
        ));

      for (const pacote of pacotesAtivos) {
        const itens = await db.select({
          quantidadeTotal: pacotesClientesItens.quantidadeTotal,
          quantidadeUsada: pacotesClientesItens.quantidadeUsada,
        })
          .from(pacotesClientesItens)
          .where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));

        const totalSessoes = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
        const sessoesUsadas = itens.reduce((s, i) => s + i.quantidadeUsada, 0);
        const sessoesRestantes = totalSessoes - sessoesUsadas;

        if (sessoesRestantes > 2 || sessoesRestantes <= 0) continue;

        // Verificar se já existe notificação recente (últimas 48h)
        const [existente] = await db.select({ id: notificacoesPacotes.id })
          .from(notificacoesPacotes)
          .where(and(
            eq(notificacoesPacotes.pacoteClienteId, pacote.id),
            eq(notificacoesPacotes.tipo, "sessoes_restantes"),
            sql`${notificacoesPacotes.enviadoEm} > DATE_SUB(NOW(), INTERVAL 48 HOUR)`,
          ))
          .limit(1);

        if (existente) continue;

        const mensagem = `Atenção: ${pacote.clienteNome ?? "Cliente"} tem apenas ${sessoesRestantes} sessão(ões) restante(s) no pacote. Considere renovar.`;

        await db.insert(notificacoesPacotes).values({
          empresaId: empId,
          pacoteClienteId: pacote.id,
          clienteId: pacote.clienteId,
          tipo: "sessoes_restantes",
          mensagem,
          diasParaVencer: null,
          sessoesRestantes,
          canal: "sistema",
          lida: false,
        });
        totalCriadas++;
      }
    }

    if (totalCriadas > 0) {
      console.log(`[Scheduler] ${totalCriadas} notificação(ões) de pacotes gerada(s) em ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error("[Scheduler] Erro ao verificar pacotes:", err);
  }
}

// ── Enviar lembretes de agendamentos do dia seguinte ─────────────────────────
async function enviarLembretesAgendamentos() {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();
  // Calcular início e fim de amanhã
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const depoisDeAmanha = new Date(amanha);
  depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1);

  try {
    // Buscar agendamentos de amanhã com status agendado ou confirmado
    const agendamentosAmanha = await db
      .select({
        id: agendamentos.id,
        empresaId: agendamentos.empresaId,
        clienteId: agendamentos.clienteId,
        profissionalId: agendamentos.profissionalId,
        servicoId: agendamentos.servicoId,
        data: agendamentos.data,
        horaInicio: agendamentos.horaInicio,
        valorTotal: agendamentos.valorTotal,
        status: agendamentos.status,
        clienteNome: clientes.nome,
        clienteTelefone: clientes.telefone,
        profissionalNome: profissionais.nome,
        servicoNome: servicos.nome,
        empresaNome: empresas.nome,
        waMsgLembrete: empresas.waMsgLembrete,
        reservaPercentual: empresas.reservaPercentual,
      })
      .from(agendamentos)
      .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
      .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .leftJoin(empresas, eq(agendamentos.empresaId, empresas.id))
      .where(
        and(
          sql`${agendamentos.data} >= ${amanha.toISOString().slice(0, 10)}`,
          sql`${agendamentos.data} < ${depoisDeAmanha.toISOString().slice(0, 10)}`,
          sql`${agendamentos.status} IN ('agendado', 'confirmado')`,
        )
      );

    let enviados = 0;

    for (const ag of agendamentosAmanha) {
      if (!ag.clienteTelefone) continue;

      // Gerar token de confirmação
      const origin = process.env.VITE_FRONTEND_FORGE_API_URL
        ? (process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space')
        : 'https://agendei-app-bkct9rps.manus.space';

      let linkConfirmacao = '';
      try {
        const token = await gerarTokenConfirmacao(ag.id, ag.empresaId);
        linkConfirmacao = `${origin}/confirmar/${token}`;
      } catch (e) {
        console.error(`[Scheduler] Erro ao gerar token para agendamento ${ag.id}:`, e);
      }

      // Calcular valor_reserva
      const percentual = parseFloat(String(ag.reservaPercentual ?? '0'));
      const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
      const valorReserva = percentual > 0 ? (valorTotal * percentual / 100).toFixed(2) : '0.00';

      // Formatar data e hora
      const dataFormatada = ag.data
        ? new Date(ag.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const horaFormatada = ag.horaInicio ?? '';

      // Buscar automação configurada para lembrete (dias_antes_agendamento) da empresa
      const automacaoLembrete = await getAutomacaoByTipoGatilho(ag.empresaId, 'dias_antes_agendamento');

      // Montar variáveis de template
      const templateVarsLembrete = {
        nome_cliente: ag.clienteNome ?? '',
        servico: ag.servicoNome ?? '',
        data: dataFormatada,
        hora: horaFormatada,
        profissional: ag.profissionalNome ?? '',
        empresa: ag.empresaNome ?? '',
        valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
        valor_reserva: `R$ ${valorReserva.replace('.', ',')}`,
        link_confirmacao: linkConfirmacao,
      };

      // Montar mensagem: usar corpoMensagem da automação configurada, ou fallback no campo waMsgLembrete da empresa, ou mensagem padrão
      let mensagem: string;
      if (automacaoLembrete?.corpoMensagem) {
        // Usar template da automação configurada pelo usuário
        mensagem = automacaoLembrete.corpoMensagem
          .replace(/\{\{nome_cliente\}\}/g, templateVarsLembrete.nome_cliente)
          .replace(/\{\{servico\}\}/g, templateVarsLembrete.servico)
          .replace(/\{\{data\}\}/g, templateVarsLembrete.data)
          .replace(/\{\{hora\}\}/g, templateVarsLembrete.hora)
          .replace(/\{\{profissional\}\}/g, templateVarsLembrete.profissional)
          .replace(/\{\{empresa\}\}/g, templateVarsLembrete.empresa)
          .replace(/\{\{valor\}\}/g, templateVarsLembrete.valor)
          .replace(/\{\{valor_reserva\}\}/g, templateVarsLembrete.valor_reserva)
          .replace(/\{\{link_confirmacao\}\}/g, templateVarsLembrete.link_confirmacao);
      } else if (ag.waMsgLembrete) {
        // Fallback: campo waMsgLembrete da empresa (legado)
        mensagem = ag.waMsgLembrete
          .replace(/\{\{nome_cliente\}\}/g, ag.clienteNome ?? '')
          .replace(/\{\{servico\}\}/g, ag.servicoNome ?? '')
          .replace(/\{\{data\}\}/g, dataFormatada)
          .replace(/\{\{hora\}\}/g, horaFormatada)
          .replace(/\{\{profissional\}\}/g, ag.profissionalNome ?? '')
          .replace(/\{\{empresa\}\}/g, ag.empresaNome ?? '')
          .replace(/\{\{valor\}\}/g, `R$ ${valorTotal.toFixed(2).replace('.', ',')}`)
          .replace(/\{\{valor_reserva\}\}/g, `R$ ${valorReserva.replace('.', ',')}`)
          .replace(/\{\{link_confirmacao\}\}/g, linkConfirmacao);
      } else {
        // Mensagem padrão
        const confirmacaoTexto = linkConfirmacao
          ? `\n\n✅ *Confirme seu agendamento:*\n${linkConfirmacao}`
          : '';
        mensagem =
          `🔔 *Lembrete de Agendamento*\n\n` +
          `Olá, *${ag.clienteNome ?? 'cliente'}*!\n\n` +
          `Você tem um agendamento amanhã:\n\n` +
          `📋 *Detalhes:*\n` +
          `• Serviço: ${ag.servicoNome ?? ''}\n` +
          `• Profissional: ${ag.profissionalNome ?? ''}\n` +
          `• Data: ${dataFormatada}\n` +
          `• Horário: ${horaFormatada}\n` +
          (valorReserva !== '0.00' ? `• Reserva: R$ ${valorReserva.replace('.', ',')}\n` : '') +
          `\n📍 *${ag.empresaNome ?? ''}*` +
          confirmacaoTexto;
      }

      const enviado = await waManager.sendMessage(ag.clienteTelefone, mensagem);
      // Registrar no histórico de envios
      await registrarEnvioAutomacao({
        empresaId: ag.empresaId,
        automacaoId: automacaoLembrete?.id,
        automacaoNome: automacaoLembrete?.nome ?? 'Lembrete Automático',
        clienteId: ag.clienteId ?? undefined,
        clienteNome: ag.clienteNome ?? undefined,
        telefone: ag.clienteTelefone,
        canal: 'lembrete',
        mensagem,
        status: enviado ? 'enviado' : 'falhou',
        erroDetalhe: enviado ? undefined : 'Falha ao enviar via WhatsApp',
      }).catch(() => {});
      if (enviado) enviados++;
    }

    if (agendamentosAmanha.length > 0) {
      console.log(`[Scheduler] Lembretes: ${enviados}/${agendamentosAmanha.length} enviados para agendamentos de amanhã.`);
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao enviar lembretes:', err);
  }
}

// ── Verificar se é hora de executar tarefa (baseado em hora local) ────────────
function deveExecutarNaHora(horaAlvo: number): boolean {
  const agora = new Date();
  return agora.getHours() === horaAlvo && agora.getMinutes() < 5; // janela de 5 minutos
}

// ── Inicializar agendamento ───────────────────────────────────────────────────
export function initScheduler() {
  // Executar imediatamente ao iniciar (após 30s para o DB estar pronto)
  setTimeout(() => {
    verificarPacotesVencendoGlobal();
  }, 30_000);

  // Executar a cada 6 horas
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    verificarPacotesVencendoGlobal();
  }, INTERVAL_MS);

  // Verificar a cada 5 minutos se é hora de enviar lembretes (às 9h)
  const LEMBRETE_CHECK_MS = 5 * 60 * 1000;
  setInterval(() => {
    if (deveExecutarNaHora(9)) {
      enviarLembretesAgendamentos();
    }
  }, LEMBRETE_CHECK_MS);

  console.log("[Scheduler] Verificação automática de pacotes inicializada (a cada 6h).");
  console.log("[Scheduler] Lembretes automáticos de agendamento inicializados (às 9h diariamente).");
}
