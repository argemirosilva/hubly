/**
 * Scheduler — tarefas agendadas do servidor
 * Executa verificações periódicas sem depender de ação do usuário.
 */
import { getDb, registrarEnvioAutomacao, getAutomacaoByTipoGatilho, jaEnviouLembrete, jaEnviouParaCliente, getAutomacoesAtivasByTipo, getEmpresasComAutomacoes, createNotificacao } from "./db";
import { enviarNotificacoesAgendamento } from "./jobs/notificacoes-agendamento";
import {
  pacotesClientes,
  pacotesClientesItens,
  notificacoesPacotes,
  notificacoes,
  clientes,
  empresas,
  agendamentos,
  profissionais,
  servicos,
  historicoEnviosAutomacao,
  automacoes,
  contasPagar,
  contasReceber,
  agendamentoItens,
  agendamentoPessoas,
} from "../drizzle/schema";
import { eq, and, lte, gt, sql, gte, lt, isNull, isNotNull, or } from "drizzle-orm";
import { gerarTokenConfirmacao } from "./confirmacao";
import { waManager } from "./whatsapp";
import { routedSendMessage, routedSendMedia } from "./whatsapp-router";

// ── Helpers de Timezone ──────────────────────────────────────────────────────
// Cache de timezone por empresa (evita query repetida no mesmo ciclo)
const _tzCache = new Map<number, { tz: string; ts: number }>();
const TZ_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getEmpresaTimezone(empresaId: number): Promise<string> {
  const cached = _tzCache.get(empresaId);
  if (cached && Date.now() - cached.ts < TZ_CACHE_TTL) return cached.tz;
  const db = await getDb();
  if (!db) return 'America/Sao_Paulo';
  const [row] = await db.select({ timezone: empresas.timezone }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  const tz = row?.timezone || 'America/Sao_Paulo';
  _tzCache.set(empresaId, { tz, ts: Date.now() });
  return tz;
}

// Retorna hora e minuto atuais no timezone da empresa
function getHoraNoTimezone(timezone: string): { hora: number; minuto: number; dataStr: string; dia: number; mes: number; ano: number } {
  const now = new Date();
  // Usar Intl.DateTimeFormat para obter a hora local no timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
  const hora = get('hour') === 24 ? 0 : get('hour');
  const minuto = get('minute');
  const dia = get('day');
  const mes = get('month');
  const ano = get('year');
  const dataStr = `${String(ano)}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  return { hora, minuto, dataStr, dia, mes, ano };
}

// Converte uma data+hora local da empresa para timestamp UTC
function localToUtc(dataStr: string, horaStr: string, timezone: string): Date {
  // Cria um Date interpretando como se fosse no timezone da empresa
  // Usa a técnica de comparar offset via Intl
  const naive = new Date(`${dataStr}T${horaStr}:00`);
  const utcStr = naive.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = naive.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offset = utcDate.getTime() - tzDate.getTime();
  return new Date(naive.getTime() + offset);
}

// Helper: normalizar campo data (Date object ou string) para formato YYYY-MM-DD
function getDataStr(data: unknown): string {
  if (data instanceof Date) {
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth()+1).padStart(2,'0')}-${String(data.getUTCDate()).padStart(2,'0')}`;
  }
  return String(data).slice(0, 10);
}

// Helper: garantir formato HH:mm sem segundos
function formatarHora(hora: string | null | undefined): string {
  if (!hora) return '';
  // Pegar apenas HH:mm (primeiros 5 caracteres)
  return String(hora).slice(0, 5);
}

// Helper: verificar se um agendamento passa pelas condições do flowJson
// Retorna true se o agendamento deve receber a mensagem (sem condições = envia para todos)
function verificarCondicoesFlow(
  flowJson: string | null | undefined,
  servicoNome: string | null | undefined,
  todosServicos?: string[]
): boolean {
  if (!flowJson) return true; // sem flow = sem filtro = envia para todos
  try {
    const flow = JSON.parse(flowJson);
    if (!Array.isArray(flow)) return true;

    // Encontrar nós de condição
    const condicoes = flow.filter((n: any) => n?.type === 'condition');
    if (condicoes.length === 0) return true; // sem condições = envia para todos

    // Verificar cada condição
    for (const cond of condicoes) {
      const tipo = cond?.data?.tipo;
      const valor = cond?.data?.valor;

      if (tipo === 'por_servico' && valor) {
        // valor é uma string com nomes separados por vírgula
        const servicosFiltro = String(valor).split(',').map((s: string) => s.trim().toLowerCase());
        // Bug fix 3a: usar todos os serviços do agendamento (principal + itens compostos)
        const listaServicos = todosServicos && todosServicos.length > 0
          ? todosServicos.map(s => s.trim().toLowerCase()).filter(Boolean)
          : [(servicoNome ?? '').trim().toLowerCase()].filter(Boolean);
        if (listaServicos.length === 0) return false; // sem serviço no agendamento, não passa
        // Verificar se ALGUM serviço do agendamento bate com ALGUM filtro
        // Comparação exata (case-insensitive) para evitar falsos positivos
        const passou = servicosFiltro.some((sf: string) =>
          listaServicos.some((sa: string) => sa === sf)
        );
        if (!passou) return false;
      }
      // Outros tipos de condição podem ser adicionados aqui no futuro
    }
    return true;
  } catch {
    return true; // em caso de erro de parse, não bloqueia
  }
}

// Bug fix 3b: Helper para buscar todos os serviços de um agendamento (principal + itens compostos)
async function getTodosServicosAgendamento(agendamentoId: number, servicoPrincipal: string | null): Promise<string[]> {
  const db = await getDb();
  const result: string[] = [];
  if (servicoPrincipal) result.push(servicoPrincipal);
  if (!db) return result;
  try {
    const itens = await db
      .select({ servicoNome: servicos.nome })
      .from(agendamentoItens)
      .leftJoin(servicos, eq(agendamentoItens.servicoId, servicos.id))
      .where(eq(agendamentoItens.agendamentoId, agendamentoId));
    for (const item of itens) {
      if (item.servicoNome && !result.includes(item.servicoNome)) {
        result.push(item.servicoNome);
      }
    }
  } catch (err) {
    console.error(`[Scheduler] Erro ao buscar itens compostos do agendamento ${agendamentoId}:`, err);
  }
  return result;
}

/**
 * Retorna o contato principal da reserva (pessoa com isPrincipal=true).
 * Se não houver nenhum definido, retorna null (usar o cliente padrão do agendamento).
 */
async function getContatoPrincipalReserva(
  agendamentoId: number
): Promise<{ clienteId: number; nome: string; telefone: string } | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const [principal] = await db
      .select({
        clienteId: agendamentoPessoas.clienteId,
        nome: clientes.nome,
        telefone: clientes.telefone,
        whatsapp: clientes.whatsapp,
      })
      .from(agendamentoPessoas)
      .leftJoin(clientes, eq(agendamentoPessoas.clienteId, clientes.id))
      .where(
        and(
          eq(agendamentoPessoas.agendamentoId, agendamentoId),
          eq(agendamentoPessoas.isPrincipal, true)
        )
      )
      .limit(1);
    if (!principal) return null;
    const tel = principal.whatsapp || principal.telefone;
    if (!tel) return null;
    return { clienteId: principal.clienteId, nome: principal.nome ?? '', telefone: tel };
  } catch {
    return null;
  }
}

