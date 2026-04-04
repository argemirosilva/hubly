/**
 * Scheduler — tarefas agendadas do servidor
 * Executa verificações periódicas sem depender de ação do usuário.
 */
import { getDb, registrarEnvioAutomacao, getAutomacaoByTipoGatilho, jaEnviouLembrete, getAutomacoesAtivasByTipo, getEmpresasComAutomacoes } from "./db";
import {
  pacotesClientes,
  pacotesClientesItens,
  notificacoesPacotes,
  clientes,
  empresas,
  agendamentos,
  profissionais,
  servicos,
  historicoEnviosAutomacao,
  automacoes,
} from "../drizzle/schema";
import { eq, and, lte, gt, sql, gte, lt, isNull, or } from "drizzle-orm";
import { gerarTokenConfirmacao } from "./confirmacao";
import { waManager } from "./whatsapp";

// Helper: normalizar campo data (Date object ou string) para formato YYYY-MM-DD
function getDataStr(data: unknown): string {
  if (data instanceof Date) {
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth()+1).padStart(2,'0')}-${String(data.getUTCDate()).padStart(2,'0')}`;
  }
  return String(data).slice(0, 10);
}

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
        primeiro_nome: (ag.clienteNome ?? '').split(' ')[0],
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

// ─────────────────────────────────────────────────────────────────────────────
// NOVO: Processar automações configuradas (dias_antes_agendamento / horas_apos_agendamento)
// Roda a cada 15 minutos e dispara para cada automação ativa baseado nos campos
// diasAntesDepois e horaDisparo configurados pelo usuário.
// ─────────────────────────────────────────────────────────────────────────────
async function processarAutomacoesAgendadas() {
  const db = await getDb();
  if (!db) { console.log('[Scheduler] processarAutomacoesAgendadas: DB não disponível'); return; }

  const agora = new Date();
  const JANELA_MS = 15 * 60 * 1000; // janela de 15 minutos

  console.log(`[Scheduler] processarAutomacoesAgendadas iniciado em ${agora.toISOString()}`);

  try {
    // Buscar todas as empresas que têm automações ativas dos tipos agendados
    const empresasDiasAntes = await getEmpresasComAutomacoes('dias_antes_agendamento');
    const empresasHorasAntes = await getEmpresasComAutomacoes('horas_antes_agendamento');
    const empresasHorasApos = await getEmpresasComAutomacoes('horas_apos_agendamento');
    const empresasDiasDepois = await getEmpresasComAutomacoes('dias_depois_agendamento');
    const todasEmpresas = Array.from(new Set([...empresasDiasAntes, ...empresasHorasAntes, ...empresasHorasApos, ...empresasDiasDepois]));

    console.log(`[Scheduler] Empresas com automações: dias_antes=${empresasDiasAntes.length}, horas_antes=${empresasHorasAntes.length}, horas_apos=${empresasHorasApos.length}, total=${todasEmpresas.length}`);

    if (todasEmpresas.length === 0) return;

    const origin = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';

    for (const empresaId of todasEmpresas) {
      // ── Processar automações do tipo dias_antes_agendamento ──────────────────
      const automacoesAntes = await getAutomacoesAtivasByTipo(empresaId, 'dias_antes_agendamento');

      for (const automacao of automacoesAntes) {
        const dias = automacao.diasAntesDepois ?? 1;
        const horaDisparo = automacao.horaDisparo ?? '09:00:00';
        const [hStr, mStr] = horaDisparo.split(':');
        const horaAlvo = parseInt(hStr, 10);
        const minAlvo = parseInt(mStr, 10);

        // Calcular a data alvo do agendamento: hoje + dias
        const dataAlvo = new Date(agora);
        dataAlvo.setDate(dataAlvo.getDate() + dias);
        const dataAlvoStr = dataAlvo.toISOString().slice(0, 10);

        // Verificar se estamos na janela de disparo (hora atual ≈ horaDisparo)
        const horaAtual = agora.getHours();
        const minAtual = agora.getMinutes();
        const minutosAgora = horaAtual * 60 + minAtual;
        const minutosAlvo = horaAlvo * 60 + minAlvo;
        const dentroJanela = Math.abs(minutosAgora - minutosAlvo) <= 15;
        if (!dentroJanela) continue;

        // Buscar agendamentos da data alvo
        const ags = await db
          .select({
            id: agendamentos.id,
            empresaId: agendamentos.empresaId,
            clienteId: agendamentos.clienteId,
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
          .where(and(
            eq(agendamentos.empresaId, empresaId),
            sql`${agendamentos.data} = ${dataAlvoStr}`,
            sql`${agendamentos.status} IN ('agendado', 'confirmado')`,
          ));

        for (const ag of ags) {
          if (!ag.clienteTelefone) continue;

          // Deduplicação: verificar se já enviou para este agendamento+automação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          // Gerar link de confirmação
          let linkConfirmacao = '';
          try {
            const token = await gerarTokenConfirmacao(ag.id, ag.empresaId);
            linkConfirmacao = `${origin}/confirmar/${token}`;
          } catch (e) {
            console.error(`[Scheduler] Erro ao gerar token para agendamento ${ag.id}:`, e);
          }

          // Montar mensagem
          const percentual = parseFloat(String(ag.reservaPercentual ?? '0'));
          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const valorReserva = percentual > 0 ? (valorTotal * percentual / 100).toFixed(2) : '0.00';
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';
          const horaFormatada = ag.horaInicio ?? '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
            primeiro_nome: (ag.clienteNome ?? '').split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: horaFormatada,
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            valor_reserva: `R$ ${valorReserva.replace('.', ',')}`,
            link_confirmacao: linkConfirmacao,
            dias_antes: String(dias),
          };

          let mensagem: string;
          if (automacao.corpoMensagem) {
            mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');
          } else {
            const confirmacaoTexto = linkConfirmacao ? `\n\n✅ *Confirme seu agendamento:*\n${linkConfirmacao}` : '';
            mensagem =
              `🔔 *Lembrete de Agendamento*\n\n` +
              `Olá, *${ag.clienteNome ?? 'cliente'}*!\n\n` +
              `Você tem um agendamento em ${dias} dia${dias !== 1 ? 's' : ''}:\n\n` +
              `📋 *Detalhes:*\n` +
              `• Serviço: ${ag.servicoNome ?? ''}\n` +
              `• Profissional: ${ag.profissionalNome ?? ''}\n` +
              `• Data: ${dataFormatada}\n` +
              `• Horário: ${horaFormatada}\n` +
              `\n📍 *${ag.empresaNome ?? ''}*` +
              confirmacaoTexto;
          }

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: ag.clienteId ?? undefined,
            clienteNome: ag.clienteNome ?? undefined,
            agendamentoId: ag.id,
            telefone: ag.clienteTelefone,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(), // deve ser enviado agora
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${dias}d antes): enfileirado para ${ag.clienteNome} (ag. ${ag.id})`);
        }
      }

      // ── Processar automações do tipo horas_antes_agendamento ──────────────────────────────────────────────
      const automacoesHorasAntes = await getAutomacoesAtivasByTipo(empresaId, 'horas_antes_agendamento');

      for (const automacao of automacoesHorasAntes) {
        // delayMinutos indica quantas horas antes do agendamento disparar
        const delayMin = automacao.delayMinutos ?? 60;
        const JANELA_INICIO = agora.getTime() - JANELA_MS;
        const JANELA_FIM = agora.getTime();

        // Buscar agendamentos cujo horário - delay cai na janela atual
        const dataMin = new Date(JANELA_INICIO + delayMin * 60 * 1000);
        const dataMax = new Date(JANELA_FIM + delayMin * 60 * 1000);
        const dataMinStr = dataMin.toISOString().slice(0, 10);
        const dataMaxStr = dataMax.toISOString().slice(0, 10);

        const ags = await db
          .select({
            id: agendamentos.id,
            empresaId: agendamentos.empresaId,
            clienteId: agendamentos.clienteId,
            data: agendamentos.data,
            horaInicio: agendamentos.horaInicio,
            valorTotal: agendamentos.valorTotal,
            status: agendamentos.status,
            clienteNome: clientes.nome,
            clienteTelefone: clientes.telefone,
            profissionalNome: profissionais.nome,
            servicoNome: servicos.nome,
            empresaNome: empresas.nome,
            reservaPercentual: empresas.reservaPercentual,
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
          .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
          .leftJoin(empresas, eq(agendamentos.empresaId, empresas.id))
          .where(and(
            eq(agendamentos.empresaId, empresaId),
            sql`${agendamentos.data} >= ${dataMinStr}`,
            sql`${agendamentos.data} <= ${dataMaxStr}`,
            sql`${agendamentos.status} IN ('agendado', 'confirmado')`,
          ));

        for (const ag of ags) {
          if (!ag.clienteTelefone || !ag.data || !ag.horaInicio) continue;

          // Calcular o timestamp exato do agendamento
          const [hAg, mAg] = ag.horaInicio.split(':');
          const agDataStr1 = getDataStr(ag.data);
          const tsAgendamento = new Date(`${agDataStr1}T${hAg.padStart(2,'0')}:${mAg.padStart(2,'0')}:00`).getTime();
          const tsDisparo = tsAgendamento - delayMin * 60 * 1000; // ANTES do agendamento

          // Verificar se o disparo cai na janela atual
          if (tsDisparo < JANELA_INICIO || tsDisparo > JANELA_FIM) continue;

          // Deduplicação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
            primeiro_nome: (ag.clienteNome ?? '').split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: ag.horaInicio ?? '',
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            horas_antes: String(Math.round(delayMin / 60)),
          };

          let mensagem: string;
          if (automacao.corpoMensagem) {
            mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');
          } else {
            mensagem =
              `⏰ *Lembrete de agendamento!*\n\n` +
              `Olá, *${ag.clienteNome ?? 'cliente'}*!\n\n` +
              `Você tem um agendamento em *${Math.round(delayMin / 60)}h*:\n` +
              `📌 *${ag.servicoNome ?? ''}* com *${ag.profissionalNome ?? ''}*\n` +
              `📅 *${dataFormatada}* às *${ag.horaInicio ?? ''}*\n\n` +
              `Nos vemos em breve! 😊`;
          }

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: ag.clienteId ?? undefined,
            clienteNome: ag.clienteNome ?? undefined,
            agendamentoId: ag.id,
            telefone: ag.clienteTelefone,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(), // deve ser enviado agora
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min antes): enfileirado para ${ag.clienteNome} (ag. ${ag.id})`);
        }
      }

      // ── Processar automações do tipo horas_apos_agendamento ──────────────────────────────────────────────
      const automacoesApos = await getAutomacoesAtivasByTipo(empresaId, 'horas_apos_agendamento');

      for (const automacao of automacoesApos) {
        // delayMinutos indica quantos minutos após o horário do agendamento disparar
        const delayMin = automacao.delayMinutos ?? 60;
        const JANELA_INICIO = agora.getTime() - JANELA_MS;
        const JANELA_FIM = agora.getTime();

        // Buscar agendamentos cujo horário + delay cai na janela atual
        // Como data e horaInicio são strings, calculamos no JS após buscar
        const dataMin = new Date(JANELA_INICIO - delayMin * 60 * 1000);
        const dataMax = new Date(JANELA_FIM - delayMin * 60 * 1000);
        const dataMinStr = dataMin.toISOString().slice(0, 10);
        const dataMaxStr = dataMax.toISOString().slice(0, 10);

        const ags = await db
          .select({
            id: agendamentos.id,
            empresaId: agendamentos.empresaId,
            clienteId: agendamentos.clienteId,
            data: agendamentos.data,
            horaInicio: agendamentos.horaInicio,
            valorTotal: agendamentos.valorTotal,
            status: agendamentos.status,
            clienteNome: clientes.nome,
            clienteTelefone: clientes.telefone,
            profissionalNome: profissionais.nome,
            servicoNome: servicos.nome,
            empresaNome: empresas.nome,
            reservaPercentual: empresas.reservaPercentual,
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
          .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
          .leftJoin(empresas, eq(agendamentos.empresaId, empresas.id))
          .where(and(
            eq(agendamentos.empresaId, empresaId),
            sql`${agendamentos.data} >= ${dataMinStr}`,
            sql`${agendamentos.data} <= ${dataMaxStr}`,
            sql`${agendamentos.status} IN ('concluido', 'confirmado', 'agendado')`,
          ));

        for (const ag of ags) {
          if (!ag.clienteTelefone || !ag.data || !ag.horaInicio) continue;

          // Calcular o timestamp exato do agendamento
          const [hAg, mAg] = ag.horaInicio.split(':');
          const agDataStr2 = getDataStr(ag.data);
          const tsAgendamento = new Date(`${agDataStr2}T${hAg.padStart(2,'0')}:${mAg.padStart(2,'0')}:00`).getTime();
          const tsDisparo = tsAgendamento + delayMin * 60 * 1000;

          // Verificar se o disparo cai na janela atual
          if (tsDisparo < JANELA_INICIO || tsDisparo > JANELA_FIM) continue;

          // Deduplicação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
            primeiro_nome: (ag.clienteNome ?? '').split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: ag.horaInicio ?? '',
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            horas_apos: String(Math.round(delayMin / 60)),
          };

          let mensagem: string;
          if (automacao.corpoMensagem) {
            mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');
          } else {
            mensagem =
              `⭐ *Obrigado pela visita!*\n\n` +
              `Olá, *${ag.clienteNome ?? 'cliente'}*!\n\n` +
              `Esperamos que tenha gostado do atendimento em *${ag.empresaNome ?? ''}*.\n\n` +
              `Até a próxima! 😊`;
          }

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: ag.clienteId ?? undefined,
            clienteNome: ag.clienteNome ?? undefined,
            agendamentoId: ag.id,
            telefone: ag.clienteTelefone,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(), // deve ser enviado agora
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min após): enfileirado para ${ag.clienteNome} (ag. ${ag.id})`);
        }
      }

      // ── Processar automações do tipo dias_depois_agendamento ──────────────────────────────────────────────
      const automacoesDiasDepois = await getAutomacoesAtivasByTipo(empresaId, 'dias_depois_agendamento');

      for (const automacao of automacoesDiasDepois) {
        const diasDepois = automacao.diasAntesDepois ?? 1;
        const horaDisparo = automacao.horaDisparo ?? '09:00';
        const [hDisp, mDisp] = horaDisparo.split(':');

        // Calcular a data alvo: agendamento + diasDepois dias
        const JANELA_INICIO = agora.getTime() - JANELA_MS;
        const JANELA_FIM = agora.getTime();

        // Buscar agendamentos cujo dia + diasDepois = hoje
        const dataAlvo = new Date(agora);
        dataAlvo.setDate(dataAlvo.getDate() - diasDepois);
        const dataAlvoStr = dataAlvo.toISOString().slice(0, 10);

        const ags = await db
          .select({
            id: agendamentos.id,
            empresaId: agendamentos.empresaId,
            clienteId: agendamentos.clienteId,
            data: agendamentos.data,
            horaInicio: agendamentos.horaInicio,
            valorTotal: agendamentos.valorTotal,
            status: agendamentos.status,
            clienteNome: clientes.nome,
            clienteTelefone: clientes.telefone,
            profissionalNome: profissionais.nome,
            servicoNome: servicos.nome,
            empresaNome: empresas.nome,
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
          .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
          .leftJoin(empresas, eq(agendamentos.empresaId, empresas.id))
          .where(and(
            eq(agendamentos.empresaId, empresaId),
            sql`${agendamentos.data} = ${dataAlvoStr}`,
            sql`${agendamentos.status} IN ('concluido', 'confirmado', 'agendado')`,
          ));

        for (const ag of ags) {
          if (!ag.clienteTelefone || !ag.data || !ag.horaInicio) continue;

          // Calcular o timestamp de disparo: data + diasDepois dias, na hora configurada
          const agDataStr3 = getDataStr(ag.data);
          const dataDisparo = new Date(`${agDataStr3}T${String(hDisp).padStart(2,'0')}:${String(mDisp).padStart(2,'0')}:00`);
          dataDisparo.setDate(dataDisparo.getDate() + diasDepois);
          const tsDisparo = dataDisparo.getTime();

          if (tsDisparo < JANELA_INICIO || tsDisparo > JANELA_FIM) continue;

          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
            primeiro_nome: (ag.clienteNome ?? '').split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: ag.horaInicio ?? '',
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            dias_depois: String(diasDepois),
          };

          let mensagem: string;
          if (automacao.corpoMensagem) {
            mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');
          } else {
            mensagem =
              `⭐ *Como foi sua experiência?*\n\n` +
              `Olá, *${ag.clienteNome ?? 'cliente'}*!\n\n` +
              `Faz ${diasDepois} dia(s) desde seu atendimento em *${ag.empresaNome ?? ''}*.\n\n` +
              `Esperamos que tenha gostado! Adoraríamos receber seu feedback. 😊`;
          }

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: ag.clienteId ?? undefined,
            clienteNome: ag.clienteNome ?? undefined,
            agendamentoId: ag.id,
            telefone: ag.clienteTelefone,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(), // deve ser enviado agora
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${diasDepois} dia(s) depois): enfileirado para ${ag.clienteNome} (ag. ${ag.id})`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao processar automações agendadas:', err);
  }
}

// ── Pré-registrar envios futuros como pendentes na fila ────────────────────
// Roda a cada hora e registra envios dos próximos 7 dias como 'pendente'
// para que a tela de Fila de Automações exiba os envios futuros.
async function preRegistrarEnviosPendentes() {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();
  const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

  console.log(`[Scheduler] preRegistrarEnviosPendentes iniciado em ${agora.toISOString()}`);

  try {
    // Buscar todas as empresas com automações ativas
    const empresasDiasAntes = await getEmpresasComAutomacoes('dias_antes_agendamento');
    const empresasHorasAntes = await getEmpresasComAutomacoes('horas_antes_agendamento');
    const empresasHorasApos = await getEmpresasComAutomacoes('horas_apos_agendamento');
    const empresasDiasDepois = await getEmpresasComAutomacoes('dias_depois_agendamento');
    const todasEmpresas = Array.from(new Set([...empresasDiasAntes, ...empresasHorasAntes, ...empresasHorasApos, ...empresasDiasDepois]));

    if (todasEmpresas.length === 0) return;

    for (const empresaId of todasEmpresas) {
      // Buscar agendamentos dos próximos 7 dias
      const dataInicioStr = agora.toISOString().slice(0, 10);
      const dataFimStr = em7Dias.toISOString().slice(0, 10);

      const ags = await db
        .select({
          id: agendamentos.id,
          empresaId: agendamentos.empresaId,
          clienteId: agendamentos.clienteId,
          data: agendamentos.data,
          horaInicio: agendamentos.horaInicio,
          status: agendamentos.status,
          clienteNome: clientes.nome,
          clienteTelefone: clientes.telefone,
          profissionalNome: profissionais.nome,
          servicoNome: servicos.nome,
          empresaNome: empresas.nome,
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
        .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
        .leftJoin(empresas, eq(agendamentos.empresaId, empresas.id))
        .where(and(
          eq(agendamentos.empresaId, empresaId),
          sql`${agendamentos.data} >= ${dataInicioStr}`,
          sql`${agendamentos.data} <= ${dataFimStr}`,
          sql`${agendamentos.status} IN ('agendado', 'confirmado')`,
        ));

      if (ags.length === 0) continue;

      // Para cada automação ativa, calcular quando cada agendamento será processado
      const todasAutomacoes = await db.select().from(automacoes).where(and(
        eq(automacoes.empresaId, empresaId),
        eq(automacoes.ativo, true),
        sql`${automacoes.tipoGatilho} IN ('dias_antes_agendamento', 'horas_antes_agendamento', 'horas_apos_agendamento', 'dias_depois_agendamento')`,
      ));

      for (const automacao of todasAutomacoes) {
        for (const ag of ags) {
          if (!ag.clienteTelefone || !ag.data || !ag.horaInicio) continue;

          // Normalizar o campo data (pode ser Date object ou string)
          const dataStr = getDataStr(ag.data);

          // Calcular quando este envio será disparado
          let enviarEm: Date | null = null;

          if (automacao.tipoGatilho === 'dias_antes_agendamento') {
            const dias = automacao.diasAntesDepois ?? 1;
            const horaDisparo = automacao.horaDisparo ?? '09:00:00';
            const [hStr, mStr] = horaDisparo.split(':');
            // Usar UTC para evitar problemas de timezone
            const [ano, mes, dia] = dataStr.split('-').map(Number);
            const dataDisparo = new Date(Date.UTC(ano, mes - 1, dia - dias, parseInt(hStr, 10), parseInt(mStr, 10), 0));
            enviarEm = dataDisparo;
          } else if (automacao.tipoGatilho === 'horas_antes_agendamento') {
            const delayMin = automacao.delayMinutos ?? 60;
            const [hAg, mAg] = ag.horaInicio.split(':');
            const [ano, mes, dia] = dataStr.split('-').map(Number);
            const tsAgendamento = Date.UTC(ano, mes - 1, dia, parseInt(hAg, 10), parseInt(mAg, 10), 0);
            enviarEm = new Date(tsAgendamento - delayMin * 60 * 1000);
          } else if (automacao.tipoGatilho === 'horas_apos_agendamento') {
            const delayMin = automacao.delayMinutos ?? 60;
            const [hAg, mAg] = ag.horaInicio.split(':');
            const [ano, mes, dia] = dataStr.split('-').map(Number);
            const tsAgendamento = Date.UTC(ano, mes - 1, dia, parseInt(hAg, 10), parseInt(mAg, 10), 0);
            enviarEm = new Date(tsAgendamento + delayMin * 60 * 1000);
          } else if (automacao.tipoGatilho === 'dias_depois_agendamento') {
            const dias = automacao.diasAntesDepois ?? 1;
            const horaDisparo = automacao.horaDisparo ?? '09:00:00';
            const [hStr, mStr] = horaDisparo.split(':');
            const [ano, mes, dia] = dataStr.split('-').map(Number);
            const dataDisparo = new Date(Date.UTC(ano, mes - 1, dia + dias, parseInt(hStr, 10), parseInt(mStr, 10), 0));
            enviarEm = dataDisparo;
          }

          if (!enviarEm) continue;

          // Só registrar se o envio é futuro
          if (enviarEm.getTime() <= agora.getTime()) continue;

          // Verificar se já existe registro (pendente ou enviado) para este agendamento+automação
          const jaExiste = await db.select({ id: historicoEnviosAutomacao.id })
            .from(historicoEnviosAutomacao)
            .where(and(
              eq(historicoEnviosAutomacao.empresaId, empresaId),
              eq(historicoEnviosAutomacao.automacaoId, automacao.id),
              eq(historicoEnviosAutomacao.agendamentoId, ag.id),
            ))
            .limit(1);

          if (jaExiste.length > 0) continue;

          // Registrar como pendente
          await db.insert(historicoEnviosAutomacao).values({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: ag.clienteId ?? null,
            clienteNome: ag.clienteNome ?? null,
            agendamentoId: ag.id,
            telefone: ag.clienteTelefone,
            canal: (automacao.canalEnvio ?? 'whatsapp') as any,
            mensagem: `[Pendente] Automação: ${automacao.nome} | Cliente: ${ag.clienteNome ?? ''} | Agendamento: ${ag.data} ${ag.horaInicio}`,
            status: 'pendente',
            enviarEm,
          }).catch(() => {}); // Ignorar erros de duplicata

          console.log(`[Scheduler] Pré-registrado pendente: ${automacao.nome} para ${ag.clienteNome} em ${enviarEm.toISOString()}`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao pré-registrar pendentes:', err);
  }
}

// ── Verificar se é hora de executar tarefa (baseado em hora local) ────────────────────
function deveExecutarNaHora(horaAlvo: number): boolean {const agora = new Date();
  return agora.getHours() === horaAlvo && agora.getMinutes() < 5; // janela de 5 minutos
}

// // ── Worker: processar fila de envios pendentes ────────────────────────────────────────────────
// Processa todos os pendentes com enviarEm <= agora.
// Expira itens com enviarEm + 4h < agora (remove da fila).
let _filaProcessando = false;
export async function processarFilaPendente() {
  if (_filaProcessando) return;
  _filaProcessando = true;
  try {
    const db = await getDb();
    if (!db) return;

    const agora = new Date();
    const expiracaoLimite = new Date(agora.getTime() - 4 * 60 * 60 * 1000); // agora - 4h

    // 1. Expirar itens pendentes com enviarEm + 4h < agora
    const expirados = await db
      .select({ id: historicoEnviosAutomacao.id })
      .from(historicoEnviosAutomacao)
      .where(and(
        eq(historicoEnviosAutomacao.status, 'pendente'),
        lte(historicoEnviosAutomacao.enviarEm, expiracaoLimite),
      ));

    if (expirados.length > 0) {
      for (const item of expirados) {
        await db.update(historicoEnviosAutomacao)
          .set({ status: 'falhou', erroDetalhe: 'Expirado: passou mais de 4h do horário de envio' })
          .where(eq(historicoEnviosAutomacao.id, item.id));
      }
      console.log(`[Fila] ${expirados.length} item(ns) expirado(s) e marcado(s) como falhou`);
    }

    // 2. Verificar se WhatsApp está conectado antes de tentar enviar
    const waState = waManager.getState();
    if (waState.status !== 'connected') return;

    // 3. Buscar pendentes com enviarEm <= agora
    const pendentes = await db
      .select()
      .from(historicoEnviosAutomacao)
      .where(and(
        eq(historicoEnviosAutomacao.status, 'pendente'),
        lte(historicoEnviosAutomacao.enviarEm, agora),
      ))
      .limit(50); // processar até 50 por ciclo

    if (pendentes.length === 0) return;

    console.log(`[Fila] Processando ${pendentes.length} envio(s) pendente(s)...`);

    for (const item of pendentes) {
      if (!item.telefone || !item.mensagem) {
        await db.update(historicoEnviosAutomacao)
          .set({ status: 'falhou', erroDetalhe: 'Telefone ou mensagem ausente' })
          .where(eq(historicoEnviosAutomacao.id, item.id));
        continue;
      }

      try {
        const enviado = await waManager.sendMessage(item.telefone, item.mensagem);
        await db.update(historicoEnviosAutomacao)
          .set({
            status: enviado ? 'enviado' : 'falhou',
            erroDetalhe: enviado ? null : 'Falha ao enviar via WhatsApp',
          })
          .where(eq(historicoEnviosAutomacao.id, item.id));

        if (enviado) {
          // Incrementar contador de uso
          try { await (await import('./db-plans')).incrementWhatsappCount(item.empresaId); } catch {}
          console.log(`[Fila] ✅ Enviado para ${item.clienteNome ?? item.telefone} (${item.automacaoNome ?? 'manual'})`);
        } else {
          console.log(`[Fila] ❌ Falhou para ${item.clienteNome ?? item.telefone}`);
        }
      } catch (err) {
        await db.update(historicoEnviosAutomacao)
          .set({ status: 'falhou', erroDetalhe: String(err) })
          .where(eq(historicoEnviosAutomacao.id, item.id));
        console.error(`[Fila] Erro ao enviar item ${item.id}:`, err);
      }
    }
  } finally {
    _filaProcessando = false;
  }
}

// ── Cancelar pré-agendamentos com reserva expirada ──────────────────────────
async function cancelarPreAgendamentosExpirados() {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();

  try {
    // Buscar todas as empresas com reservaHorasExpiracao configurado
    const todasEmpresas = await db.select({
      id: empresas.id,
      nome: empresas.nome,
      reservaHorasExpiracao: empresas.reservaHorasExpiracao,
    }).from(empresas);

    let totalCancelados = 0;

    for (const empresa of todasEmpresas) {
      const horasExpiracao = empresa.reservaHorasExpiracao ?? 24;

      // Buscar pré-agendamentos com reserva que passaram do prazo de expiração
      // Critério: status = 'pre_agendado' E reservaPaga = false E criadoEm + horasExpiracao < agora
      const expirados = await db
        .select({ id: agendamentos.id, clienteId: agendamentos.clienteId })
        .from(agendamentos)
        .where(and(
          eq(agendamentos.empresaId, empresa.id),
          eq(agendamentos.status, 'pre_agendado'),
          sql`${agendamentos.reservaPaga} = 0 OR ${agendamentos.reservaPaga} IS NULL`,
          sql`${agendamentos.valorReserva} IS NOT NULL AND ${agendamentos.valorReserva} > 0`,
          sql`${agendamentos.createdAt} <= DATE_SUB(NOW(), INTERVAL ${horasExpiracao} HOUR)`,
        ));

      for (const ag of expirados) {
        await db.update(agendamentos)
          .set({ status: 'cancelado' })
          .where(eq(agendamentos.id, ag.id));
        totalCancelados++;
        console.log(`[Scheduler] Pré-agendamento ${ag.id} cancelado por expiração de reserva (${horasExpiracao}h)`);
      }
    }

    if (totalCancelados > 0) {
      console.log(`[Scheduler] ${totalCancelados} pré-agendamento(s) cancelado(s) por expiração de reserva`);
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao cancelar pré-agendamentos expirados:', err);
  }
}

// ── Inicializar agendamento ────────────────────────────────────────────────
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

  // Verificar a cada 5 minutos se é hora de enviar lembretes legados (às 9h)
  const LEMBRETE_CHECK_MS = 5 * 60 * 1000;
  setInterval(() => {
    if (deveExecutarNaHora(9)) {
      enviarLembretesAgendamentos();
    }
  }, LEMBRETE_CHECK_MS);

  // NOVO: Processar automações configuradas a cada 15 minutos
  const AUTOMACAO_CHECK_MS = 15 * 60 * 1000;
  // Executar após 60s do start para garantir que o DB está pronto
  setTimeout(() => {
    processarAutomacoesAgendadas();
    setInterval(() => {
      processarAutomacoesAgendadas();
    }, AUTOMACAO_CHECK_MS);
  }, 60_000);

  // NOVO: Pré-registrar envios futuros como pendentes a cada hora
  // Executa após 90s do start e depois a cada hora
  setTimeout(() => {
    preRegistrarEnviosPendentes();
    setInterval(() => {
      preRegistrarEnviosPendentes();
    }, 60 * 60 * 1000); // a cada 1 hora
  }, 90_000);

  // NOVO: Worker de fila universal — processa pendentes a cada 1 minuto
  // Também expira itens com enviarEm + 4h < agora
  setTimeout(() => {
    processarFilaPendente();
    setInterval(() => {
      processarFilaPendente();
    }, 60 * 1000); // a cada 1 minuto
  }, 15_000); // aguarda 15s para o DB estar pronto

  // NOVO: Cancelar pré-agendamentos com reserva expirada a cada 30 minutos
  setTimeout(() => {
    cancelarPreAgendamentosExpirados();
    setInterval(() => {
      cancelarPreAgendamentosExpirados();
    }, 30 * 60 * 1000); // a cada 30 minutos
  }, 45_000); // aguarda 45s para o DB estar pronto

  // NOVO: Ao reconectar WhatsApp, processar fila imediatamente
  waManager.on('connected', () => {
    console.log('[Fila] WhatsApp reconectado — processando fila pendente imediatamente...');
    setTimeout(() => processarFilaPendente(), 3_000); // aguarda 3s para estabilizar
  });

  console.log("[Scheduler] Verificação automática de pacotes inicializada (a cada 6h).");
  console.log("[Scheduler] Lembretes automáticos de agendamento inicializados (às 9h diariamente).");
  console.log("[Scheduler] Processamento de automações configuradas inicializado (a cada 15min).");
  console.log("[Scheduler] Pré-registro de envios pendentes inicializado (a cada 1h).");
  console.log("[Scheduler] Worker de fila universal inicializado (a cada 1min + ao reconectar WhatsApp).");
}
