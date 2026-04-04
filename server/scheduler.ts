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

// ─────────────────────────────────────────────────────────────────────────────
// NOVO: Processar automações configuradas (dias_antes_agendamento / horas_apos_agendamento)
// Roda a cada 15 minutos e dispara para cada automação ativa baseado nos campos
// diasAntesDepois e horaDisparo configurados pelo usuário.
// ─────────────────────────────────────────────────────────────────────────────
async function processarAutomacoesAgendadas() {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();
  const JANELA_MS = 15 * 60 * 1000; // janela de 15 minutos

  try {
    // Buscar todas as empresas que têm automações ativas dos tipos agendados
    const empresasDiasAntes = await getEmpresasComAutomacoes('dias_antes_agendamento');
    const empresasHorasAntes = await getEmpresasComAutomacoes('horas_antes_agendamento');
    const empresasHorasApos = await getEmpresasComAutomacoes('horas_apos_agendamento');
    const todasEmpresas = Array.from(new Set([...empresasDiasAntes, ...empresasHorasAntes, ...empresasHorasApos]));

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
            ? new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';
          const horaFormatada = ag.horaInicio ?? '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
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

          const enviado = await waManager.sendMessage(ag.clienteTelefone, mensagem);
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
            status: enviado ? 'enviado' : 'falhou',
            erroDetalhe: enviado ? undefined : 'Falha ao enviar via WhatsApp',
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${dias}d antes): ${enviado ? 'enviado' : 'falhou'} para ${ag.clienteNome} (ag. ${ag.id})`);
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
          const tsAgendamento = new Date(`${ag.data}T${hAg.padStart(2,'0')}:${mAg.padStart(2,'0')}:00`).getTime();
          const tsDisparo = tsAgendamento - delayMin * 60 * 1000; // ANTES do agendamento

          // Verificar se o disparo cai na janela atual
          if (tsDisparo < JANELA_INICIO || tsDisparo > JANELA_FIM) continue;

          // Deduplicação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
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

          const enviado = await waManager.sendMessage(ag.clienteTelefone, mensagem);
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
            status: enviado ? 'enviado' : 'falhou',
            erroDetalhe: enviado ? undefined : 'Falha ao enviar via WhatsApp',
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min antes): ${enviado ? 'enviado' : 'falhou'} para ${ag.clienteNome} (ag. ${ag.id})`);
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
          const tsAgendamento = new Date(`${ag.data}T${hAg.padStart(2,'0')}:${mAg.padStart(2,'0')}:00`).getTime();
          const tsDisparo = tsAgendamento + delayMin * 60 * 1000;

          // Verificar se o disparo cai na janela atual
          if (tsDisparo < JANELA_INICIO || tsDisparo > JANELA_FIM) continue;

          // Deduplicação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const templateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome ?? '',
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

          const enviado = await waManager.sendMessage(ag.clienteTelefone, mensagem);
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
            status: enviado ? 'enviado' : 'falhou',
            erroDetalhe: enviado ? undefined : 'Falha ao enviar via WhatsApp',
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min após): ${enviado ? 'enviado' : 'falhou'} para ${ag.clienteNome} (ag. ${ag.id})`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao processar automações agendadas:', err);
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

  console.log("[Scheduler] Verificação automática de pacotes inicializada (a cada 6h).");
  console.log("[Scheduler] Lembretes automáticos de agendamento inicializados (às 9h diariamente).");
  console.log("[Scheduler] Processamento de automações configuradas inicializado (a cada 15min).");
}