// ── Verificar pacotes vencendo para todas as empresas ─────────────────────────────────────────
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

        // ── Disparar automação WhatsApp se configurada (evento: pacote_vencendo) ──
        try {
          const autoRenovacao = await getAutomacaoByTipoGatilho(empId, 'evento', 'pacote_vencendo');
          if (autoRenovacao && pacote.clienteId) {
            const [clienteData] = await db.select({ telefone: clientes.telefone, whatsapp: clientes.whatsapp, nome: clientes.nome })
              .from(clientes).where(eq(clientes.id, pacote.clienteId)).limit(1);
            const tel = clienteData?.telefone || clienteData?.whatsapp;
            if (tel && clienteData) {
              // Buscar nome do pacote
              const [pacoteData] = await db.select({ nome: pacotesClientes.nome }).from(pacotesClientes).where(eq(pacotesClientes.id, pacote.id)).limit(1);
              const [empresaData] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, empId)).limit(1);
              let msg = autoRenovacao.corpoMensagem;
              msg = msg
                .replace(/\{\{nome_cliente\}\}/g, clienteData.nome ?? "")
                .replace(/\{\{primeiro_nome\}\}/g, (clienteData.nome ?? "").split(" ")[0])
                .replace(/\{\{empresa\}\}/g, empresaData?.nome ?? "")
                .replace(/\{\{pacote\}\}/g, pacoteData?.nome ?? "")
                .replace(/\{\{sessoes_restantes\}\}/g, String(sessoesRestantes))
                .replace(/\{\{sessoes_total\}\}/g, String(totalSessoes))
                .replace(/\{\{data_vencimento\}\}/g, venc.toLocaleDateString("pt-BR"));
              {
                const ok = await routedSendMessage(empId, tel, msg);
                await registrarEnvioAutomacao({
                  empresaId: empId, automacaoId: autoRenovacao.id, automacaoNome: autoRenovacao.nome,
                  clienteId: pacote.clienteId, clienteNome: clienteData.nome ?? undefined,
                  telefone: tel, canal: "whatsapp", mensagem: msg, status: ok ? "enviado" : "falhou",
                });
              }
            }
          }
        } catch (e) { /* silencioso — não bloquear notificação por falha no WhatsApp */ }
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

        // ── Disparar automação WhatsApp se configurada (evento: sessoes_acabando) ──
        try {
          const autoSessoes = await getAutomacaoByTipoGatilho(empId, 'evento', 'sessoes_acabando');
          if (autoSessoes && pacote.clienteId) {
            const [clienteData] = await db.select({ telefone: clientes.telefone, whatsapp: clientes.whatsapp, nome: clientes.nome })
              .from(clientes).where(eq(clientes.id, pacote.clienteId)).limit(1);
            const tel = clienteData?.telefone || clienteData?.whatsapp;
            if (tel && clienteData) {
              const [pacoteData] = await db.select({ nome: pacotesClientes.nome }).from(pacotesClientes).where(eq(pacotesClientes.id, pacote.id)).limit(1);
              const [empresaData] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, empId)).limit(1);
              let msg = autoSessoes.corpoMensagem;
              msg = msg
                .replace(/\{\{nome_cliente\}\}/g, clienteData.nome ?? "")
                .replace(/\{\{primeiro_nome\}\}/g, (clienteData.nome ?? "").split(" ")[0])
                .replace(/\{\{empresa\}\}/g, empresaData?.nome ?? "")
                .replace(/\{\{pacote\}\}/g, pacoteData?.nome ?? "")
                .replace(/\{\{sessoes_restantes\}\}/g, String(sessoesRestantes))
                .replace(/\{\{sessoes_total\}\}/g, String(totalSessoes));
              {
                const ok = await routedSendMessage(empId, tel, msg);
                await registrarEnvioAutomacao({
                  empresaId: empId, automacaoId: autoSessoes.id, automacaoNome: autoSessoes.nome,
                  clienteId: pacote.clienteId, clienteNome: clienteData.nome ?? undefined,
                  telefone: tel, canal: "whatsapp", mensagem: msg, status: ok ? "enviado" : "falhou",
                });
              }
            }
          }
        } catch (e) { /* silencioso */ }
      }
    }

    if (totalCriadas > 0) {
      console.log(`[Scheduler] ${totalCriadas} notificação(ões) de pacotes gerada(s) em ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error("[Scheduler] Erro ao verificar pacotes:", err);
  }
}

// ── Verificar pacotes com automacaoRenovacao habilitada (pacote_vencendo + sessoes_acabando) ──
async function verificarPacotesAutomacaoRenovacao() {
  const db = await getDb();
  if (!db) return;

  const agora = new Date();
  const hojeStr = getDataStr(agora);

  try {
    // Buscar empresas que têm automações ativas para pacote_vencendo ou sessoes_acabando
    const empresasVencendo = await getEmpresasComAutomacoes('evento');

    for (const empresaId of empresasVencendo) {
      // ── 1. Trigger pacote_vencendo: pacotes com automacaoRenovacao=true e dataValidade definida ──
      const autoVencendo = await getAutomacaoByTipoGatilho(empresaId, 'evento', 'pacote_vencendo');
      if (autoVencendo) {
        const pacotesComValidade = await db.select({
          id: pacotesClientes.id,
          clienteId: pacotesClientes.clienteId,
          nome: pacotesClientes.nome,
          dataValidade: pacotesClientes.dataValidade,
        })
          .from(pacotesClientes)
          .where(and(
            eq(pacotesClientes.empresaId, empresaId),
            eq(pacotesClientes.status, 'ativo'),
            eq(pacotesClientes.automacaoRenovacao, true),
            sql`${pacotesClientes.dataValidade} IS NOT NULL`,
          ));

        for (const pacote of pacotesComValidade) {
          if (!pacote.dataValidade || !pacote.clienteId) continue;
          const dataValidadeStr = getDataStr(pacote.dataValidade);
          const dataValidadeMs = new Date(dataValidadeStr + 'T00:00:00').getTime();
          const hojeMs = new Date(hojeStr + 'T00:00:00').getTime();
          const diffDias = Math.round((dataValidadeMs - hojeMs) / (1000 * 60 * 60 * 24));

          const avisos: { tipo: string; dias: number }[] = [];
          if (diffDias === 7) avisos.push({ tipo: '7d', dias: 7 });
          if (diffDias === 1) avisos.push({ tipo: '1d', dias: 1 });

          for (const aviso of avisos) {
            // Deduplicação: automacaoId + pacoteClienteId + tipoAviso + dataAlvo
            const dedupeKey = `${autoVencendo.id}_${pacote.id}_${aviso.tipo}_${dataValidadeStr}`;
            const [existente] = await db.select({ id: historicoEnviosAutomacao.id })
              .from(historicoEnviosAutomacao)
              .where(and(
                eq(historicoEnviosAutomacao.empresaId, empresaId),
                eq(historicoEnviosAutomacao.automacaoId, autoVencendo.id),
                sql`${historicoEnviosAutomacao.mensagem} LIKE ${'%' + dedupeKey + '%'}`,
              ))
              .limit(1);
            if (existente) continue;

            // Buscar dados do cliente
            const [clienteData] = await db.select({ telefone: clientes.telefone, whatsapp: clientes.whatsapp, nome: clientes.nome })
              .from(clientes).where(eq(clientes.id, pacote.clienteId)).limit(1);
            const tel = clienteData?.telefone || clienteData?.whatsapp;
            if (!tel || !clienteData) continue;

            // Buscar sessões restantes
            const itens = await db.select({ quantidadeTotal: pacotesClientesItens.quantidadeTotal, quantidadeUsada: pacotesClientesItens.quantidadeUsada })
              .from(pacotesClientesItens).where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));
            const sessoesTotal = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
            const sessoesRestantes = sessoesTotal - itens.reduce((s, i) => s + i.quantidadeUsada, 0);

            const [empresaData] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);

            let msg = autoVencendo.corpoMensagem;
            msg = msg
              .replace(/\{\{nome_cliente\}\}/g, clienteData.nome ?? '')
              .replace(/\{\{primeiro_nome\}\}/g, (clienteData.nome ?? '').split(' ')[0])
              .replace(/\{\{empresa\}\}/g, empresaData?.nome ?? '')
              .replace(/\{\{pacote\}\}/g, pacote.nome ?? '')
              .replace(/\{\{sessoes_restantes\}\}/g, String(sessoesRestantes))
              .replace(/\{\{sessoes_total\}\}/g, String(sessoesTotal))
              .replace(/\{\{data_vencimento\}\}/g, new Date(dataValidadeStr + 'T12:00:00').toLocaleDateString('pt-BR'));
            // Append deduplication key as invisible marker
            msg += `\u200B${dedupeKey}`;

            const midiaUrl = (() => {
              if (!autoVencendo.flowJson) return undefined;
              try {
                const flow = JSON.parse(autoVencendo.flowJson);
                if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
                else if (flow?.midiaUrl) return flow.midiaUrl;
              } catch {} return undefined;
            })();

            await registrarEnvioAutomacao({
              empresaId, automacaoId: autoVencendo.id, automacaoNome: autoVencendo.nome,
              clienteId: pacote.clienteId, clienteNome: clienteData.nome ?? undefined,
              telefone: tel, canal: 'whatsapp', mensagem: msg, status: 'pendente',
              enviarEm: new Date(), midiaUrl,
            });
            console.log(`[Scheduler] Automação pacote_vencendo (${aviso.tipo}): enfileirado para ${clienteData.nome} (pacote ${pacote.id})`);
          }
        }
      }

      // ── 2. Trigger sessoes_acabando: pacotes com automacaoRenovacao=true e algum item com 1 sessão restante ──
      const autoSessoes = await getAutomacaoByTipoGatilho(empresaId, 'evento', 'sessoes_acabando');
      if (autoSessoes) {
        const pacotesAtivos = await db.select({
          id: pacotesClientes.id,
          clienteId: pacotesClientes.clienteId,
          nome: pacotesClientes.nome,
        })
          .from(pacotesClientes)
          .where(and(
            eq(pacotesClientes.empresaId, empresaId),
            eq(pacotesClientes.status, 'ativo'),
            eq(pacotesClientes.automacaoRenovacao, true),
          ));

        for (const pacote of pacotesAtivos) {
          if (!pacote.clienteId) continue;
          const itens = await db.select({
            id: pacotesClientesItens.id,
            quantidadeTotal: pacotesClientesItens.quantidadeTotal,
            quantidadeUsada: pacotesClientesItens.quantidadeUsada,
          }).from(pacotesClientesItens).where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));

          // Check if ANY item has exactly 1 session remaining
          const itemComUmaSessao = itens.find(i => (i.quantidadeTotal - i.quantidadeUsada) === 1);
          if (!itemComUmaSessao) continue;

          // Deduplicação: automacaoId + pacoteClienteId + pacoteClienteItemId
          const dedupeKey = `sessoes_${autoSessoes.id}_${pacote.id}_${itemComUmaSessao.id}`;
          const [existente] = await db.select({ id: historicoEnviosAutomacao.id })
            .from(historicoEnviosAutomacao)
            .where(and(
              eq(historicoEnviosAutomacao.empresaId, empresaId),
              eq(historicoEnviosAutomacao.automacaoId, autoSessoes.id),
              sql`${historicoEnviosAutomacao.mensagem} LIKE ${'%' + dedupeKey + '%'}`,
            ))
            .limit(1);
          if (existente) continue;

          const [clienteData] = await db.select({ telefone: clientes.telefone, whatsapp: clientes.whatsapp, nome: clientes.nome })
            .from(clientes).where(eq(clientes.id, pacote.clienteId)).limit(1);
          const tel = clienteData?.telefone || clienteData?.whatsapp;
          if (!tel || !clienteData) continue;

          const sessoesTotal = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
          const sessoesRestantes = sessoesTotal - itens.reduce((s, i) => s + i.quantidadeUsada, 0);
          const [empresaData] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);

          let msg = autoSessoes.corpoMensagem;
          msg = msg
            .replace(/\{\{nome_cliente\}\}/g, clienteData.nome ?? '')
            .replace(/\{\{primeiro_nome\}\}/g, (clienteData.nome ?? '').split(' ')[0])
            .replace(/\{\{empresa\}\}/g, empresaData?.nome ?? '')
            .replace(/\{\{pacote\}\}/g, pacote.nome ?? '')
            .replace(/\{\{sessoes_restantes\}\}/g, String(sessoesRestantes))
            .replace(/\{\{sessoes_total\}\}/g, String(sessoesTotal));
          msg += `\u200B${dedupeKey}`;

          const midiaUrl = (() => {
            if (!autoSessoes.flowJson) return undefined;
            try {
              const flow = JSON.parse(autoSessoes.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();

          await registrarEnvioAutomacao({
            empresaId, automacaoId: autoSessoes.id, automacaoNome: autoSessoes.nome,
            clienteId: pacote.clienteId, clienteNome: clienteData.nome ?? undefined,
            telefone: tel, canal: 'whatsapp', mensagem: msg, status: 'pendente',
            enviarEm: new Date(), midiaUrl,
          });
          console.log(`[Scheduler] Automação sessoes_acabando: enfileirado para ${clienteData.nome} (pacote ${pacote.id})`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao verificar pacotes com automação de renovação:', err);
  }
}

// ── Enviar lembretes de agendamentos do dia seguinte ─────────────────────────

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
      // Obter timezone da empresa para comparação de horaDisparo
      const tz = await getEmpresaTimezone(empresaId);
      const horaLocal = getHoraNoTimezone(tz);

      // ── Processar automações do tipo dias_antes_agendamento ──────────────────
      const automacoesAntes = await getAutomacoesAtivasByTipo(empresaId, 'dias_antes_agendamento');

      for (const automacao of automacoesAntes) {
        const dias = automacao.diasAntesDepois ?? 1;
        const horaDisparo = automacao.horaDisparo ?? '09:00:00';
        const [hStr, mStr] = horaDisparo.split(':');
        const horaAlvo = parseInt(hStr, 10);
        const minAlvo = parseInt(mStr, 10);

        // Calcular a data alvo do agendamento: hoje (no timezone da empresa) + dias
        const dataAlvoDate = new Date(`${horaLocal.dataStr}T12:00:00`);
        dataAlvoDate.setDate(dataAlvoDate.getDate() + dias);
        const dataAlvoStr = `${dataAlvoDate.getFullYear()}-${String(dataAlvoDate.getMonth()+1).padStart(2,'0')}-${String(dataAlvoDate.getDate()).padStart(2,'0')}`;

        // Verificar se estamos na janela de disparo (hora local da empresa ≈ horaDisparo)
        const minutosAgora = horaLocal.hora * 60 + horaLocal.minuto;
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
            empresaPortalSlug: empresas.portalSlug,
            waMsgLembrete: empresas.waMsgLembrete,
            reservaPercentual: empresas.reservaPercentual,
            observacoes: agendamentos.observacoes,
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

          // Bug fix 3b: buscar todos os serviços do agendamento (principal + itens compostos)
          const todosServicos = await getTodosServicosAgendamento(ag.id, ag.servicoNome);
          // Verificar condições do flowJson (ex: filtro por serviço)
          if (!verificarCondicoesFlow(automacao.flowJson, ag.servicoNome, todosServicos)) {
            console.log(`[Scheduler] Automação "${automacao.nome}" (${dias}d antes): agendamento ${ag.id} ignorado por filtro de serviço (serviços: ${todosServicos.join(', ')})`);
            continue;
          }

          // Deduplication: verificar se já enviou para este agendamento+automação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          // Usar contato principal da reserva se definido, senão usar cliente padrão
          const contatoPrincipal = await getContatoPrincipalReserva(ag.id);
          const telefoneEnvio = contatoPrincipal?.telefone ?? ag.clienteTelefone;
          const nomeEnvio = contatoPrincipal?.nome ?? ag.clienteNome ?? 'Cliente';
          const clienteIdEnvio = contatoPrincipal?.clienteId ?? ag.clienteId ?? undefined;

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
          const horaFormatada = formatarHora(ag.horaInicio);

          const _schOriginDiasAntes = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
          const _linkAgDiasAntes = ag.empresaPortalSlug ? `${_schOriginDiasAntes}/agendar/${ag.empresaPortalSlug}` : `${_schOriginDiasAntes}/agendar?e=${ag.empresaId}`;
          const templateVars: Record<string, string> = {
            nome_cliente: nomeEnvio,
            primeiro_nome: nomeEnvio.split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: horaFormatada,
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            valor_reserva: `R$ ${valorReserva.replace('.', ',')}`,
            link_confirmacao: linkConfirmacao,
            link_agendamento: _linkAgDiasAntes,
            observacoes: ag.observacoes ?? '',
            dias_antes: String(dias),
          };

          if (!automacao.corpoMensagem) continue;
          const mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          const midiaUrlDiasAntes = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: clienteIdEnvio,
            clienteNome: nomeEnvio,
            agendamentoId: ag.id,
            telefone: telefoneEnvio,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(),
            midiaUrl: midiaUrlDiasAntes,
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${dias}d antes): enfileirado para ${nomeEnvio}${contatoPrincipal ? ' [contato principal]' : ''} (ag. ${ag.id})`);
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
            empresaPortalSlug: empresas.portalSlug,
            reservaPercentual: empresas.reservaPercentual,
            observacoes: agendamentos.observacoes,
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

          // Bug fix 3b: buscar todos os serviços do agendamento (principal + itens compostos)
          const todosServicos = await getTodosServicosAgendamento(ag.id, ag.servicoNome);
          // Verificar condições do flowJson (ex: filtro por serviço)
          if (!verificarCondicoesFlow(automacao.flowJson, ag.servicoNome, todosServicos)) {
            console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min antes): agendamento ${ag.id} ignorado por filtro de serviço (serviços: ${todosServicos.join(', ')})`);
            continue;
          }

          // Deduplicação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          // Usar contato principal da reserva se definido, senão usar cliente padrão
          const contatoPrincipalHA = await getContatoPrincipalReserva(ag.id);
          const telefoneEnvioHA = contatoPrincipalHA?.telefone ?? ag.clienteTelefone;
          const nomeEnvioHA = contatoPrincipalHA?.nome ?? ag.clienteNome ?? 'Cliente';
          const clienteIdEnvioHA = contatoPrincipalHA?.clienteId ?? ag.clienteId ?? undefined;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const _schOriginHorasAntes = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
          const _linkAgHorasAntes = ag.empresaPortalSlug ? `${_schOriginHorasAntes}/agendar/${ag.empresaPortalSlug}` : `${_schOriginHorasAntes}/agendar?e=${ag.empresaId}`;
          const templateVars: Record<string, string> = {
            nome_cliente: nomeEnvioHA,
            primeiro_nome: nomeEnvioHA.split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: formatarHora(ag.horaInicio),
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            link_agendamento: _linkAgHorasAntes,
            observacoes: ag.observacoes ?? '',
            horas_antes: String(Math.round(delayMin / 60)),
          };

          if (!automacao.corpoMensagem) continue;
          const mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          const midiaUrlHorasAntes = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: clienteIdEnvioHA,
            clienteNome: nomeEnvioHA,
            agendamentoId: ag.id,
            telefone: telefoneEnvioHA,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(),
            midiaUrl: midiaUrlHorasAntes,
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min antes): enfileirado para ${nomeEnvioHA}${contatoPrincipalHA ? ' [contato principal]' : ''} (ag. ${ag.id})`);
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
            empresaPortalSlug: empresas.portalSlug,
            reservaPercentual: empresas.reservaPercentual,
            observacoes: agendamentos.observacoes,
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
            sql`${agendamentos.status} = 'concluido'`,
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

          // Bug fix 3b: buscar todos os serviços do agendamento (principal + itens compostos)
          const todosServicos = await getTodosServicosAgendamento(ag.id, ag.servicoNome);
          // Verificar condições do flowJson (ex: filtro por serviço)
          if (!verificarCondicoesFlow(automacao.flowJson, ag.servicoNome, todosServicos)) {
            console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min após): agendamento ${ag.id} ignorado por filtro de serviço (serviços: ${todosServicos.join(', ')})`);
            continue;
          }

          // Deduplicação
          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          // Usar contato principal da reserva se definido, senão usar cliente padrão
          const contatoPrincipalApos = await getContatoPrincipalReserva(ag.id);
          const telefoneEnvioApos = contatoPrincipalApos?.telefone ?? ag.clienteTelefone;
          const nomeEnvioApos = contatoPrincipalApos?.nome ?? ag.clienteNome ?? 'Cliente';
          const clienteIdEnvioApos = contatoPrincipalApos?.clienteId ?? ag.clienteId ?? undefined;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const _schOriginHorasApos = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
          const _linkAgHorasApos = ag.empresaPortalSlug ? `${_schOriginHorasApos}/agendar/${ag.empresaPortalSlug}` : `${_schOriginHorasApos}/agendar?e=${ag.empresaId}`;
          const templateVars: Record<string, string> = {
            nome_cliente: nomeEnvioApos,
            primeiro_nome: nomeEnvioApos.split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: formatarHora(ag.horaInicio),
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            link_agendamento: _linkAgHorasApos,
            observacoes: ag.observacoes ?? '',
            horas_apos: String(Math.round(delayMin / 60)),
          };

          if (!automacao.corpoMensagem) continue;
          const mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');

          // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
          const midiaUrlHorasApos = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: clienteIdEnvioApos,
            clienteNome: nomeEnvioApos,
            agendamentoId: ag.id,
            telefone: telefoneEnvioApos,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(),
            midiaUrl: midiaUrlHorasApos,
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${delayMin}min após): enfileirado para ${nomeEnvioApos}${contatoPrincipalApos ? ' [contato principal]' : ''} (ag. ${ag.id})`);
        }
      }

      // ── Processar automações do tipo dias_depois_agendamento ──────────────────────────────────────────────
      const automacoesDiasDepois = await getAutomacoesAtivasByTipo(empresaId, 'dias_depois_agendamento');

      for (const automacao of automacoesDiasDepois) {
        const diasDepois = automacao.diasAntesDepois ?? 1;
        const horaDisparo = automacao.horaDisparo ?? '09:00';
        const [hDisp, mDisp] = horaDisparo.split(':');

        // Calcular a data alvo: agendamento + diasDepois dias (usando timezone da empresa)
        const JANELA_INICIO = agora.getTime() - JANELA_MS;
        const JANELA_FIM = agora.getTime();

        // Buscar agendamentos cujo dia + diasDepois = hoje (no timezone da empresa)
        const dataAlvoDate2 = new Date(`${horaLocal.dataStr}T12:00:00`);
        dataAlvoDate2.setDate(dataAlvoDate2.getDate() - diasDepois);
        const dataAlvoStr = `${dataAlvoDate2.getFullYear()}-${String(dataAlvoDate2.getMonth()+1).padStart(2,'0')}-${String(dataAlvoDate2.getDate()).padStart(2,'0')}`;

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
            empresaPortalSlug: empresas.portalSlug,
            observacoes: agendamentos.observacoes,
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
          .leftJoin(servicos, eq(agendamentos.servicoId, servicos.id))
          .leftJoin(empresas, eq(agendamentos.empresaId, empresas.id))
          .where(and(
            eq(agendamentos.empresaId, empresaId),
            sql`${agendamentos.data} = ${dataAlvoStr}`,
            sql`${agendamentos.status} = 'concluido'`,
          ));

        for (const ag of ags) {
          if (!ag.clienteTelefone || !ag.data || !ag.horaInicio) continue;

          // Calcular o timestamp de disparo: data + diasDepois dias, na hora configurada (no timezone da empresa)
          const agDataStr3 = getDataStr(ag.data);
          const [anoD, mesD, diaD] = agDataStr3.split('-').map(Number);
          const dataDp = new Date(anoD, mesD - 1, diaD + diasDepois);
          const dataDpStr = `${dataDp.getFullYear()}-${String(dataDp.getMonth()+1).padStart(2,'0')}-${String(dataDp.getDate()).padStart(2,'0')}`;
          const dataDisparo = localToUtc(dataDpStr, `${String(hDisp).padStart(2,'0')}:${String(mDisp).padStart(2,'0')}`, tz);
          const tsDisparo = dataDisparo.getTime();

          if (tsDisparo < JANELA_INICIO || tsDisparo > JANELA_FIM) continue;

          // Bug fix 3b: buscar todos os serviços do agendamento (principal + itens compostos)
          const todosServicos = await getTodosServicosAgendamento(ag.id, ag.servicoNome);
          // Verificar condições do flowJson (ex: filtro por serviço)
          if (!verificarCondicoesFlow(automacao.flowJson, ag.servicoNome, todosServicos)) {
            console.log(`[Scheduler] Automação "${automacao.nome}" (${diasDepois} dia(s) depois): agendamento ${ag.id} ignorado por filtro de serviço (serviços: ${todosServicos.join(', ')})`);
            continue;
          }

          const jaEnviou = await jaEnviouLembrete(empresaId, automacao.id, ag.id);
          if (jaEnviou) continue;

          // Usar contato principal da reserva se definido, senão usar cliente padrão
          const contatoPrincipalDD = await getContatoPrincipalReserva(ag.id);
          const telefoneEnvioDD = contatoPrincipalDD?.telefone ?? ag.clienteTelefone;
          const nomeEnvioDD = contatoPrincipalDD?.nome ?? ag.clienteNome ?? 'Cliente';
          const clienteIdEnvioDD = contatoPrincipalDD?.clienteId ?? ag.clienteId ?? undefined;

          const valorTotal = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatada = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          const _schOriginDiasDepois = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
          const _linkAgDiasDepois = ag.empresaPortalSlug ? `${_schOriginDiasDepois}/agendar/${ag.empresaPortalSlug}` : `${_schOriginDiasDepois}/agendar?e=${ag.empresaId}`;
          const templateVars: Record<string, string> = {
            nome_cliente: nomeEnvioDD,
            primeiro_nome: nomeEnvioDD.split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatada,
            hora: formatarHora(ag.horaInicio),
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
            link_agendamento: _linkAgDiasDepois,
            observacoes: ag.observacoes ?? '',
            dias_depois: String(diasDepois),
          };

          if (!automacao.corpoMensagem) continue;
          const mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');

          const midiaUrlDiasDepois = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();
          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: clienteIdEnvioDD,
            clienteNome: nomeEnvioDD,
            agendamentoId: ag.id,
            telefone: telefoneEnvioDD,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(),
            midiaUrl: midiaUrlDiasDepois,
          }).catch(() => {});

          console.log(`[Scheduler] Automação "${automacao.nome}" (${diasDepois} dia(s) depois): enfileirado para ${nomeEnvioDD}${contatoPrincipalDD ? ' [contato principal]' : ''} (ag. ${ag.id})`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao processar automações agendadas:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Processar automações do tipo aniversario_mes
// Roda a cada 15 minutos e dispara para clientes cujo mês de nascimento = mês atual
// ─────────────────────────────────────────────────────────────────────────────
async function processarAniversarioMes() {
  const db = await getDb();
  if (!db) return;

  try {
    const empresasAniversario = await getEmpresasComAutomacoes('aniversario_mes');
    if (empresasAniversario.length === 0) return;

    for (const empresaId of empresasAniversario) {
      // Usar timezone da empresa para determinar data/hora local
      const tz = await getEmpresaTimezone(empresaId);
      const horaLocal = getHoraNoTimezone(tz);
      const mesAtual = horaLocal.mes;
      const diaAtual = horaLocal.dia;
      const anoAtual = horaLocal.ano;

      // REGRA: enviar apenas no dia 01 do mês (no timezone da empresa)
      if (diaAtual !== 1) continue;

      const automacoesAniv = await getAutomacoesAtivasByTipo(empresaId, 'aniversario_mes');

      for (const automacao of automacoesAniv) {
        const horaDisparo = automacao.horaDisparo ?? '09:00:00';
        const [hStr, mStr] = horaDisparo.split(':');
        const horaAlvo = parseInt(hStr, 10);
        const minAlvo = parseInt(mStr, 10);

        // Verificar se estamos na janela de disparo (±15 min) no timezone da empresa
        const minutosAgora = horaLocal.hora * 60 + horaLocal.minuto;
        const minutosAlvo = horaAlvo * 60 + minAlvo;
        if (Math.abs(minutosAgora - minutosAlvo) > 15) continue;

        // Buscar clientes com mês de nascimento = mês atual
        const clientesAniversario = await db
          .select({
            id: clientes.id,
            nome: clientes.nome,
            telefone: clientes.telefone,
            whatsapp: clientes.whatsapp,
            dataNascimento: clientes.dataNascimento,
          })
          .from(clientes)
          .where(and(
            eq(clientes.empresaId, empresaId),
            eq(clientes.ativo, true),
            isNotNull(clientes.dataNascimento),
            sql`${clientes.dataNascimento} != ''`,
            sql`MONTH(${clientes.dataNascimento}) = ${mesAtual}`,
          ));

        const [empresaData] = await db.select({ nome: empresas.nome, portalSlug: empresas.portalSlug }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
        const _schOriginAniv = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
        const _linkAgAniv = empresaData?.portalSlug ? `${_schOriginAniv}/agendar/${empresaData.portalSlug}` : `${_schOriginAniv}/agendar?e=${empresaId}`;

        for (const cliente of clientesAniversario) {
          const tel = cliente.whatsapp || cliente.telefone;
          if (!tel) continue;

          // Deduplicação por automacaoId + clienteId + ANO ATUAL
          // Verifica se já enviou para este cliente neste ano (não apenas hoje)
          const inicioAno = new Date(anoAtual, 0, 1); // 1 de janeiro do ano atual
          const jaEnviouEsteAno = await db.select({ id: historicoEnviosAutomacao.id })
            .from(historicoEnviosAutomacao)
            .where(and(
              eq(historicoEnviosAutomacao.empresaId, empresaId),
              eq(historicoEnviosAutomacao.automacaoId, automacao.id),
              eq(historicoEnviosAutomacao.clienteId, cliente.id),
              sql`${historicoEnviosAutomacao.status} IN ('enviado', 'pendente', 'agendado')`,
              gte(historicoEnviosAutomacao.criadoEm, inicioAno),
            ))
            .limit(1);
          if (jaEnviouEsteAno.length > 0) continue;

          const templateVars: Record<string, string> = {
            nome_cliente: cliente.nome || 'Cliente',
            primeiro_nome: (cliente.nome || 'Cliente').split(' ')[0],
            empresa: empresaData?.nome ?? '',
            link_agendamento: _linkAgAniv,
          };

          if (!automacao.corpoMensagem) continue;
          const mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');

          const midiaUrl = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();

          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: cliente.id,
            clienteNome: cliente.nome ?? undefined,
            telefone: tel,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(),
            midiaUrl,
          }).catch(() => {});

          console.log(`[Scheduler] Aniversário do mês: enfileirado para ${cliente.nome} (automação "${automacao.nome}")`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao processar aniversários do mês:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Processar automações do tipo data_fixa
// Roda a cada 15 minutos e dispara na data e horário exatos configurados
// ─────────────────────────────────────────────────────────────────────────────
async function processarDataFixa() {
  const db = await getDb();
  if (!db) return;

  try {
    const empresasDataFixa = await getEmpresasComAutomacoes('data_fixa');
    if (empresasDataFixa.length === 0) return;

    for (const empresaId of empresasDataFixa) {
      // Usar timezone da empresa para determinar data/hora local
      const tz = await getEmpresaTimezone(empresaId);
      const horaLocal = getHoraNoTimezone(tz);
      const diaAtual = horaLocal.dia;
      const mesAtual = horaLocal.mes;

      const automacoesFixa = await getAutomacoesAtivasByTipo(empresaId, 'data_fixa');

      for (const automacao of automacoesFixa) {
        const diaConfig = automacao.dataFixaDia;
        const mesConfig = automacao.dataFixaMes;
        const horaConfig = automacao.dataFixaHora ?? '09:00:00';

        // Verificar se hoje (no timezone da empresa) é a data configurada
        if (diaConfig !== diaAtual || mesConfig !== mesAtual) continue;

        // Verificar se estamos na janela de disparo (no timezone da empresa)
        const [hStr, mStr] = horaConfig.split(':');
        const horaAlvo = parseInt(hStr, 10);
        const minAlvo = parseInt(mStr, 10);
        const minutosAgora = horaLocal.hora * 60 + horaLocal.minuto;
        const minutosAlvo = horaAlvo * 60 + minAlvo;
        if (Math.abs(minutosAgora - minutosAlvo) > 15) continue;

        // Buscar todos os clientes ativos da empresa
        const clientesEmpresa = await db
          .select({
            id: clientes.id,
            nome: clientes.nome,
            telefone: clientes.telefone,
            whatsapp: clientes.whatsapp,
          })
          .from(clientes)
          .where(and(
            eq(clientes.empresaId, empresaId),
            eq(clientes.ativo, true),
          ));

        const [empresaData] = await db.select({ nome: empresas.nome, portalSlug: empresas.portalSlug }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
        const _schOriginCamp = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
        const _linkAgCamp = empresaData?.portalSlug ? `${_schOriginCamp}/agendar/${empresaData.portalSlug}` : `${_schOriginCamp}/agendar?e=${empresaId}`;

        for (const cliente of clientesEmpresa) {
          const tel = cliente.whatsapp || cliente.telefone;
          if (!tel) continue;

          // Deduplicação por automacaoId + clienteId + data
          const jaEnviou = await jaEnviouParaCliente(empresaId, automacao.id, cliente.id);
          if (jaEnviou) continue;

          const templateVars: Record<string, string> = {
            nome_cliente: cliente.nome || 'Cliente',
            primeiro_nome: (cliente.nome || 'Cliente').split(' ')[0],
            empresa: empresaData?.nome ?? '',
            link_agendamento: _linkAgCamp,
          };

          if (!automacao.corpoMensagem) continue;
          const mensagem = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => templateVars[key] ?? '');

          const midiaUrl = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();

          await registrarEnvioAutomacao({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: cliente.id,
            clienteNome: cliente.nome ?? undefined,
            telefone: tel,
            canal: 'whatsapp',
            mensagem,
            status: 'pendente',
            enviarEm: new Date(),
            midiaUrl,
          }).catch(() => {});

          console.log(`[Scheduler] Data fixa: enfileirado para ${cliente.nome} (automação "${automacao.nome}")`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao processar automações de data fixa:', err);
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
      // Obter timezone da empresa para cálculos corretos
      const tzPre = await getEmpresaTimezone(empresaId);
      const horaLocalPre = getHoraNoTimezone(tzPre);

      // Buscar agendamentos dos próximos 7 dias
      const dataInicioStr = horaLocalPre.dataStr;
      const em7DiasDate = new Date(`${horaLocalPre.dataStr}T12:00:00`);
      em7DiasDate.setDate(em7DiasDate.getDate() + 7);
      const dataFimStr = `${em7DiasDate.getFullYear()}-${String(em7DiasDate.getMonth()+1).padStart(2,'0')}-${String(em7DiasDate.getDate()).padStart(2,'0')}`;

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
          empresaPortalSlug: empresas.portalSlug,
          valorTotal: agendamentos.valorTotal,
          observacoes: agendamentos.observacoes,
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
        // Bug fix: automações de feedback (horas_apos/dias_depois) dependem de status='concluido'
        // Como o pré-registro busca apenas agendamentos 'agendado'/'confirmado', não faz sentido
        // pré-registrar envios de feedback — eles serão processados em tempo real pelo scheduler
        // quando o status mudar para 'concluido'
        if (automacao.tipoGatilho === 'horas_apos_agendamento' || automacao.tipoGatilho === 'dias_depois_agendamento') {
          continue;
        }

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
            // Converter hora local da empresa para UTC
            const [ano, mes, dia] = dataStr.split('-').map(Number);
            const dPre = new Date(ano, mes - 1, dia - dias);
            const dPreStr = `${dPre.getFullYear()}-${String(dPre.getMonth()+1).padStart(2,'0')}-${String(dPre.getDate()).padStart(2,'0')}`;
            enviarEm = localToUtc(dPreStr, `${hStr.padStart(2,'0')}:${mStr.padStart(2,'0')}`, tzPre);
          } else if (automacao.tipoGatilho === 'horas_antes_agendamento') {
            const delayMin = automacao.delayMinutos ?? 60;
            const [hAg, mAg] = ag.horaInicio.split(':');
            // Horário do agendamento é no timezone da empresa
            const tsAgendamento = localToUtc(dataStr, `${hAg.padStart(2,'0')}:${mAg.padStart(2,'0')}`, tzPre).getTime();
            enviarEm = new Date(tsAgendamento - delayMin * 60 * 1000);
          }
          // NOTA: horas_apos_agendamento e dias_depois_agendamento foram removidos do pré-registro
          // pois dependem de status='concluido' (tratados pelo processamento em tempo real)

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

          // Gerar texto real da mensagem usando o template da automação
          const _preOrigin = process.env.VITE_OAUTH_PORTAL_URL ?? 'https://agendei-app-bkct9rps.manus.space';
          const _preLink = ag.empresaPortalSlug ? `${_preOrigin}/agendar/${ag.empresaPortalSlug}` : `${_preOrigin}/agendar?e=${ag.empresaId}`;
          const valorTotalPre = parseFloat(String(ag.valorTotal ?? '0'));
          const dataFormatadaPre = ag.data
            ? new Date(getDataStr(ag.data) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';
          const preTemplateVars: Record<string, string> = {
            nome_cliente: ag.clienteNome || 'Cliente',
            primeiro_nome: (ag.clienteNome || 'Cliente').split(' ')[0],
            servico: ag.servicoNome ?? '',
            data: dataFormatadaPre,
            hora: formatarHora(ag.horaInicio),
            profissional: ag.profissionalNome ?? '',
            empresa: ag.empresaNome ?? '',
            valor: `R$ ${valorTotalPre.toFixed(2).replace('.', ',')}`,
            link_agendamento: _preLink,
            observacoes: ag.observacoes ?? '',
          };
          if (!automacao.corpoMensagem) continue;
          const mensagemPre = automacao.corpoMensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => preTemplateVars[key] ?? '');

          // Extrair mídia do flow se houver
          const midiaUrlPre = (() => {
            if (!automacao.flowJson) return undefined;
            try {
              const flow = JSON.parse(automacao.flowJson);
              if (Array.isArray(flow)) { for (const n of flow) { if (n?.data?.midiaUrl) return n.data.midiaUrl; } }
              else if (flow?.midiaUrl) return flow.midiaUrl;
            } catch {} return undefined;
          })();

          // Registrar como agendado com texto real da mensagem
          await db.insert(historicoEnviosAutomacao).values({
            empresaId,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: ag.clienteId ?? null,
            clienteNome: ag.clienteNome ?? null,
            agendamentoId: ag.id,
            telefone: ag.clienteTelefone,
            canal: (automacao.canalEnvio ?? 'whatsapp') as any,
            mensagem: mensagemPre,
            status: 'agendado',
            enviarEm,
            midiaUrl: midiaUrlPre,
          }).catch(() => {}); // Ignorar erros de duplicata

          console.log(`[Scheduler] Pré-registrado agendado: ${automacao.nome} para ${ag.clienteNome} em ${enviarEm.toISOString()}`);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao pré-registrar pendentes:', err);
  }
}

// ── Verificar se é hora de executar tarefa (baseado no timezone padrão) ───────────────
function deveExecutarNaHora(horaAlvo: number): boolean {
  const { hora, minuto } = getHoraNoTimezone('America/Sao_Paulo');
  return hora === horaAlvo && minuto < 5; // janela de 5 minutos
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

    // 1. Expirar itens pendentes/agendados com enviarEm + 4h < agora
    const expirados = await db
      .select({ id: historicoEnviosAutomacao.id })
      .from(historicoEnviosAutomacao)
      .where(and(
        or(
          eq(historicoEnviosAutomacao.status, 'pendente'),
          eq(historicoEnviosAutomacao.status, 'agendado'),
        ),
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

    // 2. Verificar se há itens para processar antes de checar conexão
    // NOTA: A verificação de conexão é feita por empresa dentro do routedSendMessage/routedSendMedia,
    // pois empresas PRO usam Z-API (sem necessidade de Baileys conectado).
    // Apenas pular o ciclo se Baileys estiver desconectado E não houver empresas PRO na fila.
    const waState = waManager.getState();
    const baileysConectado = waState.status === 'connected';
    // Continua mesmo com Baileys desconectado — routedSendMessage trata por empresa

    // 3. Buscar pendentes/agendados com enviarEm <= agora (hora chegou)
    const pendentes = await db
      .select()
      .from(historicoEnviosAutomacao)
      .where(and(
        or(
          eq(historicoEnviosAutomacao.status, 'pendente'),
          eq(historicoEnviosAutomacao.status, 'agendado'),
        ),
        lte(historicoEnviosAutomacao.enviarEm, agora),
      ))
      .limit(50); // processar até 50 por ciclo

    if (pendentes.length === 0) return;

    console.log(`[Fila] Processando ${pendentes.length} envio(s) pendente(s)/agendado(s)...`);

    for (const item of pendentes) {
      if (!item.telefone || !item.mensagem) {
        await db.update(historicoEnviosAutomacao)
          .set({ status: 'falhou', erroDetalhe: 'Telefone ou mensagem ausente' })
          .where(eq(historicoEnviosAutomacao.id, item.id));
        continue;
      }

      try {
        let enviado = false;
        let erroDetalhe: string | null = null;

        // Verificar se há mídia para enviar
        if (item.midiaUrl) {
          try {
            // Classificar tipo de mídia pela extensão
            const urlLower = item.midiaUrl.toLowerCase();
            const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(urlLower);
            const isDocument = /\.pdf(\?|$)/.test(urlLower);
            const mimeType = isDocument ? 'application/pdf' : 'image/jpeg';

            if (isImage || isDocument) {
              enviado = await routedSendMedia(item.empresaId, item.telefone, item.midiaUrl, item.mensagem, mimeType);
            } else {
              // Extensão desconhecida: tentar enviar como imagem
              enviado = await routedSendMedia(item.empresaId, item.telefone, item.midiaUrl, item.mensagem);
            }

            if (!enviado) {
              // Mídia falhou: tentar enviar apenas texto como fallback
              console.log(`[Fila] ⚠️ Mídia falhou para ${item.clienteNome ?? item.telefone}, enviando apenas texto`);
              erroDetalhe = 'Envio de mídia falhou, enviado apenas texto';
              enviado = await routedSendMessage(item.empresaId, item.telefone, item.mensagem);
            }
          } catch (mediaErr) {
            // Mídia falhou com exceção: tentar enviar apenas texto como fallback
            console.warn(`[Fila] ⚠️ Erro ao enviar mídia para ${item.clienteNome ?? item.telefone}:`, mediaErr);
            erroDetalhe = `Mídia falhou (${String(mediaErr)}), enviado apenas texto`;
            try {
              enviado = await routedSendMessage(item.empresaId, item.telefone, item.mensagem);
            } catch {
              enviado = false;
            }
          }
        } else {
          // Sem mídia: enviar apenas texto
          enviado = await routedSendMessage(item.empresaId, item.telefone, item.mensagem);
        }

        await db.update(historicoEnviosAutomacao)
          .set({
            status: enviado ? 'enviado' : 'falhou',
            erroDetalhe: enviado ? (erroDetalhe ?? null) : (erroDetalhe ?? 'Falha ao enviar via WhatsApp'),
          })
          .where(eq(historicoEnviosAutomacao.id, item.id));

        if (enviado) {
          // Incrementar contador de uso
          try { await (await import('./db-plans')).incrementWhatsappCount(item.empresaId); } catch {}
          console.log(`[Fila] ✅ Enviado para ${item.clienteNome ?? item.telefone} (${item.automacaoNome ?? 'manual'})${item.midiaUrl ? ' [com mídia]' : ''}`);
          // Notificação in-app para admins quando item AGENDADO é enviado
          if (item.status === 'agendado') {
            try {
              await createNotificacao({
                empresaId: item.empresaId,
                tipo: 'sistema',
                titulo: `Mensagem agendada enviada ✅`,
                mensagem: `Automação "${item.automacaoNome ?? 'Manual'}" enviada para ${item.clienteNome ?? item.telefone}`,
                destinatarioId: null, // visível para todos admins
              });
            } catch { /* não falhar o envio por causa da notificação */ }
          }
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

// ── Limpar notificações com mais de 30 dias ─────────────────────────────────
async function limparNotificacoesAntigas() {
  const db = await getDb();
  if (!db) return;

  const limite = new Date();
  limite.setDate(limite.getDate() - 30);

  try {
    // Remover notificações do sistema com mais de 30 dias
    const resultSistema = await db.delete(notificacoes)
      .where(lte(notificacoes.createdAt, limite));

    // Remover notificações de pacotes com mais de 30 dias
    const resultPacotes = await db.delete(notificacoesPacotes)
      .where(lte(notificacoesPacotes.enviadoEm, limite));

    const totalSistema = (resultSistema as any)?.rowsAffected ?? 0;
    const totalPacotes = (resultPacotes as any)?.rowsAffected ?? 0;
    const total = totalSistema + totalPacotes;

    if (total > 0) {
      console.log(`[Scheduler] Limpeza de notificações: ${totalSistema} do sistema + ${totalPacotes} de pacotes removidas (> 30 dias).`);
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao limpar notificações antigas:', err);
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

        // Disparar automação pre_agendamento_cancelado se existir
        try {
          const { getAutomacaoByEvento } = await import('./db');
          const automacao = await getAutomacaoByEvento(empresa.id, 'pre_agendamento_cancelado');
          if (automacao && ag.clienteId) {
            // Buscar dados completos do agendamento para templateVars
            const [agCompleto] = await db.select().from(agendamentos).where(eq(agendamentos.id, ag.id)).limit(1);
            if (agCompleto) {
              const { clientes: clientesTable } = await import('../drizzle/schema');
              const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, ag.clienteId)).limit(1);
              const telefone = cliente?.whatsapp || cliente?.telefone;
              if (telefone) {
                const nomeCliente = cliente?.nome || 'Cliente';
                const templateVars: Record<string, string> = {
                  nome_cliente: nomeCliente,
                  primeiro_nome: nomeCliente.split(' ')[0],
                  empresa: empresa.nome ?? '',
                  data: agCompleto.data ?? '',
                  hora: formatarHora(agCompleto.horaInicio),
                };
                if (!automacao.corpoMensagem) continue;
                let mensagem = automacao.corpoMensagem;
                for (const [k, v] of Object.entries(templateVars)) {
                  mensagem = mensagem.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
                }
                await registrarEnvioAutomacao({
                  empresaId: empresa.id,
                  automacaoId: automacao.id,
                  automacaoNome: automacao.nome,
                  agendamentoId: ag.id,
                  clienteId: ag.clienteId,
                  clienteNome: nomeCliente,
                  telefone,
                  mensagem,
                  status: 'pendente',
                  enviarEm: new Date(),
                  midiaUrl: (() => {
                    if (!automacao.flowJson) return undefined;
                    try {
                      const flow = JSON.parse(automacao.flowJson);
                      if (Array.isArray(flow)) {
                        for (const node of flow) {
                          if (node?.data?.midiaUrl) return node.data.midiaUrl;
                        }
                      } else if (flow?.midiaUrl) return flow.midiaUrl;
                    } catch {}
                    return undefined;
                  })(),
                });
              }
            }
          }
        } catch (e) {
          console.error(`[Scheduler] Erro ao disparar automação pre_agendamento_cancelado para ag ${ag.id}:`, e);
        }
      }
    }

    if (totalCancelados > 0) {
      console.log(`[Scheduler] ${totalCancelados} pré-agendamento(s) cancelado(s) por expiração de reserva`);
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao cancelar pré-agendamentos expirados:', err);
  }
}

// ── R6: Geração automática de recorrências ──────────────────────────────────────────────────────────
async function processarRecorrencias() {
  try {
    const db = await getDb();
    if (!db) return;
    const hoje = new Date().toISOString().split('T')[0];

    // Mapeamento de recorrência para dias
    const recorrenciaDias: Record<string, number> = {
      semanal: 7, quinzenal: 14, mensal: 30, bimestral: 60,
      trimestral: 90, semestral: 180, anual: 365,
    };

    const addDays = (dateStr: string, days: number): string => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().split('T')[0];
    };

    // ── Contas a Pagar recorrentes pagas/vencidas sem próxima parcela ──
    const contasPagarRecorrentes = await db.select().from(contasPagar)
      .where(and(
        eq(contasPagar.recorrente, true),
        or(eq(contasPagar.status, 'pago'), eq(contasPagar.status, 'vencido')),
      ));

    for (const conta of contasPagarRecorrentes) {
      if (!conta.recorrenciaTipo) continue;
      const dias = recorrenciaDias[conta.recorrenciaTipo] ?? 30;
      const proximaData = addDays(conta.dataVencimento, dias);

      // Verificar se já existe próxima parcela com mesma descrição e data
      const jaExiste = await db.select({ id: contasPagar.id }).from(contasPagar)
        .where(and(
          eq(contasPagar.empresaId, conta.empresaId),
          eq(contasPagar.descricao, conta.descricao),
          eq(contasPagar.dataVencimento, proximaData),
        ))
        .limit(1);

      if (jaExiste.length === 0) {
        await db.insert(contasPagar).values({
          empresaId: conta.empresaId,
          descricao: conta.descricao,
          valor: conta.valor,
          dataVencimento: proximaData,
          categoriaId: conta.categoriaId,
          status: 'pendente',
          recorrente: true,
          recorrenciaTipo: conta.recorrenciaTipo,
          observacoes: conta.observacoes,
          fornecedor: conta.fornecedor,
          meioPagamentoId: conta.meioPagamentoId,
        });
        console.log(`[Recorrencia] Conta a pagar gerada: ${conta.descricao} venc. ${proximaData}`);
      }
    }

    // ── Contas a Receber recorrentes recebidas/vencidas sem próxima parcela ──
    const contasReceberRecorrentes = await db.select().from(contasReceber)
      .where(and(
        eq(contasReceber.recorrente, true),
        or(eq(contasReceber.status, 'recebido'), eq(contasReceber.status, 'vencido')),
      ));

    for (const conta of contasReceberRecorrentes) {
      if (!conta.recorrenciaTipo) continue;
      const dias = recorrenciaDias[conta.recorrenciaTipo] ?? 30;
      const proximaData = addDays(conta.dataVencimento, dias);

      const jaExiste = await db.select({ id: contasReceber.id }).from(contasReceber)
        .where(and(
          eq(contasReceber.empresaId, conta.empresaId),
          eq(contasReceber.descricao, conta.descricao),
          eq(contasReceber.dataVencimento, proximaData),
        ))
        .limit(1);

      if (jaExiste.length === 0) {
        await db.insert(contasReceber).values({
          empresaId: conta.empresaId,
          descricao: conta.descricao,
          valor: conta.valor,
          dataVencimento: proximaData,
          status: 'pendente',
          origem: conta.origem,
          clienteId: conta.clienteId,
          profissionalId: conta.profissionalId,
          tipoPagamento: conta.tipoPagamento,
          meioPagamentoId: conta.meioPagamentoId,
          observacoes: conta.observacoes,
          recorrente: true,
          recorrenciaTipo: conta.recorrenciaTipo,
        });
        console.log(`[Recorrencia] Conta a receber gerada: ${conta.descricao} venc. ${proximaData}`);
      }
    }

    console.log(`[Recorrencia] Processamento concluído`);
  } catch (err) {
    console.error('[Recorrencia] Erro:', err);
  }
}

// ── Confirmação automática por proximidade ──────────────────────────────────────────────────────────
async function processarConfirmacaoAutomatica() {
  const db = await getDb();
  if (!db) return;

  try {
    const agora = new Date();

    // Buscar todas as automações ativas do tipo horas_antes_agendamento com confirmação auto ativa
    const automacoesComConfirmacao = await db
      .select({
        id: automacoes.id,
        empresaId: automacoes.empresaId,
        nome: automacoes.nome,
        delayMinutos: automacoes.delayMinutos,
        confirmacaoAutoHorasAntes: automacoes.confirmacaoAutoHorasAntes,
      })
      .from(automacoes)
      .where(and(
        eq(automacoes.tipoGatilho, 'horas_antes_agendamento'),
        eq(automacoes.ativo, true),
        eq(automacoes.confirmacaoAutoAtivo, true),
      ));

    if (automacoesComConfirmacao.length === 0) return;

    for (const automacao of automacoesComConfirmacao) {
      const horasAntes = automacao.confirmacaoAutoHorasAntes ?? 2;
      const msAntes = horasAntes * 60 * 60 * 1000;

      // Janela: agendamentos que começam entre agora e agora+horasAntes
      const dataMin = agora;
      const dataMax = new Date(agora.getTime() + msAntes);
      const dataMinStr = dataMin.toISOString().slice(0, 10);
      const dataMaxStr = dataMax.toISOString().slice(0, 10);

      // Buscar agendamentos agendados (não confirmados) nessa janela
      const ags = await db
        .select({
          id: agendamentos.id,
          empresaId: agendamentos.empresaId,
          data: agendamentos.data,
          horaInicio: agendamentos.horaInicio,
          status: agendamentos.status,
          clienteNome: clientes.nome,
          profissionalNome: profissionais.nome,
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .leftJoin(profissionais, eq(agendamentos.profissionalId, profissionais.id))
        .where(and(
          eq(agendamentos.empresaId, automacao.empresaId),
          eq(agendamentos.status, 'agendado'), // apenas não confirmados
          sql`${agendamentos.data} >= ${dataMinStr}`,
          sql`${agendamentos.data} <= ${dataMaxStr}`,
        ));

      for (const ag of ags) {
        if (!ag.data || !ag.horaInicio) continue;

        // Calcular timestamp exato do agendamento
        const agDataStr = getDataStr(ag.data);
        const [hAg, mAg] = String(ag.horaInicio).split(':');
        const tsAgendamento = new Date(`${agDataStr}T${hAg.padStart(2,'0')}:${mAg.padStart(2,'0')}:00`).getTime();

        // Verificar se o agendamento está dentro da janela de confirmação
        const msAteAgendamento = tsAgendamento - agora.getTime();
        if (msAteAgendamento < 0 || msAteAgendamento > msAntes) continue;

        // Confirmar automaticamente
        await db.update(agendamentos)
          .set({ status: 'confirmado', confirmadoEm: agora })
          .where(and(
            eq(agendamentos.id, ag.id),
            eq(agendamentos.status, 'agendado'), // double-check para evitar race condition
          ));

        // Registrar notificação interna
        await createNotificacao({
          empresaId: automacao.empresaId,
          titulo: '\u2705 Confirmação automática',
          mensagem: `Agendamento de ${ag.clienteNome ?? 'cliente'} em ${getDataStr(ag.data)} às ${formatarHora(ag.horaInicio)} foi confirmado automaticamente (faltavam ${horasAntes}h).`,
          tipo: 'sistema',
          lida: false,
        }).catch(() => {});

        console.log(`[ConfirmacaoAuto] Agendamento ${ag.id} de ${ag.clienteNome} confirmado automaticamente (${horasAntes}h antes) — empresa ${automacao.empresaId}`);
      }
    }
  } catch (err) {
    console.error('[ConfirmacaoAuto] Erro:', err);
  }
}

// ── Inicializar agendamento ────────────────────────────────────────────────────────────────────────
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

  // REMOVIDO: Lembrete legado desativado
  // Todos os lembretes agora devem ser configurados via automações (dias_antes_agendamento)
  // Isso elimina duplicação e garante que todas as empresas usem o sistema configurável

  // NOVO: Processar automações configuradas a cada 15 minutos
  const AUTOMACAO_CHECK_MS = 15 * 60 * 1000;
  // Executar após 60s do start para garantir que o DB está pronto
  setTimeout(() => {
    processarAutomacoesAgendadas();
    processarAniversarioMes();
    processarDataFixa();
    verificarPacotesAutomacaoRenovacao();
    setInterval(() => {
      processarAutomacoesAgendadas();
      processarAniversarioMes();
      processarDataFixa();
      verificarPacotesAutomacaoRenovacao();
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

  // NOVO: Confirmação automática por proximidade — roda a cada 15 minutos
  setTimeout(() => {
    processarConfirmacaoAutomatica();
    setInterval(() => {
      processarConfirmacaoAutomatica();
    }, 15 * 60 * 1000);
  }, 75_000); // aguarda 75s para o DB estar pronto

  // NOVO: Ao reconectar WhatsApp, processar fila imediatamente
  waManager.on('connected', () => {
    console.log('[Fila] WhatsApp reconectado — processando fila pendente imediatamente...');
    setTimeout(() => processarFilaPendente(), 3_000); // aguarda 3s para estabilizar
  });

  // Limpeza de notificações antigas (> 30 dias) — roda 1x por dia às 3h da manhã
  const LIMPEZA_NOTIF_MS = 24 * 60 * 60 * 1000;
  setTimeout(() => {
    limparNotificacoesAntigas();
    setInterval(() => {
      if (deveExecutarNaHora(3)) limparNotificacoesAntigas();
    }, LIMPEZA_NOTIF_MS);
  }, 120_000); // aguarda 2min para o DB estar pronto

  // NOVO: Enviar notificações de agendamentos próximos (1 hora antes) a cada 5 minutos
  const NOTIF_AGENDAMENTO_MS = 5 * 60 * 1000;
  setTimeout(() => {
    enviarNotificacoesAgendamento();
    setInterval(() => {
      enviarNotificacoesAgendamento();
    }, NOTIF_AGENDAMENTO_MS);
  }, 120_000); // aguarda 2min para o DB estar pronto

  console.log("[Scheduler] Verificação automática de pacotes inicializada (a cada 6h).");
  console.log("[Scheduler] Lembretes automáticos de agendamento inicializados (às 9h diariamente).");
  console.log("[Scheduler] Processamento de automações configuradas inicializado (a cada 15min).");
  console.log("[Scheduler] Pré-registro de envios pendentes inicializado (a cada 1h).");
  console.log("[Scheduler] Worker de fila universal inicializado (a cada 1min + ao reconectar WhatsApp).");
  console.log("[Scheduler] Limpeza de notificações antigas inicializada (diariamente às 3h).");
  console.log("[Scheduler] Notificações de agendamentos próximos inicializadas (a cada 5min).");

  // R6: Processar recorrências de contas a pagar/receber — 1x por dia às 6h
  setTimeout(() => {
    processarRecorrencias();
    setInterval(() => {
      if (deveExecutarNaHora(6)) processarRecorrencias();
    }, 60 * 60 * 1000); // verifica a cada 1h
  }, 150_000); // aguarda 2.5min para o DB estar pronto
  console.log("[Scheduler] Geração automática de recorrências inicializada (diário às 6h).");
  console.log("[Scheduler] Confirmação automática por proximidade inicializada (a cada 15min).");
}
