import { COOKIE_NAME } from "@shared/const";
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  DIRETRIZ OBRIGATÓRIA: ZERO MENSAGENS HARDCODED VIA WHATSAPP              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  É TERMINANTEMENTE PROIBIDO enviar mensagens WhatsApp com texto fixo       ║
 * ║  (hardcoded) diretamente no código.                                        ║
 * ║                                                                            ║
 * ║  REGRA: Toda mensagem WhatsApp DEVE passar pelo sistema de automações:     ║
 * ║                                                                            ║
 * ║  1. Buscar automação configurada: getAutomacaoByEvento(empresaId, evento)   ║
 * ║  2. Se NÃO existir automação ativa → NÃO ENVIAR (silenciar)                ║
 * ║  3. Se existir → usar processarVariaveisTemplate() com o corpo da msg      ║
 * ║  4. Enfileirar via registrarEnvioAutomacao() com status 'pendente'         ║
 * ║                                                                            ║
 * ║  NUNCA faça:                                                               ║
 * ║  - routedSendMessage(empresaId, tel, "texto fixo aqui")                    ║
 * ║  - waManager.sendMessage(tel, "texto fixo aqui")                           ║
 * ║  - Montar string de mensagem com template literals no código               ║
 * ║  - Criar fallback com mensagem padrão quando não há automação              ║
 * ║                                                                            ║
 * ║  SEMPRE faça:                                                              ║
 * ║  - Criar novo tipo de evento em automation-templates.ts                    ║
 * ║  - Adicionar o trigger no frontend (Automacoes.tsx → TRIGGER_OPTIONS)      ║
 * ║  - Buscar automação no backend antes de enviar                             ║
 * ║  - Logar "envio ignorado" se não houver automação configurada              ║
 * ║                                                                            ║
 * ║  Referência: WHATSAPP_POLICY.md na raiz do projeto                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getEmpresaByOwnerId, getEmpresaDoUsuario as getEmpresaDoUsuarioDb, getEmpresaDoContexto, createEmpresa, updateEmpresa,
  getProfissionaisByEmpresa, getProfissionaisParaAgendamento, getProfissionalById, createProfissional, updateProfissional,
  getPermissoesByProfissional, updatePermissoes,
  getClientesByEmpresa, getClientesByEmpresaAll, getClienteById, createCliente, updateCliente, deleteCliente,
  getServicosByEmpresa, createServico, updateServico, getServicosByProfissional,
  deleteOuDesativarServico, deleteLoteServicos, verificarVinculosServico,
  getAgendamentosByEmpresa, getAgendamentoById, createAgendamento, updateAgendamento, getAgendamentosVinculadosByCliente,
  getBloqueiosByEmpresa, createBloqueio, createBloqueioRecorrente, updateBloqueio,
  getComissoesByEmpresa, createComissao, updateComissao,
  getNotificacoesByDestinatario, createNotificacao, marcarNotificacaoLida, marcarTodasNotificacoesLidas,
  createAutomacao, updateAutomacao, deleteAutomacao, getAutomacaoByEvento, getAutomacoesByEvento, getAutomacoesByEmpresa,
  getProntuariosByCliente, createProntuario,
  getCoresStatus, upsertCoresStatus,
  getDashboardMetrics,
  getGruposByEmpresa, getGrupoById, createGrupo, updateGrupo, deleteGrupo,
  getPermissoesGrupo, updatePermissoesGrupo, getPermissoesGrupoByProfissional,
  getPermissoesIndividuais, updatePermissoesIndividuais, deletePermissoesIndividuais,
  getMembrosGrupo, getMembrosEmpresa, addMembroGrupo, removeMembroGrupo, getPermissoesUsuario,
  getConvitesByEmpresa, createConvite, getConviteByToken, updateConvite, getUsersByEmpresa,
  createSystemUser, getSystemUsersByEmpresa, updateSystemUser, deleteSystemUser, resetSystemUserPassword,
  getEquipeByEmpresa,
  getTiposProfissionalByEmpresa, createTipoProfissional, updateTipoProfissional, deleteTipoProfissional,
  getTiposByProfissional, setTiposProfissional,
  getCategoriasDespesaByEmpresa, createCategoriaDespesa, updateCategoriaDespesa, deleteCategoriaDespesa,
  getContasPagarByEmpresa, createContaPagar, updateContaPagar, deleteContaPagar, getMetricasContasPagar,
  getContasReceberByEmpresa, createContaReceber, updateContaReceber, deleteContaReceber, getMetricasContasReceber, importarAgendamentosParaContasReceber,
  registrarEnvioAutomacao, getHistoricoEnvios, contarFalhasRecentes, getEnvioById,
  getMeiosPagamentoByEmpresa, getMeioPagamentoById, createMeioPagamento, updateMeioPagamento, deleteMeioPagamento,
  getTaxasParcelaByMeio, upsertTaxasParcela, getMeiosPagamentoComTaxas,
  getComissoesPagarDetalhadas, marcarComissoesPagas,
  createAgendamentoItens, getItensByAgendamento, getItensByAgendamentos, deleteItensByAgendamento,
  getPagamentosByAgendamento, addPagamentoAgendamento, removePagamentoAgendamento, updateDescontoAgendamento, updateTaxaAdicionalAgendamento,
  getTaxasConfigByEmpresa, createTaxaConfig, updateTaxaConfig, deleteTaxaConfig,
  getDashboardConfig, saveDashboardConfig,
  deleteAgendamentoCompleto,
  getSaldoCreditoCliente,
  registrarCreditoCliente,
  getHistoricoCreditoCliente,
  listSaldosCreditoPorEmpresa,
  getResumoCreditosEmpresa,
  editarCreditoCliente,
  removerCreditoCliente,
  getPessoasAgendamento,
  getContatoPrincipalAgendamento,
  adicionarPessoaAgendamento,
  removerPessoaAgendamento,
  definirPrincipalAgendamento,
  getPessoasByAgendamentos,
  jaEnviouNaCriacaoDoAgendamento,
} from "./db";
import { provisionarAutomacoesDefault } from "./automation-templates";
import { storagePut } from "./storage";
import { checkAgendamentoLimit, checkProfissionalLimit, getEmpresaPlan, getOrCreateSubscription, getOrCreateUsage, incrementAgendamentosCount, decrementAgendamentosCount, getSubscriptionData } from "./db-plans";
import { checkAndNotifyUsageLimits } from "./usage-alerts";
import { PLAN_LIMITS, PLAN_PRICES, getAgendamentosUsagePercent } from "./plans";
import { zanduRouter } from "./routers/zandu";
import { pipelineRouter } from "./routers/pipeline";
import { iaFinanceiroRouter } from "./routers/iaFinanceiro";
import { iaClientesRouter } from "./routers/iaClientes";
import { suporteRouter } from "./routers/suporte";
import { gerarDocumentacaoObsidian } from "./jobs/gerar-documentacao";
import { portalRouter } from "./routers/portal";
import { importacaoRouter } from "./routers/importacao";
import { pacotesRouter } from "./routers/pacotes";
import { relatoriosRouter } from "./routers/relatorios";
import { onboardingRouter } from "./routers/onboarding";
import { orizontechRouter } from "./routers/orizontech";
import { nanoid } from "nanoid";
import { pacotesClientes, pacotesClientesItens, historicoEnviosAutomacao, automacoes, clientes } from "../drizzle/schema";
import { eq, and, sql as drizzleSql, desc, gte, lt, or, inArray, gt, isNull } from "drizzle-orm";

/**
 * Extrai midiaUrl do flowJson de uma automação.
 * Procura em nós do flow (array) ou diretamente no objeto.
 */
function extrairMidiaUrl(flowJson: string | null | undefined): string | null {
  if (!flowJson) return null;
  try {
    const flow = JSON.parse(flowJson);
    if (Array.isArray(flow)) {
      for (const node of flow) {
        if (node?.data?.midiaUrl) return node.data.midiaUrl;
      }
    } else if (flow?.midiaUrl) {
      return flow.midiaUrl;
    }
  } catch { /* ignorar erro de parse */ }
  return null;
}

/**
 * Verifica se um agendamento passa pelas condições do flowJson.
 * Retorna true se deve receber a mensagem (sem condições = envia para todos).
 */
function verificarCondicoesFlowRouter(
  flowJson: string | null | undefined,
  servicoNome: string | null | undefined,
  todosServicos?: string[], // lista de todos os serviços do agendamento composto
  extras?: {
    profissionalNome?: string | null;       // nome do profissional do agendamento
    categoriaServico?: string | null;       // categoria do serviço principal
    todasCategorias?: string[];             // categorias de todos os serviços compostos
    valorAgendamento?: number | null;       // valor total do agendamento
    clienteTags?: string[];                 // tags do cliente
    totalAgendamentosCliente?: number;      // total histórico de agendamentos do cliente
    ultimoAgendamentoData?: Date | null;    // data do último agendamento (para inativo)
  }
): boolean {
  if (!flowJson) return true;
  try {
    const flow = JSON.parse(flowJson);
    if (!Array.isArray(flow)) return true;
    const condicoes = flow.filter((n: any) => n?.type === 'condition');
    if (condicoes.length === 0) return true;
    for (const cond of condicoes) {
      const tipo = cond?.data?.tipo;
      const valor = cond?.data?.valor;

      if (tipo === 'por_servico') {
        // Suporta campo "servicos" (array novo) ou "valor" (string legado)
        const servicosArray: string[] = Array.isArray(cond?.data?.servicos) && cond.data.servicos.length > 0
          ? cond.data.servicos
          : (valor ? String(valor).split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        if (servicosArray.length === 0) continue; // sem filtro = passa todos
        const servicosFiltro = servicosArray.map((s: string) => s.trim().toLowerCase());
        const nomesParaVerificar = todosServicos && todosServicos.length > 0
          ? todosServicos.map(s => s.trim().toLowerCase())
          : [(servicoNome ?? '').trim().toLowerCase()];
        if (nomesParaVerificar.every(n => !n)) return false;
        const passou = nomesParaVerificar.some(nomeAtual =>
          servicosFiltro.some((sf: string) =>
            nomeAtual.includes(sf) || sf.includes(nomeAtual)
          )
        );
        if (!passou) return false;

      } else if (tipo === 'por_profissional' && valor && valor !== '__todos__') {
        const profNome = (extras?.profissionalNome ?? '').trim().toLowerCase();
        const filtroProf = String(valor).trim().toLowerCase();
        if (!profNome || !profNome.includes(filtroProf) && !filtroProf.includes(profNome)) return false;

      } else if (tipo === 'por_categoria' && valor) {
        const categoriaFiltro = String(valor).trim().toLowerCase();
        const categoriasAg = extras?.todasCategorias && extras.todasCategorias.length > 0
          ? extras.todasCategorias.map(c => c.trim().toLowerCase())
          : [(extras?.categoriaServico ?? '').trim().toLowerCase()];
        if (!categoriasAg.some(c => c === categoriaFiltro)) return false;

      } else if (tipo === 'por_valor') {
        const valorAg = extras?.valorAgendamento ?? null;
        if (valorAg !== null) {
          const min = cond?.data?.valorMin !== undefined && cond.data.valorMin !== '' ? parseFloat(String(cond.data.valorMin)) : null;
          const max = cond?.data?.valorMax !== undefined && cond.data.valorMax !== '' ? parseFloat(String(cond.data.valorMax)) : null;
          if (min !== null && valorAg < min) return false;
          if (max !== null && valorAg > max) return false;
        }

      } else if (tipo === 'por_tag' && valor) {
        const tagFiltro = String(valor).trim().toLowerCase();
        const tagsCliente = (extras?.clienteTags ?? []).map(t => t.trim().toLowerCase());
        if (!tagsCliente.some(t => t.includes(tagFiltro) || tagFiltro.includes(t))) return false;

      } else if (tipo === 'por_tipo_cliente' && valor) {
        const total = extras?.totalAgendamentosCliente ?? 0;
        const ultimoAg = extras?.ultimoAgendamentoData;
        const diasSemAgendar = ultimoAg
          ? Math.floor((Date.now() - ultimoAg.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        if (valor === 'novo' && total !== 1) return false;
        if (valor === 'recorrente' && total < 2) return false;
        if (valor === 'inativo' && (diasSemAgendar === null || diasSemAgendar < 60)) return false;
        // 'aniversariante' é tratado pelo gatilho aniversario_mes, não pela condição
      }
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Gera link "Adicionar à Agenda" do Google Calendar a partir dos dados do agendamento.
 * Funciona em qualquer celular: abre o Google Calendar ou, no iOS, oferece adicionar ao Apple Calendar.
 */
function gerarLinkAgenda(params: {
  data: string;       // formato ISO: "2026-04-25" ou "YYYY-MM-DD"
  horaInicio: string; // formato "HH:mm" ou "HH:mm:ss"
  horaFim: string;    // formato "HH:mm" ou "HH:mm:ss"
  servico: string;
  empresa: string;
  profissional?: string;
  observacoes?: string;
}): string {
  // Montar datas no formato Google Calendar: YYYYMMDDTHHmmSS
  const dataLimpa = params.data.replace(/-/g, '');
  const hIni = (params.horaInicio ?? '00:00').replace(/:/g, '').slice(0, 4) + '00';
  const hFim = (params.horaFim ?? '01:00').replace(/:/g, '').slice(0, 4) + '00';
  const dtStart = `${dataLimpa}T${hIni}`;
  const dtEnd = `${dataLimpa}T${hFim}`;

  const titulo = `${params.servico} - ${params.empresa}`;
  const detalhes = [
    params.profissional ? `Profissional: ${params.profissional}` : '',
    params.observacoes ? `Obs: ${params.observacoes}` : '',
  ].filter(Boolean).join('\n');

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', titulo);
  url.searchParams.set('dates', `${dtStart}/${dtEnd}`);
  url.searchParams.set('ctz', 'America/Sao_Paulo');
  if (detalhes) url.searchParams.set('details', detalhes);
  url.searchParams.set('location', params.empresa);

  return url.toString();
}

/**
 * Processa variáveis de template em mensagens de WhatsApp/automações.
 * Substitui {{variavel}} pelos valores reais do agendamento.
 */
function processarVariaveisTemplate(template: string, vars: {
  nome_cliente?: string;
  primeiro_nome?: string;
  servico?: string;
  data?: string;
  hora?: string;
  profissional?: string;
  empresa?: string;
  valor?: string;
  valor_reserva?: string;
  link_confirmacao?: string;
  link_agendamento?: string;
  link_agenda?: string;
  observacoes?: string;
}): string {
  return template
    .replace(/\{\{nome_cliente\}\}/g, vars.nome_cliente ?? '')
    .replace(/\{\{primeiro_nome\}\}/g, vars.primeiro_nome ?? (vars.nome_cliente ?? '').split(' ')[0])
    .replace(/\{\{servico\}\}/g, vars.servico ?? '')
    .replace(/\{\{data\}\}/g, vars.data ?? '')
    .replace(/\{\{hora\}\}/g, vars.hora ?? '')
    .replace(/\{\{profissional\}\}/g, vars.profissional ?? '')
    .replace(/\{\{empresa\}\}/g, vars.empresa ?? '')
    .replace(/\{\{valor\}\}/g, vars.valor ?? '')
    .replace(/\{\{valor_reserva\}\}/g, vars.valor_reserva ?? '')
    .replace(/\{\{link_confirmacao\}\}/g, vars.link_confirmacao ?? '')
    .replace(/\{\{link_agendamento\}\}/g, vars.link_agendamento ?? '')
    .replace(/\{\{link_agenda\}\}/g, vars.link_agenda ?? '')
    .replace(/\{\{observacoes\}\}/g, vars.observacoes ?? '');
}

/**
 * Verifica se o usuário tem uma permissão específica do grupo.
 * Owner OAuth sempre tem permissão. SystemUser precisa ter o campo true no grupo.
 * Lança TRPCError FORBIDDEN se não tiver permissão.
 */
async function requirePermissao(
  ctx: { user: { id: number } | null; systemUser?: { id: number; empresaId: number } | null },
  empresa: { ownerId: number },
  permField: string
): Promise<void> {
  // Owner OAuth: sempre tem permissão
  if (!ctx.systemUser && ctx.user && empresa.ownerId === ctx.user.id) return;
  // OAuth sem ser owner: também tem (pode ser dono de outra empresa)
  if (!ctx.systemUser) return;
  // SystemUser: verificar permissões do grupo (tabela permissoes_grupo via grupoId do profissional)
  const perms = await getPermissoesGrupoByProfissional(ctx.systemUser.id);
  if (!perms || !(perms as any)[permField]) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Sem permissão para realizar esta ação (${permField}).`,
    });
  }
}

// Helper para obter empresa do usuário logado
// Suporta tanto usuários OAuth quanto system_users (ID negativo)
async function getEmpresaDoUsuario(userId: number, systemUserEmpresaId?: number | null) {
  return getEmpresaDoContexto(userId, systemUserEmpresaId);
}

/**
 * Determina se o usuário logado é admin/owner e resolve o profissionalId correto para filtros.
 * - Owner OAuth (sem systemUser): isAdmin=true, profId=null (vê todos)
 * - SystemUser com permissão verTodos: isAdmin=true, profId=null
 * - SystemUser sem permissão verTodos: isAdmin=false, profId=systemUser.id
 */
async function resolveAdminContext(
  ctx: { user: { id: number } | null; systemUser?: { id: number; empresaId: number; profissionalId: number | null } | null },
  empresa: { id: number; ownerId: number },
  permField: "agendamentosVerTodos" | "financeiroVerComissoes" | "financeiroVer" | "servicosEditar" | "profissionaisEditar" | "agendaAprovarBloqueio" = "agendamentosVerTodos"
): Promise<{ isAdmin: boolean; profId: number | null }> {
  // Owner OAuth: sempre admin
  if (!ctx.systemUser && ctx.user && empresa.ownerId === ctx.user.id) {
    return { isAdmin: true, profId: null };
  }
  // SystemUser: verificar permissões do grupo (tabela permissoes_grupo via grupoId do profissional)
  if (ctx.systemUser) {
    const perms = await getPermissoesGrupoByProfissional(ctx.systemUser.profissionalId ?? ctx.systemUser.id);
    // Verificar permissão específica ou permissão genérica de ver todos
    const temPermissao = perms ? (perms as any)[permField] === true : false;
    if (temPermissao) {
      return { isAdmin: true, profId: null };
    }
    return { isAdmin: false, profId: ctx.systemUser.profissionalId };
  }
  // OAuth sem ser owner: sem empresa vinculada, tratar como admin (owner de outra empresa)
  return { isAdmin: true, profId: null };
}

import { getUsageWithAlerts } from "./db-usage-alerts";
import { getDb } from "./db";
import { sql } from "drizzle-orm";


export const appRouter = router({
  system: systemRouter,
  zandu: zanduRouter,
  pipeline: pipelineRouter,
  iaFinanceiro: iaFinanceiroRouter,
  iaClientes: iaClientesRouter,
  suporte: suporteRouter,
  orizontech: orizontechRouter,
  portal: portalRouter,
  importacao: importacaoRouter,
  pacotes: pacotesRouter,
  relatorios: relatoriosRouter,
  onboarding: onboardingRouter,

  documentacao: router({
    exportarParaObsidian: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa || empresa.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o owner pode exportar documentacao" });
      }
      return gerarDocumentacaoObsidian();
    }),
  }),

  admin: router({
    fixAgendamentos: protectedProcedure.mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa || empresa.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o owner pode executar esta operação" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados não disponível" });
      
      try {
        // Corrigir horaInicio inválido para HH:mm (sem segundos)
        await db.execute(sql`
          UPDATE agendamentos 
          SET horaInicio = '09:00'
          WHERE horaInicio IS NULL 
             OR horaInicio = '' 
             OR horaInicio = 'NaN'
             OR LENGTH(CAST(horaInicio AS CHAR)) < 5
        `);
        
        // Corrigir horaFim inválido para HH:mm (sem segundos)
        await db.execute(sql`
          UPDATE agendamentos 
          SET horaFim = '10:00'
          WHERE horaFim IS NULL 
             OR horaFim = '' 
             OR horaFim = 'NaN'
             OR LENGTH(CAST(horaFim AS CHAR)) < 5
        `);
        
        // Remover segundos: HH:mm:ss -> HH:mm
        await db.execute(sql`
          UPDATE agendamentos 
          SET horaInicio = SUBSTRING(horaInicio, 1, 5)
          WHERE LENGTH(CAST(horaInicio AS CHAR)) >= 8 
            AND horaInicio LIKE '%:%:%'
        `);
        
        await db.execute(sql`
          UPDATE agendamentos 
          SET horaFim = SUBSTRING(horaFim, 1, 5)
          WHERE LENGTH(CAST(horaFim AS CHAR)) >= 8 
            AND horaFim LIKE '%:%:%'
        `);
        
        return { success: true, message: "Agendamentos corrigidos com sucesso" };
      } catch (error) {
        console.error('[fixAgendamentos] Erro:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao corrigir agendamentos" });
      }
    }),
  }),

  dashboardConfig: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return null;
      const userId = ctx.systemUser?.id ?? ctx.user.id;
      return getDashboardConfig(userId, empresa.id);
    }),
    save: protectedProcedure
      .input(z.array(z.object({
        id: z.string(),
        visible: z.boolean(),
        order: z.number(),
        size: z.enum(["sm", "md", "lg", "full"]),
      })))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        const userId = ctx.systemUser?.id ?? ctx.user.id;
        await saveDashboardConfig(userId, empresa.id, input);
        return { ok: true };
      }),
  }),

  auth: router({
    me: publicProcedure.query(async opts => {
      if (!opts.ctx.user) return null;
      // No modelo unificado, o systemUser É o profissional (profissionalId = systemUser.id)
      // isAdmin: owner OAuth (sem systemUser) ou systemUser com agendamentosVerTodos
      let isAdmin = false;
      let permissoes: Record<string, boolean> | null = null;
      if (!opts.ctx.systemUser) {
        // Owner OAuth: buscar empresa para verificar se é owner
        const empresa = await getEmpresaDoContexto(opts.ctx.user.id, null);
        isAdmin = empresa ? empresa.ownerId === opts.ctx.user.id : false;
        // Owner tem todas as permissões — null = acesso total
        permissoes = null;
      } else {
        // SystemUser: verificar permissões do grupo (tabela permissoes_grupo via grupoId do profissional)
        const perms = await getPermissoesGrupoByProfissional(opts.ctx.systemUser.profissionalId ?? opts.ctx.systemUser.id);
        // Verificar se o grupo é isAdmin (supergrupo) — bypass total
        // Também aceitar valor 1 (inteiro do MySQL) além de boolean true
        const grupoIsAdmin = (perms as any)?.__grupoIsAdmin === true;
        isAdmin = grupoIsAdmin || (perms ? !!(perms as any).agendamentosVerTodos : false);
        if (perms) {
          // Extrair apenas os campos booleanos de permissão (sem id, grupoId, timestamps)
          const { id: _id, grupoId: _g, createdAt: _c, updatedAt: _u, ...boolPerms } = perms as any;
          permissoes = boolPerms as Record<string, boolean>;
        } else {
          permissoes = {}; // sem grupo = sem permissões
        }
      }
      const meResult = {
        ...opts.ctx.user,
        profissionalId: opts.ctx.systemUser ? opts.ctx.systemUser.id : null,
        isProfissional: opts.ctx.systemUser?.isProfissional ?? false,
        isSystemUser: !!opts.ctx.systemUser,
        isAdmin,
        permissoes, // null = owner (acesso total); objeto = permissões do grupo
      };
      return meResult;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── EMPRESA ──────────────────────────────────────────────────────────────
  empresa: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
    }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        tipo: z.enum(["salao", "clinica", "barbearia", "consultorio", "outro"]).default("salao"),
        telefone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
        endereco: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (existing) throw new Error("Empresa já cadastrada");
        const result = await createEmpresa({ ...input, ownerId: ctx.user.id });
        // Provisionar automações default + pipeline para nova empresa
        const novaEmpresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (novaEmpresa) {
          provisionarAutomacoesDefault(novaEmpresa.id).catch(err =>
            console.error("[Templates] Erro ao provisionar:", err)
          );
        }
        return { success: true };
      }),
    checkSlugDisponivel: protectedProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const db = await getDb();
        if (!db) return { disponivel: true };
        const { empresas: empresasTable } = await import("../drizzle/schema.js");
        const { eq, and, ne } = await import("drizzle-orm");
        const existente = await db.select({ id: empresasTable.id })
          .from(empresasTable)
          .where(and(
            eq(empresasTable.portalSlug, input.slug),
            ne(empresasTable.id, empresa.id)
          ))
          .limit(1);
        return { disponivel: existente.length === 0 };
      }),

    update: protectedProcedure
      .input(z.object({
        nome: z.string().optional(),
        tipo: z.enum(["salao", "clinica", "barbearia", "consultorio", "outro"]).optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
        whatsappNumero: z.string().optional(),
        taxaMaquininha: z.string().optional(),
        percentualDona: z.string().optional(),
        reservaPercentual: z.string().optional(),
        reservaHorasExpiracao: z.number().optional(),
        corPrimaria: z.string().optional(),
        corSecundaria: z.string().optional(),
        logoUrl: z.string().optional(),
        portalAtivo: z.boolean().optional(),
        portalSlug: z.string().optional(),
        autoConfirmarPortal: z.boolean().optional(),
        portalHeaderUrl: z.string().optional(),
        portalMensagemBemVindo: z.string().optional(),
        horaAbertura: z.string().optional(),
        horaFechamento: z.string().optional(),
        diasFuncionamento: z.array(z.number()).optional(),
        intervaloMinutos: z.number().optional(),
        waMsgConfirmacao: z.string().optional(),
        waMsgCancelamento: z.string().optional(),
        waMsgLembrete: z.string().optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // R4: Validar que percentualDona não excede 100%
        if (input.percentualDona !== undefined) {
          const pDona = parseFloat(input.percentualDona);
          if (isNaN(pDona) || pDona < 0 || pDona > 100) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Percentual da dona deve estar entre 0% e 100%' });
          }
        }
        await updateEmpresa(empresa.id, input as any);
        return { success: true };
      }),
    uploadLogo: protectedProcedure
      .input(z.object({
        imagemBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error('Empresa não encontrada');
        const buffer = Buffer.from(input.imagemBase64, 'base64');
        const ext = input.mimeType.includes('png') ? 'png' : input.mimeType.includes('svg') ? 'svg' : input.mimeType.includes('webp') ? 'webp' : 'jpg';
        const key = `empresa-logos/logo-${empresa.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateEmpresa(empresa.id, { logoUrl: url } as any);
        return { success: true, url };
      }),
    uploadCapa: protectedProcedure
      .input(z.object({
        imagemBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error('Empresa não encontrada');
        const buffer = Buffer.from(input.imagemBase64, 'base64');
        const ext = input.mimeType.includes('png') ? 'png' : input.mimeType.includes('webp') ? 'webp' : 'jpg';
        const key = `empresa-capas/capa-${empresa.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateEmpresa(empresa.id, { portalHeaderUrl: url } as any);
        return { success: true, url };
      }),
  }),

  // ─── PROFISSIONAIS ────────────────────────────────────────────────────────
  profissionais: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      const profs = await getProfissionaisByEmpresa(empresa.id);
      const result = await Promise.all(profs.map(async (p) => {
        const perms = await getPermissoesByProfissional(p.id);
        return { ...p, permissoes: perms };
      }));
      return result;
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const prof = await getProfissionalById(input.id);
        if (!prof || prof.empresaId !== empresa.id) throw new Error("Profissional não encontrado");
        const perms = await getPermissoesByProfissional(prof.id);
        return { ...prof, permissoes: perms };
      }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        // Aceita string vazia (campo deixado em branco) convertendo para undefined
        email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        corCalendario: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'profissionaisCriar');
        const id = await createProfissional({ ...input, empresaId: empresa.id });
        return { id, success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        email: z.string().optional(),
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        corCalendario: z.string().optional(),
        ativo: z.boolean().optional(),
        percentualComissao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'profissionaisEditar');
        const { id, ...data } = input;
        await updateProfissional(id, data);
        return { success: true };
      }),
    // Lista apenas profissionais com isProfissional=true e ativo=true (para seletores de agendamento)
    listParaAgendamento: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getProfissionaisParaAgendamento(empresa.id);
    }),
    updatePermissoes: protectedProcedure
      .input(z.object({
        profissionalId: z.number(),
        podeAgendar: z.boolean().optional(),
        podeCancelar: z.boolean().optional(),
        podeRemarcar: z.boolean().optional(),
        podeEditarCliente: z.boolean().optional(),
        podeSolicitarBloqueio: z.boolean().optional(),
        podeVerComissoes: z.boolean().optional(),
        podeVerFinanceiro: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'profissionaisEditar');
        const { profissionalId, ...perms } = input;
        await updatePermissoes(profissionalId, perms);
        return { success: true };
      }),
  }),

  // ─── CLIENTES ─────────────────────────────────────────────────────────────
  clientes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getClientesByEmpresa(empresa.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const cliente = await getClienteById(input.id);
        if (!cliente || cliente.empresaId !== empresa.id) throw new Error("Cliente não encontrado");
        const pronts = await getProntuariosByCliente(cliente.id);
        return { ...cliente, prontuarios: pronts };
      }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
        telefone: z.string().optional(),
        whatsapp: z.string().optional(),
        cpf: z.string().optional(),
        dataNascimento: z.string().optional().transform(v => v === '' ? undefined : v),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Sincronizar telefone ↔ whatsapp: se um estiver vazio, copiar do outro
        const telefoneSync = input.telefone || input.whatsapp || '';
        const whatsappSync = input.whatsapp || input.telefone || '';
        const id = await createCliente({ ...input, telefone: telefoneSync, whatsapp: whatsappSync, empresaId: empresa.id });

        // Disparar automação cliente_criado se existir e houver telefone
        const telefoneContato = input.whatsapp || input.telefone;
        if (telefoneContato) {
          try {
            const automacao = await getAutomacaoByEvento(empresa.id, 'cliente_criado');
            if (automacao) {
              const nomeCliente = input.nome || 'Cliente';
              const templateVars = {
                nome_cliente: nomeCliente,
                primeiro_nome: nomeCliente.split(' ')[0],
                empresa: empresa.nome ?? '',
              };
              let mensagem = automacao.corpoMensagem ?? '';
              for (const [k, v] of Object.entries(templateVars)) {
                mensagem = mensagem.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
              }
              const midiaUrl = extrairMidiaUrl(automacao.flowJson);
              await registrarEnvioAutomacao({
                empresaId: empresa.id,
                automacaoId: automacao.id,
                automacaoNome: automacao.nome,
                clienteId: id,
                clienteNome: nomeCliente,
                telefone: telefoneContato,
                mensagem,
                status: 'pendente',
                enviarEm: new Date(),
                midiaUrl: midiaUrl ?? undefined,
              });
            }
          } catch (e) {
            console.error('[clientes.create] Erro ao disparar automação cliente_criado:', e);
          }
        }

        return { id, success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        email: z.string().optional(),
        telefone: z.string().optional(),
        whatsapp: z.string().optional(),
        cpf: z.string().optional(),
        dataNascimento: z.string().optional().transform(v => v === '' ? null : v),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        saldoSessoes: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        // Sincronizar telefone ↔ whatsapp: se um for atualizado e o outro não, copiar
        if (data.telefone !== undefined || data.whatsapp !== undefined) {
          const clienteAtual = await getClienteById(id);
          const novoTelefone = data.telefone ?? clienteAtual?.telefone ?? '';
          const novoWhatsapp = data.whatsapp ?? clienteAtual?.whatsapp ?? '';
          data.telefone = novoTelefone || novoWhatsapp || data.telefone;
          data.whatsapp = novoWhatsapp || novoTelefone || data.whatsapp;
        }
        await updateCliente(id, data as any);
        return { success: true };
      }),
    addProntuario: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        agendamentoId: z.number().optional(),
        profissionalId: z.number().optional(),
        titulo: z.string().min(1),
        conteudo: z.string().optional(),
        tipo: z.enum(["anamnese", "evolucao", "foto", "documento", "contrato", "outro"]).default("evolucao"),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const id = await createProntuario({ ...input, empresaId: empresa.id });
        return { id, success: true };
      }),
    uploadArquivo: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        titulo: z.string(),
        tipo: z.enum(["anamnese", "evolucao", "foto", "documento", "contrato", "outro"]),
        arquivoBase64: z.string(),
        arquivoNome: z.string(),
        arquivoTipo: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const buffer = Buffer.from(input.arquivoBase64, "base64");
        const key = `empresa-${empresa.id}/clientes/${input.clienteId}/${nanoid()}-${input.arquivoNome}`;
        const { url } = await storagePut(key, buffer, input.arquivoTipo);
        const id = await createProntuario({
          clienteId: input.clienteId,
          empresaId: empresa.id,
          titulo: input.titulo,
          tipo: input.tipo,
          arquivoUrl: url,
          arquivoKey: key,
          arquivoNome: input.arquivoNome,
          arquivoTipo: input.arquivoTipo,
        });
        return { id, url, success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const cliente = await getClienteById(input.id);
        if (!cliente || cliente.empresaId !== empresa.id) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
        await deleteCliente(input.id);
        return { success: true };
      }),
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const cliente = await getClienteById(input.id);
        if (!cliente || cliente.empresaId !== empresa.id) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
        await updateCliente(input.id, { ativo: true });
        return { success: true };
      }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getClientesByEmpresaAll(empresa.id);
    }),
  }),

  // ─── SERVIÇOS ─────────────────────────────────────────────────────────────
  servicos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      const todosServicos = await getServicosByEmpresa(empresa.id);
      // Admin/owner vê tudo
      const { isAdmin } = await resolveAdminContext(ctx, empresa, 'servicosEditar');
      if (isAdmin) return todosServicos;
      // Profissional: vê dados completos dos seus próprios serviços, apenas nome/preço/categoria dos outros
      if (ctx.systemUser) {
        const meusServicos = await getServicosByProfissional(ctx.systemUser.id);
        const meusServicosIds = new Set(meusServicos.map((s: { servicoId: number }) => s.servicoId));
        return todosServicos.map((s) => {
          if (meusServicosIds.has(s.id)) {
            // Serviço próprio: retornar dados completos
            return s;
          }
          // Serviço de outro profissional: apenas campos públicos (sem custo e comissão)
          const { custoFixo: _c, percentualComissao: _p, ...pub } = s;
          return { ...pub, custoFixo: undefined, percentualComissao: undefined };
        });
      }
      // Fallback: sem systemUser e não é admin (não deveria ocorrer)
      return todosServicos.map(({ custoFixo: _c, percentualComissao: _p, ...pub }) => pub);
    }),
    listPublico: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return getServicosByEmpresa(input.empresaId);
      }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        descricao: z.string().optional(),
        valor: z.string(),
        duracaoMinutos: z.number().default(60),
        categoria: z.string().optional(),
        cor: z.string().optional(),
        percentualComissao: z.string().optional(),
        custoFixo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'servicosCriar');
        const id = await createServico({ ...input, empresaId: empresa.id });
        return { id, success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        descricao: z.string().optional(),
        valor: z.string().optional(),
        duracaoMinutos: z.number().optional(),
        categoria: z.string().optional(),
        cor: z.string().optional(),
        ativo: z.boolean().optional(),
        percentualComissao: z.string().optional(),
        custoFixo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'servicosEditar');
        const { id, ...data } = input;
        await updateServico(id, data as any);
        return { success: true };
      }),
    // Verifica vínculos antes de mostrar o modal de confirmação
    verificarVinculos: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'servicosExcluir');
        const resultados = await Promise.all(
          input.ids.map(async (id) => {
            const vinculos = await verificarVinculosServico(id);
            return { id, ...vinculos };
          })
        );
        const comVinculos = resultados.filter(r => r.temVinculos);
        const semVinculos = resultados.filter(r => !r.temVinculos);
        return { comVinculos, semVinculos };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'servicosExcluir');
        const resultado = await deleteOuDesativarServico(input.id);
        return resultado;
      }),
    deleteLote: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'servicosExcluir');
        const resultado = await deleteLoteServicos(input.ids);
        return resultado;
      }),
  }),

  // ─── AGENDAMENTOS ─────────────────────────────────────────────────────────
  agendamentos: router({
    list: protectedProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        // Filtro opcional por profissional — usado pelo Dashboard e páginas de profissional
        profissionalId: z.number().nullable().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        // Se o input especifica explicitamente um profissionalId, usar esse
        // Caso contrário: verificar escopo da agenda no grupo do usuário
        let profId: number | null;
        if (input?.profissionalId !== undefined) {
          profId = input.profissionalId;
        } else {
          const { isAdmin, profId: resolvedProfId } = await resolveAdminContext(ctx, empresa, "agendamentosVerTodos");
          if (isAdmin) {
            profId = null; // admin vê todos
          } else if (resolvedProfId) {
            // Verificar escopo da agenda do grupo
            const perms = await getPermissoesGrupoByProfissional(resolvedProfId);
            profId = (perms as any)?.agendaEscopo === 'todos' ? null : resolvedProfId;
          } else {
            profId = resolvedProfId;
          }
        }
        return getAgendamentosByEmpresa(empresa.id, input?.dataInicio, input?.dataFim, profId);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        return getAgendamentoById(input.id);
      }),
    getItens: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        return getItensByAgendamento(input.agendamentoId);
      }),
    getVinculadosByCliente: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        return getAgendamentosVinculadosByCliente(input.clienteId, empresa.id);
      }),
    create: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        profissionalId: z.number().nullable().optional(),
        servicoId: z.number(),
        // Lista de serviços adicionais (múltiplos serviços por agendamento)
        servicos: z.array(z.object({
          servicoId: z.number(),
          profissionalId: z.number().optional(), // profissional específico para este serviço
          horaInicio: z.string().optional(), // ex: "14:00" — null = usa hora do agendamento
          horaFim: z.string().optional(),    // ex: "15:00" — null = calculado pela duração
          valorUnitario: z.string(),
          pacoteClienteItemId: z.number().optional(), // vincular sessão de pacote
        })).optional(),
        data: z.string(),
        horaInicio: z.string(),
        horaFim: z.string(),
        valorTotal: z.string(),
        status: z.enum(["pre_agendado", "agendado", "confirmado"]).default("pre_agendado"),
        observacoes: z.string().optional(),
        observacoesInternas: z.string().optional(),
        comReserva: z.boolean().default(false),
        reservaDataLimitePersonalizada: z.string().optional(), // ISO datetime — data limite manual para pagamento do sinal
        pacoteClienteItemId: z.number().optional(), // vincular sessão de pacote (serviço principal)
        taxaAdicional: z.string().optional(),
        nomeTaxaAdicional: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // ── Restrição: profissional sem permissão só pode agendar para si próprio ──
        if (ctx.systemUser?.profissionalId) {
          const { isAdmin } = await resolveAdminContext(ctx, empresa, 'agendamentosVerTodos');
          if (!isAdmin && input.profissionalId != null && input.profissionalId !== ctx.systemUser.profissionalId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Você só pode criar agendamentos para si próprio.',
            });
          }
        }
        // ── Verificar limite de agendamentos do plano ──────────────────────────
        const limitError = await checkAgendamentoLimit(empresa.id);
        if (limitError) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Limite de agendamentos do plano atingido. Faça upgrade para continuar agendando.',
          });
        }
        const { comReserva, reservaDataLimitePersonalizada, servicos: servicosInput, ...rest } = input;
        let valorReserva: string | undefined;
        let reservaExpiracaoEm: Date | undefined;
        // statusOriginal = status escolhido pelo usuário (pre_agendado, agendado, etc.)
        // Não sobrescrevemos mais para 'aguardando_reserva' — o status original é mantido
        const statusOriginal = rest.status;
        const status = rest.status;
        // Todo pré-agendamento recebe reservaExpiracaoEm — com ou sem sinal
        if (status === 'pre_agendado') {
          if (reservaDataLimitePersonalizada) {
            // Data limite manual definida pelo usuário (ex: cliente paga sinal em 31/05)
            reservaExpiracaoEm = new Date(reservaDataLimitePersonalizada);
          } else {
            // Prazo padrão da empresa em horas
            reservaExpiracaoEm = new Date(Date.now() + (empresa.reservaHorasExpiracao ?? 24) * 60 * 60 * 1000);
          }
        }
        if (comReserva) {
          const percentual = parseFloat(String(empresa.reservaPercentual)) / 100;
          valorReserva = (parseFloat(rest.valorTotal) * percentual).toFixed(2);
          // reservaExpiracaoEm já foi definido acima (padrão ou personalizado)
        }
        const id = await createAgendamento({
          ...rest,
          empresaId: empresa.id,
          status,
          valorReserva,
          reservaExpiracaoEm,
        } as any);

        // ── Criar itens de agendamento (múltiplos serviços) ────────────────────────────────────────────────
        if (servicosInput && servicosInput.length > 0) {
          // Sanitizar horaInicio/horaFim: garantir formato HH:MM (5 chars) para varchar(5)
          const sanitizarHoraCreate = (h: string | undefined | null) => h ? h.slice(0, 5) : null;
          await createAgendamentoItens(servicosInput.map(s => ({
            agendamentoId: id,
            servicoId: s.servicoId,
            profissionalId: s.profissionalId ?? null,
            horaInicio: sanitizarHoraCreate(s.horaInicio),
            horaFim: sanitizarHoraCreate(s.horaFim),
            valorUnitario: s.valorUnitario,
            pacoteClienteItemId: s.pacoteClienteItemId,
          })));
          // Descontar sessões de pacote para itens vinculados
          const db = await getDb();
          if (db) {
            for (const s of servicosInput) {
              if (s.pacoteClienteItemId) {
                await db.update(pacotesClientesItens)
                  .set({ quantidadeUsada: drizzleSql`quantidadeUsada + 1` })
                  .where(eq(pacotesClientesItens.id, s.pacoteClienteItemId));
                // Verificar se o pacote foi concluído
                const [item] = await db.select().from(pacotesClientesItens)
                  .where(eq(pacotesClientesItens.id, s.pacoteClienteItemId)).limit(1);
                if (item) {
                  const todosItens = await db.select().from(pacotesClientesItens)
                    .where(eq(pacotesClientesItens.pacoteClienteId, item.pacoteClienteId));
                  const pacoteConcluido = todosItens.every(i => i.quantidadeUsada >= i.quantidadeTotal);
                  if (pacoteConcluido) {
                    await db.update(pacotesClientes)
                      .set({ status: "concluido" })
                      .where(eq(pacotesClientes.id, item.pacoteClienteId));
                  }
                }
              }
            }
          }
        } else {
          // Compatibilidade: criar item com o serviço principal
          await createAgendamentoItens([{
            agendamentoId: id,
            servicoId: rest.servicoId,
            valorUnitario: rest.valorTotal,
            pacoteClienteItemId: rest.pacoteClienteItemId,
          }]);
          // Descontar sessão de pacote se vinculado
          if (rest.pacoteClienteItemId) {
            const db = await getDb();
            if (db) {
              await db.update(pacotesClientesItens)
                .set({ quantidadeUsada: drizzleSql`quantidadeUsada + 1` })
                .where(eq(pacotesClientesItens.id, rest.pacoteClienteItemId));
              // Verificar se o pacote foi concluído
              const [item] = await db.select().from(pacotesClientesItens)
                .where(eq(pacotesClientesItens.id, rest.pacoteClienteItemId)).limit(1);
              if (item) {
                const todosItens = await db.select().from(pacotesClientesItens)
                  .where(eq(pacotesClientesItens.pacoteClienteId, item.pacoteClienteId));
                const pacoteConcluido = todosItens.every(i => i.quantidadeUsada >= i.quantidadeTotal);
                if (pacoteConcluido) {
                  await db.update(pacotesClientes)
                    .set({ status: "concluido" })
                    .where(eq(pacotesClientes.id, item.pacoteClienteId));
                }
              }
            }
          }
        }

      // ── Enfileirar envio automático de confirmação via WhatsApp (fila universal) ──       // Sempre enfileira como 'pendente', independente do WhatsApp estar conectado.
        // O worker de processamento (scheduler) enviará quando a conexão estiver disponível.
        try {
          const todosServicosEmpresa = await getServicosByEmpresa(empresa.id);
          const [cliente, profissional, servico] = await Promise.all([
            getClienteById(rest.clienteId),
            rest.profissionalId != null ? getProfissionalById(rest.profissionalId) : Promise.resolve(null),
            Promise.resolve(todosServicosEmpresa.find(s => s.id === rest.servicoId) ?? null),
          ]);
          // Buscar todos os serviços do agendamento composto para filtro e log
          const itensAgCriado = servicosInput && servicosInput.length > 0
            ? servicosInput.map(s => todosServicosEmpresa.find(sv => sv.id === s.servicoId)?.nome).filter(Boolean) as string[]
            : (servico?.nome ? [servico.nome] : []);
          const servicoNomeCriado = itensAgCriado.length > 0 ? itensAgCriado.join(', ') : (servico?.nome ?? undefined);
          const telefone = cliente?.whatsapp || cliente?.telefone;
          if (telefone && cliente) {
            const dataFormatada = new Date(rest.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            // Calcular valor_reserva: percentual da empresa × valor do serviço
            const percentualReserva = parseFloat(String(empresa.reservaPercentual ?? 0)) / 100;
            const valorServico = parseFloat(rest.valorTotal ?? '0');
            const valorReservaCalc = percentualReserva > 0 ? `R$ ${(valorServico * percentualReserva).toFixed(2).replace('.', ',')}` : '';
            const _portalOrigin = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
            const _linkAgendamento = empresa.portalSlug ? `${_portalOrigin}/agendar/${empresa.portalSlug}` : `${_portalOrigin}/agendar?e=${empresa.id}`;
            const templateVars = {
              nome_cliente: cliente.nome || 'Cliente',
              primeiro_nome: (cliente.nome || 'Cliente').split(' ')[0],
              servico: servico?.nome ?? '',
              data: dataFormatada,
              hora: `${String(rest.horaInicio ?? '').slice(0, 5)} – ${String(rest.horaFim ?? '').slice(0, 5)}`,
              profissional: profissional?.nome ?? '',
              empresa: empresa.nome,
              valor: `R$ ${valorServico.toFixed(2).replace('.', ',')}`,
              valor_reserva: valorReservaCalc,
              link_agendamento: _linkAgendamento,
              link_agenda: gerarLinkAgenda({
                data: rest.data,
                horaInicio: String(rest.horaInicio ?? '00:00'),
                horaFim: String(rest.horaFim ?? '01:00'),
                servico: servico?.nome ?? 'Agendamento',
                empresa: empresa.nome,
                profissional: profissional?.nome,
                observacoes: rest.observacoes,
              }),
              observacoes: rest.observacoes ?? '',
            };
            // ── Lógica de prioridade de automação por status inicial ────────────────
            let automacaoAtiva: Awaited<ReturnType<typeof getAutomacaoByEvento>> = null;
            let nomeEventoUsado = 'Confirmação de Agendamento';

            if (statusOriginal === 'pre_agendado') {
              automacaoAtiva = await getAutomacaoByEvento(empresa.id, 'agendamento_pre_agendado');
              nomeEventoUsado = automacaoAtiva ? 'Pré-agendamento' : 'Confirmação de Agendamento';
              if (!automacaoAtiva) {
                automacaoAtiva = await getAutomacaoByEvento(empresa.id, 'agendamento_criado');
              }
            } else {
              automacaoAtiva = await getAutomacaoByEvento(empresa.id, 'agendamento_criado');
            }

            // Montar extras para filtros avançados de condição
            const todasCategoriasAg = servicosInput && servicosInput.length > 0
              ? servicosInput.map(s => todosServicosEmpresa.find(sv => sv.id === s.servicoId)?.categoria).filter(Boolean) as string[]
              : (servico?.categoria ? [servico.categoria] : []);
            const extrasCondicao = {
              profissionalNome: profissional?.nome ?? null,
              categoriaServico: servico?.categoria ?? null,
              todasCategorias: todasCategoriasAg,
              valorAgendamento: parseFloat(rest.valorTotal ?? '0'),
              clienteTags: Array.isArray(cliente.tags) ? cliente.tags as string[] : [],
              totalAgendamentosCliente: (cliente as any).agendamentosCount ?? 0,
              ultimoAgendamentoData: null as Date | null, // criando agora, sem histórico prévio relevante
            };
            // Verificar condições do flowJson (filtros por serviço, profissional, categoria, valor, tag, tipo de cliente)
            const passouFiltroServico = !automacaoAtiva || verificarCondicoesFlowRouter(automacaoAtiva.flowJson, servico?.nome, itensAgCriado, extrasCondicao);
            if (!automacaoAtiva || !automacaoAtiva.corpoMensagem) {
              // Sem automação configurada ou sem mensagem: não enviar nada
              console.log(`[Fila] Nenhuma automação ativa para ag. ${id} (${statusOriginal}) — envio ignorado`);
            } else if (!passouFiltroServico) {
              console.log(`[Fila] Automação "${automacaoAtiva.nome}" ignorada para ag. ${id}: filtro de condição não passou`);
            } else {
              const mensagem = processarVariaveisTemplate(automacaoAtiva.corpoMensagem, { ...templateVars, servico: servicoNomeCriado ?? templateVars.servico });

              // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
              const midiaUrlCriado = extrairMidiaUrl(automacaoAtiva.flowJson);
              await registrarEnvioAutomacao({
                empresaId: empresa.id,
                automacaoId: automacaoAtiva?.id,
                automacaoNome: automacaoAtiva?.nome ?? nomeEventoUsado,
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                agendamentoId: id,
                telefone,
                canal: 'whatsapp',
                mensagem,
                status: 'pendente',
                enviarEm: new Date(), // envio imediato — worker processa em até 1 minuto
                midiaUrl: midiaUrlCriado ?? undefined,
                servicoNome: servicoNomeCriado ?? undefined, // todos os serviços concatenados
              });
              console.log(`[Fila] Envio enfileirado para ag. ${id} (${statusOriginal}) → ${automacaoAtiva?.nome ?? nomeEventoUsado}`);
            } // fim do else (passou pelo filtro de serviço)
          }
        } catch (e) {
          // Não bloquear o fluxo principal se o enfileiramento falhar
          console.error('[Fila] Erro ao enfileirar confirmação:', e);
        }

        // ── Verificar limites e enviar alerta se necessário ─────────────────────
        try {
          const [plan, usage] = await Promise.all([
            getEmpresaPlan(empresa.id),
            getOrCreateUsage(empresa.id),
          ]);
          if (plan && usage) {
            await checkAndNotifyUsageLimits({
              empresaId: empresa.id,
              empresaNome: empresa.nome,
              plan,
              agendamentosCount: usage.agendamentosCount,
              notificacoesWhatsappCount: usage.notificacoesWhatsappCount,
            });
          }
        } catch (e) {
          console.error('[UsageAlert] Erro ao verificar limites:', e);
        }
        return { id, success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pre_agendado", "agendado", "confirmado", "em_andamento", "concluido", "cancelado", "faltou", "remarcado"]).optional(),
        clienteId: z.number().optional(),
        data: z.string().optional(),
        horaInicio: z.string().optional(),
        horaFim: z.string().optional(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
        observacoes: z.string().optional(),
        observacoesInternas: z.string().optional(),
        reservaPaga: z.boolean().optional(),
        minutosAtraso: z.number().min(0).max(300).optional(), // atraso da cliente em minutos (0 = pontual)
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        const updates: Record<string, any> = { ...data };
        if (data.status === "confirmado") updates.confirmadoEm = new Date();
        if (data.status === "concluido") updates.concluidoEm = new Date();
        if (data.reservaPaga) updates.reservaPagaEm = new Date();
        await updateAgendamento(id, updates);

        // ── Abatimento automático de pacote ao concluir ──────────────────────
        if (data.status === "concluido") {
          // Verificar se o agendamento já possui vínculo com pacote (via agendamentoItens.pacoteClienteItemId)
          // Se sim, a sessão já foi decrementada na criação — pular abatimento automático
          const itensDoAgendamento = await getItensByAgendamento(id);
          const jaVinculadoAPacote = itensDoAgendamento.some(item => item.pacoteClienteItemId != null);

          if (!jaVinculadoAPacote) {
          try {
            // Buscar o agendamento para obter clienteId e servicoId
            const agendamento = await getAgendamentoById(id);
            if (agendamento) {
              const db = await getDb();
              if (db) {
                // Buscar pacote ativo do cliente com o serviço deste agendamento
                const pacotesAtivos = await db.select({
                  itemId: pacotesClientesItens.id,
                  pacoteId: pacotesClientesItens.pacoteClienteId,
                  quantidadeTotal: pacotesClientesItens.quantidadeTotal,
                  quantidadeUsada: pacotesClientesItens.quantidadeUsada,
                }).from(pacotesClientesItens)
                  .innerJoin(pacotesClientes, eq(pacotesClientesItens.pacoteClienteId, pacotesClientes.id))
                  .where(and(
                    eq(pacotesClientes.clienteId, agendamento.clienteId),
                    eq(pacotesClientes.status, "ativo"),
                    eq(pacotesClientesItens.servicoId, agendamento.servicoId),
                    drizzleSql`${pacotesClientesItens.quantidadeUsada} < ${pacotesClientesItens.quantidadeTotal}`,
                  ))
                  .limit(1);

                if (pacotesAtivos.length > 0) {
                  const item = pacotesAtivos[0];
                  const novaQtd = item.quantidadeUsada + 1;
                  await db.update(pacotesClientesItens)
                    .set({ quantidadeUsada: novaQtd })
                    .where(eq(pacotesClientesItens.id, item.itemId));

                  // Verificar se o pacote inteiro foi concluído
                  const todosItens = await db.select().from(pacotesClientesItens)
                    .where(eq(pacotesClientesItens.pacoteClienteId, item.pacoteId));
                  const pacoteConcluido = todosItens.every(i =>
                    (i.id === item.itemId ? novaQtd : i.quantidadeUsada) >= i.quantidadeTotal
                  );
                  if (pacoteConcluido) {
                    await db.update(pacotesClientes)
                      .set({ status: "concluido" })
                      .where(eq(pacotesClientes.id, item.pacoteId));
                  }
                }
              }
            }
          } catch (e) {
            // Não bloquear o fluxo principal se o abatimento falhar
            console.error("[Pacotes] Erro ao abater sessão:", e);
          }
          } // fim if (!jaVinculadoAPacote)
        }
        // ── Lançamento automático em Contas a Receber ao concluir ──────────────
        if (data.status === "concluido") {
          try {
            const agendamento = await getAgendamentoById(id);
            if (agendamento) {
              const db = await getDb();
              if (db) {
                const { contasReceber: crTable } = await import("../drizzle/schema");
                const jaExiste = await db.select({ id: crTable.id })
                  .from(crTable)
                  .where(and(eq(crTable.origemId, id), eq(crTable.origem, "agendamento")))
                  .limit(1);
                if (jaExiste.length === 0) {
                  const todosServicos = await getServicosByEmpresa(empresa.id);
                  const servico = todosServicos.find(s => s.id === agendamento.servicoId);
                  const valorServico = parseFloat(String(servico?.valor ?? 0));
                  const hoje = new Date().toISOString().split('T')[0];
                  await createContaReceber({
                    empresaId: empresa.id,
                    descricao: `Atendimento: ${servico?.nome ?? 'Serviço'} - ${agendamento.data}`,
                    valor: String(valorServico.toFixed(2)),
                    dataVencimento: hoje,
                    dataRecebimento: hoje,
                    status: "pendente",
                    origem: "agendamento",
                    origemId: id,
                    clienteId: agendamento.clienteId,
                    profissionalId: agendamento.profissionalId,
                  });
                  console.log(`[ContasReceber] Lançamento criado para agendamento ${id}`);
                }
              }
            }
          } catch (e) {
            console.error("[ContasReceber] Erro ao criar lançamento:", e);
          }
        }

        // ── Comissões multi-profissional ao concluir ─────────────────────────────────
        if (data.status === "concluido") {
          try {
            const agendamento = await getAgendamentoById(id);
            if (agendamento) {
              const db = await getDb();
              if (db) {
                const { comissoes: comissoesTable } = await import("../drizzle/schema");
                // Verificar se já existem comissões para este agendamento
                const jaTemComissao = await db.select({ id: comissoesTable.id })
                  .from(comissoesTable)
                  .where(eq(comissoesTable.agendamentoId, id))
                  .limit(1);
                if (jaTemComissao.length === 0) {
                  // Buscar itens do agendamento (multi-serviço)
                  const itens = await getItensByAgendamento(id);
                  const todosServicos = await getServicosByEmpresa(empresa.id);
                  const todosProfissionais = await getProfissionaisByEmpresa(empresa.id);
                  // ── R1+R2: Buscar pagamentos do agendamento para calcular taxa real ──
                  const pagamentos = await getPagamentosByAgendamento(id);
                  const meiosConfig = await getMeiosPagamentoComTaxas(empresa.id);

                  // Determinar taxa de maquininha com base nos pagamentos reais
                  // Só desconta do atendente se o meio de pagamento tem descontarDoAtendente=true
                  const calcularTaxaPagamento = (valorBruto: number): number => {
                    if (pagamentos.length === 0) return 0;
                    let taxaTotal = 0;
                    for (const pag of pagamentos) {
                      const pagValor = parseFloat(String(pag.valor ?? 0));
                      const meioPag = pag.meioPagamento?.toLowerCase() ?? '';
                      // Tentar encontrar meio de pagamento configurado
                      const meioConfig = meiosConfig.find(m =>
                        m.nome.toLowerCase() === meioPag ||
                        m.tipo.toLowerCase() === meioPag
                      );
                      if (meioConfig) {
                        // Só desconta do atendente se a flag estiver ativa
                        if (!meioConfig.descontarDoAtendente) continue;
                        // Usar taxa por parcela se disponível
                        const nParcelas = pag.numeroParcelas ?? 1;
                        const taxaParcela = meioConfig.taxas?.find((t: any) => t.parcela === nParcelas);
                        if (taxaParcela) {
                          taxaTotal += pagValor * (parseFloat(String(taxaParcela.taxa)) / 100);
                        } else {
                          // Fallback: usar taxaFixa do meio
                          taxaTotal += pagValor * (parseFloat(String(meioConfig.taxaFixa)) / 100);
                        }
                      }
                      // Sem meioConfig configurado: não desconta (empresa absorve a taxa)
                    }
                    // Proporcionalizar a taxa ao valor bruto do profissional
                    const totalPagamentos = pagamentos.reduce((s, p) => s + parseFloat(String(p.valor ?? 0)), 0);
                    if (totalPagamentos <= 0) return 0;
                    return taxaTotal * (valorBruto / totalPagamentos);
                  };

                  const percentualDona = parseFloat(String(empresa.percentualDona ?? 0));

                  if (itens.length > 0) {
                    // Calcular fator de desconto proporcional do agendamento
                    const descontoTotal = parseFloat(String(agendamento.desconto ?? 0));
                    const valorBrutoTotal = itens.reduce((s, i) => s + parseFloat(String(i.valorUnitario ?? 0)), 0);
                    const fatorDesconto = valorBrutoTotal > 0 ? Math.max(0, 1 - (descontoTotal / valorBrutoTotal)) : 0;

                    // Agrupar itens por profissional
                    const itensPorProfissional = new Map<number, { valorTotal: number; nomes: string[] }>();
                    for (const item of itens) {
                      const profId = item.profissionalId ?? agendamento.profissionalId ?? 0;
                      const valorBruto = parseFloat(String(item.valorUnitario ?? 0));
                      const valor = valorBruto * fatorDesconto; // aplica desconto proporcional
                      const servNome = todosServicos.find(s => s.id === item.servicoId)?.nome ?? 'Serviço';
                      if (!itensPorProfissional.has(profId)) {
                        itensPorProfissional.set(profId, { valorTotal: 0, nomes: [] });
                      }
                      const entry = itensPorProfissional.get(profId)!;
                      entry.valorTotal += valor;
                      entry.nomes.push(servNome);
                    }
                    // Criar comissão para cada profissional
                    for (const [profId, { valorTotal }] of itensPorProfissional) {
                      // Pular se valor líquido é zero (ex: agendamento com 100% de desconto)
                      if (valorTotal <= 0) {
                        console.log(`[Comissao] Pulando prof ${profId}: valor após desconto = R$ 0,00`);
                        continue;
                      }
                      const prof = todosProfissionais.find(p => p.id === profId);
                      // R3: fallback = 0, não percentualDona
                      const percentual = parseFloat(String(prof?.percentualComissao ?? 0));
                      const taxaMaquininha = calcularTaxaPagamento(valorTotal);
                      const valorLiquido = valorTotal - taxaMaquininha;
                      const valorComissao = valorLiquido * (percentual / 100);
                      const receitaDona = valorLiquido * (percentualDona / 100);
                      // Determinar tipoPagamento predominante
                      const tipoPag = pagamentos.length > 0 ? (pagamentos[0].meioPagamento ?? 'outro') : 'outro';
                      await createComissao({
                        empresaId: empresa.id,
                        profissionalId: profId,
                        agendamentoId: id,
                        valorServico: valorTotal.toFixed(2),
                        percentualComissao: percentual.toFixed(2),
                        tipoPagamento: tipoPag,
                        taxaMaquininha: taxaMaquininha.toFixed(2),
                        custoReposicao: '0.00',
                        valorLiquido: valorLiquido.toFixed(2),
                        valorComissao: valorComissao.toFixed(2),
                        receitaDona: receitaDona.toFixed(2),
                      } as any);
                      console.log(`[Comissao] Criada para prof ${profId}: R$ ${valorComissao.toFixed(2)} (${percentual}% de R$ ${valorLiquido.toFixed(2)} líquido, taxa maq: R$ ${taxaMaquininha.toFixed(2)})`);
                    }
                  } else {
                    // Sem itens: usar profissional principal e serviço principal
                    const prof = todosProfissionais.find(p => p.id === agendamento.profissionalId);
                    // R3: fallback = 0, não percentualDona
                    const percentual = parseFloat(String(prof?.percentualComissao ?? 0));
                    if (percentual > 0) {
                      // Aplicar desconto do agendamento no valor do serviço
                      const valorBruto = parseFloat(String(agendamento.valorTotal ?? 0));
                      const descontoAg = parseFloat(String(agendamento.desconto ?? 0));
                      const valorServico = Math.max(0, valorBruto - descontoAg);
                      // Pular se valor após desconto é zero
                      if (valorServico <= 0) {
                        console.log(`[Comissao] Pulando prof ${agendamento.profissionalId}: valor após desconto = R$ 0,00`);
                      } else {
                        const taxaMaquininha = calcularTaxaPagamento(valorServico);
                        const valorLiquido = valorServico - taxaMaquininha;
                        const valorComissao = valorLiquido * (percentual / 100);
                        const receitaDona = valorLiquido * (percentualDona / 100);
                        const tipoPag = pagamentos.length > 0 ? (pagamentos[0].meioPagamento ?? 'outro') : 'outro';
                        await createComissao({
                          empresaId: empresa.id,
                          profissionalId: agendamento.profissionalId,
                          agendamentoId: id,
                          valorServico: valorServico.toFixed(2),
                          percentualComissao: percentual.toFixed(2),
                          tipoPagamento: tipoPag,
                          taxaMaquininha: taxaMaquininha.toFixed(2),
                          custoReposicao: '0.00',
                          valorLiquido: valorLiquido.toFixed(2),
                          valorComissao: valorComissao.toFixed(2),
                          receitaDona: receitaDona.toFixed(2),
                        } as any);
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("[Comissao] Erro ao criar comissões multi-profissional:", e);
          }
        }

          // ── Enfileirar automação para confirmado, cancelado, concluido ou remarcado ───────────
        if (data.status === 'confirmado' || data.status === 'cancelado' || data.status === 'concluido' || data.status === 'remarcado') {
          try {
            const agendamento = await getAgendamentoById(id);
            if (agendamento) {
              const [cliente, profissional, servico] = await Promise.all([
                getClienteById(agendamento.clienteId),
                agendamento.profissionalId != null ? getProfissionalById(agendamento.profissionalId) : Promise.resolve(null),
                (async () => {
                  const servicos = await getServicosByEmpresa(empresa.id);
                  return servicos.find(s => s.id === agendamento.servicoId);
                })(),
              ]);
              const telefone = cliente?.whatsapp || cliente?.telefone;
              if (telefone && cliente) {
                const dataFormatada = new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
                const percentualReserva2 = parseFloat(String(empresa.reservaPercentual ?? 0)) / 100;
                const valorServico2 = parseFloat(String(agendamento.valorTotal ?? '0'));
                const valorReservaCalc2 = percentualReserva2 > 0 ? `R$ ${(valorServico2 * percentualReserva2).toFixed(2).replace('.', ',')}` : '';
                const _portalOrigin2 = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
                const _linkAgendamento2 = empresa.portalSlug ? `${_portalOrigin2}/agendar/${empresa.portalSlug}` : `${_portalOrigin2}/agendar?e=${empresa.id}`;
                const templateVars2 = {
                  nome_cliente: cliente.nome,
                  primeiro_nome: cliente.nome.split(' ')[0],
                  servico: servico?.nome ?? '',
                  data: dataFormatada,
                  hora: `${String(agendamento.horaInicio ?? '').slice(0, 5)} – ${String(agendamento.horaFim ?? '').slice(0, 5)}`,
                  profissional: profissional?.nome ?? '',
                  empresa: empresa.nome,
                  valor: `R$ ${valorServico2.toFixed(2).replace('.', ',')}`,
                  valor_reserva: valorReservaCalc2,
                  link_agendamento: _linkAgendamento2,
                  link_agenda: gerarLinkAgenda({
                    data: String(agendamento.data),
                    horaInicio: String(agendamento.horaInicio ?? '00:00'),
                    horaFim: String(agendamento.horaFim ?? '01:00'),
                    servico: servico?.nome ?? 'Agendamento',
                    empresa: empresa.nome,
                    profissional: profissional?.nome,
                    observacoes: agendamento.observacoes ?? undefined,
                  }),
                  observacoes: agendamento.observacoes ?? '',
                };

                // Determinar evento e mensagem padrão por status
                const eventoStatus = data.status === 'confirmado' ? 'agendamento_confirmado'
                  : data.status === 'cancelado' ? 'agendamento_cancelado'
                  : data.status === 'remarcado' ? 'agendamento_remarcado'
                  : 'agendamento_concluido';

                // Bug fix 3d: Buscar TODAS as automações ativas para este evento
                const todasAutomacoesStatus = await getAutomacoesByEvento(empresa.id, eventoStatus);

                // Buscar todos os serviços do agendamento (principal + itens compostos)
                const { agendamentoItens: agItensTable, servicos: servicosTable } = await import('../drizzle/schema');
                const { eq: eqDrizzle2 } = await import('drizzle-orm');
                const dbStatus = await (await import('./db')).getDb?.();
                const todosServicosStatus: string[] = [];
                if (servico?.nome) todosServicosStatus.push(servico.nome);
                if (dbStatus) {
                  try {
                    const itensStatus = await dbStatus
                      .select({ servicoNome: servicosTable.nome })
                      .from(agItensTable)
                      .leftJoin(servicosTable, eqDrizzle2(agItensTable.servicoId, servicosTable.id))
                      .where(eqDrizzle2(agItensTable.agendamentoId, id));
                    for (const item of itensStatus) {
                      if (item.servicoNome && !todosServicosStatus.includes(item.servicoNome)) {
                        todosServicosStatus.push(item.servicoNome);
                      }
                    }
                  } catch (e) { console.error('[Fila] Erro ao buscar itens compostos:', e); }
                }

                const nomeEventoLabel = data.status === 'confirmado' ? 'Confirmação de Agendamento'
                  : data.status === 'cancelado' ? 'Cancelamento de Agendamento'
                  : data.status === 'remarcado' ? 'Agendamento Remarcado'
                  : 'Atendimento Concluído';

                // Montar extras para filtros avançados de condição (ponto 2: mudança de status)
                const todasCategoriasStatus: string[] = [];
                if (dbStatus) {
                  try {
                    const itensCateg = await dbStatus
                      .select({ categoria: servicosTable.categoria })
                      .from(agItensTable)
                      .leftJoin(servicosTable, eqDrizzle2(agItensTable.servicoId, servicosTable.id))
                      .where(eqDrizzle2(agItensTable.agendamentoId, id));
                    for (const ic of itensCateg) {
                      if (ic.categoria && !todasCategoriasStatus.includes(ic.categoria)) todasCategoriasStatus.push(ic.categoria);
                    }
                  } catch { /* ignorar */ }
                }
                if (servico?.categoria && !todasCategoriasStatus.includes(servico.categoria)) todasCategoriasStatus.unshift(servico.categoria);
                const extrasCondicao2 = {
                  profissionalNome: profissional?.nome ?? null,
                  categoriaServico: servico?.categoria ?? null,
                  todasCategorias: todasCategoriasStatus,
                  valorAgendamento: parseFloat(String(agendamento.valorTotal ?? '0')),
                  clienteTags: Array.isArray(cliente.tags) ? cliente.tags as string[] : [],
                  totalAgendamentosCliente: (cliente as any).agendamentosCount ?? 0,
                  ultimoAgendamentoData: null as Date | null,
                };

                // Se não há automações configuradas, não enviar nada
                if (todasAutomacoesStatus.length === 0) {
                  console.log(`[Fila] Nenhuma automação ativa para ${nomeEventoLabel} (ag. ${id}) — envio ignorado`);
                } else {
                  // Bug fix 3d: Iterar sobre TODAS as automações ativas para o evento
                  for (const automacaoUsada of todasAutomacoesStatus) {
                    // Verificar condições do flowJson com todos os serviços e extras
                    if (!verificarCondicoesFlowRouter(automacaoUsada.flowJson, servico?.nome, todosServicosStatus, extrasCondicao2)) {
                      console.log(`[Fila] Automação "${automacaoUsada.nome}" ignorada para ag. ${id} (status=${data.status}): filtro de condição não passou`);
                      continue;
                    }

                    const mensagem = automacaoUsada.corpoMensagem
                      ? processarVariaveisTemplate(automacaoUsada.corpoMensagem, templateVars2)
                      : null;
                    if (!mensagem) continue; // sem corpo de mensagem configurado, pular

                    const midiaUrlStatus = extrairMidiaUrl(automacaoUsada.flowJson);
                    await registrarEnvioAutomacao({
                      empresaId: empresa.id,
                      agendamentoId: id,
                      automacaoId: automacaoUsada.id,
                      automacaoNome: automacaoUsada.nome ?? nomeEventoLabel,
                      clienteId: cliente.id,
                      clienteNome: cliente.nome,
                      telefone,
                      canal: 'whatsapp',
                      mensagem,
                      status: 'pendente',
                      enviarEm: new Date(),
                      midiaUrl: midiaUrlStatus ?? undefined,
                      servicoNome: servico?.nome ?? undefined,
                    });
                    console.log(`[Fila] ${nomeEventoLabel} (automação "${automacaoUsada.nome}") enfileirado para ag. ${id} (${telefone})`);
                    try { await (await import('./db-plans')).incrementWhatsappCount(empresa.id); } catch {}
                  }
                }
              }
            }
          } catch (e) {
            console.error('[Fila] Erro ao enfileirar atualização de status:', e);
          }
        }

        // ── Mover cartão no Pipeline automaticamente ao mudar status ─────────────
        if (data.status && ['confirmado', 'cancelado', 'concluido', 'agendado', 'pre_agendado'].includes(data.status)) {
          try {
            const { moverCartaoPorStatusInterno } = await import('./routers/pipeline');
            const agParaPipeline = await getAgendamentoById(id);
            if (agParaPipeline) {
              await moverCartaoPorStatusInterno({
                empresaId: empresa.id,
                agendamentoId: id,
                clienteId: agParaPipeline.clienteId ?? undefined,
                novoStatus: data.status,
              });
            }
          } catch (e) {
            console.error('[Pipeline] Erro ao mover cartão automaticamente:', e);
          }
        }

        return { success: true };
      }),
    confirmarReserva: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // REGRA: ao confirmar a reserva, o pré-agendamento passa para "agendado"
        // e o valor da reserva é registrado como pagamento parcial.
        const agParaConfirmar = await getAgendamentoById(input.id);
        const novoStatus = agParaConfirmar?.status === 'pre_agendado' ? 'agendado' : undefined;
        await updateAgendamento(input.id, {
          reservaPaga: true,
          reservaPagaEm: new Date(),
          ...(novoStatus ? { status: novoStatus } : {}),
        });

        // Registrar o valor da reserva como pagamento parcial do agendamento
        if (agParaConfirmar?.valorReserva && parseFloat(agParaConfirmar.valorReserva) > 0) {
          try {
            const { addPagamentoAgendamento } = await import('./db');
            await addPagamentoAgendamento({
              agendamentoId: input.id,
              valor: agParaConfirmar.valorReserva,
              observacao: 'Reserva recebida',
            });
          } catch (e) {
            console.error('[confirmarReserva] Erro ao registrar pagamento da reserva:', e);
          }
        }

        // Disparar automação de confirmação de reserva paga
        try {
          const ag = await getAgendamentoById(input.id);
          if (ag && ag.clienteId) {
            const db = await (await import('./db')).getDb?.();
            const { clientes: clientesTable } = await import('../drizzle/schema');
            const { eq: eqDrizzle } = await import('drizzle-orm');
            const clienteRows = db ? await db.select().from(clientesTable).where(eqDrizzle(clientesTable.id, ag.clienteId)).limit(1) : [];
            const cliente = clienteRows[0];
            const telefone = (cliente?.whatsapp || cliente?.telefone || '').replace(/\D/g, '');
            if (telefone && cliente) {
              const servico = ag.servicoId ? (await getServicosByEmpresa(empresa.id)).find(s => s.id === ag.servicoId) : null;
              const profissional = ag.profissionalId ? await getProfissionalById(ag.profissionalId) : null;
              const dataFormatada = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
              const valorServico = parseFloat(ag.valorTotal ?? '0');
              const percentualReserva = parseFloat(String(empresa.reservaPercentual ?? 0)) / 100;
              const valorReservaCalc = percentualReserva > 0 ? `R$ ${(valorServico * percentualReserva).toFixed(2).replace('.', ',')}` : '';

              // ── Buscar TODOS os serviços do agendamento (principal + itens compostos) ──
              // (precisa ser feito ANTES da busca de automação para aplicar filtro por serviço)
              const todosServicosReserva: string[] = [];
              if (servico?.nome) todosServicosReserva.push(servico.nome);
              if (db) {
                try {
                  const { agendamentoItens: agItensTable, servicos: servicosTable } = await import('../drizzle/schema');
                  const { eq: eqDrizzle3 } = await import('drizzle-orm');
                  const itensReserva = await db
                    .select({ servicoNome: servicosTable.nome })
                    .from(agItensTable)
                    .leftJoin(servicosTable, eqDrizzle3(agItensTable.servicoId, servicosTable.id))
                    .where(eqDrizzle3(agItensTable.agendamentoId, input.id));
                  for (const item of itensReserva) {
                    if (item.servicoNome && !todosServicosReserva.includes(item.servicoNome)) {
                      todosServicosReserva.push(item.servicoNome);
                    }
                  }
                } catch (e) { console.error('[confirmarReserva] Erro ao buscar itens compostos:', e); }
              }
              const servicoNomeReserva = todosServicosReserva.length > 0 ? todosServicosReserva.join(', ') : (servico?.nome ?? '');

              // ── Buscar automação com filtro por serviço ──────────────────────────────────────
              // Usa getAutomacoesByEvento para suportar múltiplas automações (ex: 3 da Maguie)
              // e aplica o filtro por serviço do flowJson em cada uma
              const extrasCondicaoReserva = {
                profissionalNome: profissional?.nome ?? null,
                categoriaServico: servico?.categoria ?? null,
                todasCategorias: servico?.categoria ? [servico.categoria] : [],
                valorAgendamento: valorServico,
                clienteTags: Array.isArray(cliente.tags) ? cliente.tags as string[] : [],
                totalAgendamentosCliente: 0,
                ultimoAgendamentoData: null as Date | null,
              };
              const automacaoesReservaPaga = await getAutomacoesByEvento(empresa.id, 'reserva_paga');
              const automacaoReservaPaga = automacaoesReservaPaga.find(a =>
                verificarCondicoesFlowRouter(a.flowJson, servicoNomeReserva, todosServicosReserva, extrasCondicaoReserva)
              ) ?? null;
              let automacaoReserva = automacaoReservaPaga;
              let usouFallback = false;
              if (!automacaoReserva) {
                // Fallback: buscar automação de agendamento_criado que passe no filtro de serviço
                const automacaoesAgCriado = await getAutomacoesByEvento(empresa.id, 'agendamento_criado');
                automacaoReserva = automacaoesAgCriado.find(a =>
                  verificarCondicoesFlowRouter(a.flowJson, servicoNomeReserva, todosServicosReserva, extrasCondicaoReserva)
                ) ?? null;
                usouFallback = true;
              }
              // ── GUARDA ANTI-DUPLICIDADE ─────────────────────────────────────────────────
              // Se está usando fallback (agendamento_criado) e já enviou na criação,
              // NÃO envia novamente para evitar duplicidade.
              // Só envia se houver automação específica de reserva_paga (intencional).
              if (usouFallback) {
                const jaEnviou = await jaEnviouNaCriacaoDoAgendamento(empresa.id, input.id);
                if (jaEnviou) {
                  console.log(`[confirmarReserva] Guarda anti-duplicidade: já enviou na criação do ag. ${input.id} — envio de fallback ignorado`);
                  automacaoReserva = null; // anula para não enviar
                }
              }

              const templateVarsReserva = {
                nome_cliente: cliente.nome || 'Cliente',
                primeiro_nome: (cliente.nome || 'Cliente').split(' ')[0],
                servico: servicoNomeReserva,
                data: dataFormatada,
                hora: `${String(ag.horaInicio ?? '').slice(0, 5)} – ${String(ag.horaFim ?? '').slice(0, 5)}`,
                profissional: profissional?.nome ?? '',
                empresa: empresa.nome,
                valor: `R$ ${valorServico.toFixed(2).replace('.', ',')}`,
                valor_reserva: valorReservaCalc,
                link_agenda: gerarLinkAgenda({
                  data: String(ag.data),
                  horaInicio: String(ag.horaInicio ?? '00:00'),
                  horaFim: String(ag.horaFim ?? '01:00'),
                  servico: servicoNomeReserva || 'Agendamento',
                  empresa: empresa.nome,
                  profissional: profissional?.nome,
                }),
              };
              // SEM FALLBACK HARDCODED: se não há automação configurada, não envia nada
              if (!automacaoReserva || !automacaoReserva.corpoMensagem) {
                if (!usouFallback || !automacaoReservaPaga) {
                  // Só loga se não foi a guarda anti-duplicidade que anulou (já logou acima)
                  console.log(`[confirmarReserva] Nenhuma automação ativa para reserva_paga/agendamento_criado — envio ignorado (ag. ${input.id})`);
                }
              } else {
                const mensagemReserva = processarVariaveisTemplate(automacaoReserva.corpoMensagem, templateVarsReserva);
                const midiaUrlReserva = extrairMidiaUrl(automacaoReserva.flowJson);
                await registrarEnvioAutomacao({
                  empresaId: empresa.id,
                  automacaoId: automacaoReserva.id,
                  automacaoNome: automacaoReserva.nome,
                  clienteId: cliente.id,
                  clienteNome: cliente.nome,
                  agendamentoId: input.id,
                  telefone,
                  canal: 'whatsapp',
                  mensagem: mensagemReserva,
                  status: 'pendente',
                  enviarEm: new Date(),
                  servicoNome: servicoNomeReserva || undefined,
                  midiaUrl: midiaUrlReserva ?? undefined,
                });
              }
            }
          }
        } catch (e) {
          console.error('[confirmarReserva] Erro ao enfileirar automação de reserva paga:', e);
        }

        return { success: true };
      }),

    /**
     * Confirma o recebimento do sinal fora do prazo.
     * Reativa o agendamento cancelado por expiração de reserva:
     *   - status: cancelado → agendado
     *   - reservaPaga: true
     *   - lança pagamento parcial no financeiro
     *   - registra observação interna com data/hora e nome do usuário
     */
    confirmarSinalForaDoPrazo: protectedProcedure
      .input(z.object({
        id: z.number(),
        valorSinal: z.string().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error('Empresa não encontrada');
        const ag = await getAgendamentoById(input.id);
        if (!ag) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
        if (ag.status !== 'cancelado') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas agendamentos cancelados podem ser reativados por este fluxo' });
        }
        const valorFinal = input.valorSinal ?? ag.valorReserva ?? '0';
        const agora = new Date();
        const nomeUsuario = ctx.systemUser?.nome ?? ctx.user.name ?? 'usuário';
        const dataHoraStr = agora.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const linhaHistorico = `[${dataHoraStr}] Sinal recebido fora do prazo — confirmado manualmente por ${nomeUsuario}.${
          input.observacao ? ` Obs: ${input.observacao}` : ''
        }`;
        const obsAtual = ag.observacoesInternas ?? '';
        const obsInterna = [obsAtual, linhaHistorico].filter(Boolean).join('\n').trim();
        await updateAgendamento(input.id, {
          status: 'agendado',
          reservaPaga: true,
          reservaPagaEm: agora,
          observacoesInternas: obsInterna,
        });
        if (parseFloat(valorFinal) > 0) {
          try {
            const { addPagamentoAgendamento } = await import('./db');
            await addPagamentoAgendamento({
              agendamentoId: input.id,
              valor: valorFinal,
              observacao: input.observacao
                ? `Sinal fora do prazo — ${input.observacao}`
                : 'Sinal recebido fora do prazo',
            });
          } catch (e) {
            console.error('[confirmarSinalForaDoPrazo] Erro ao registrar pagamento:', e);
          }
        }
        // Mover cartão no Pipeline para "Pré-Agendamento" (agendamento_criado)
        try {
          const { moverCartaoPorStatusInterno } = await import('./routers/pipeline');
          await moverCartaoPorStatusInterno({
            empresaId: empresa.id,
            agendamentoId: input.id,
            clienteId: ag.clienteId ?? undefined,
            novoStatus: 'agendado',
          });
          console.log(`[confirmarSinalForaDoPrazo] Cartão movido para Pré-Agendamento (ag. ${input.id})`);
        } catch (e) {
          console.error('[confirmarSinalForaDoPrazo] Erro ao mover cartão no Pipeline:', e);
        }

        // Disparar automação de agendamento_reativado
        try {
          const agReativado = await getAgendamentoById(input.id);
          if (agReativado && agReativado.clienteId) {
            const db = await (await import('./db')).getDb?.();
            const { clientes: clientesTable } = await import('../drizzle/schema');
            const { eq: eqDrizzle } = await import('drizzle-orm');
            const clienteRows = db ? await db.select().from(clientesTable).where(eqDrizzle(clientesTable.id, agReativado.clienteId)).limit(1) : [];
            const clienteReativado = clienteRows[0];
            const telefoneReativado = (clienteReativado?.whatsapp || clienteReativado?.telefone || '').replace(/\D/g, '');
            if (telefoneReativado && clienteReativado) {
              const servicoReativado = agReativado.servicoId ? (await getServicosByEmpresa(empresa.id)).find(s => s.id === agReativado.servicoId) : null;
              const profissionalReativado = agReativado.profissionalId ? await getProfissionalById(agReativado.profissionalId) : null;
              const dataFormatadaReativado = new Date(agReativado.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
              const automacaoReativado = await getAutomacaoByEvento(empresa.id, 'agendamento_reativado');
              if (automacaoReativado && automacaoReativado.corpoMensagem) {
                const templateVarsReativado = {
                  nome_cliente: clienteReativado.nome || 'Cliente',
                  primeiro_nome: (clienteReativado.nome || 'Cliente').split(' ')[0],
                  servico: servicoReativado?.nome ?? '',
                  data: dataFormatadaReativado,
                  hora: `${String(agReativado.horaInicio ?? '').slice(0, 5)} – ${String(agReativado.horaFim ?? '').slice(0, 5)}`,
                  profissional: profissionalReativado?.nome ?? '',
                  empresa: empresa.nome,
                  valor: `R$ ${parseFloat(agReativado.valorTotal ?? '0').toFixed(2).replace('.', ',')}`,
                };
                const mensagemReativado = processarVariaveisTemplate(automacaoReativado.corpoMensagem, templateVarsReativado);
                await registrarEnvioAutomacao({
                  empresaId: empresa.id,
                  automacaoId: automacaoReativado.id,
                  automacaoNome: automacaoReativado.nome,
                  clienteId: clienteReativado.id,
                  clienteNome: clienteReativado.nome,
                  agendamentoId: input.id,
                  telefone: telefoneReativado,
                  mensagem: mensagemReativado,
                  midiaUrl: extrairMidiaUrl(automacaoReativado.flowJson) ?? undefined,
                  enviarEm: new Date(),
                });
                console.log(`[confirmarSinalForaDoPrazo] Automação agendamento_reativado agendada para ag. ${input.id}`);
              }
            }
          }
        } catch (e) {
          console.error('[confirmarSinalForaDoPrazo] Erro ao disparar automação:', e);
        }

        return { success: true };
      }),

    prorrogarPrazo: protectedProcedure
      .input(z.object({
        id: z.number(),
        novaDataLimite: z.string(), // ISO datetime string
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error('Empresa não encontrada');
        const ag = await getAgendamentoById(input.id);
        if (!ag) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
        if (ag.status !== 'pre_agendado') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas pré-agendamentos podem ter o prazo prorrogado' });
        }
        const novaExpiracao = new Date(input.novaDataLimite);
        if (isNaN(novaExpiracao.getTime()) || novaExpiracao <= new Date()) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A nova data limite deve ser no futuro' });
        }
        await updateAgendamento(input.id, { reservaExpiracaoEm: novaExpiracao, reservaLembreteEnviado: false });
        return { success: true };
      }),

    updateServicos: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        servicoIdPrincipal: z.number(),
        profissionalIdPrincipal: z.number().optional(),
        servicos: z.array(z.object({
          servicoId: z.number(),
          profissionalId: z.number().optional(),
          horaInicio: z.string().optional(),
          horaFim: z.string().optional(),
          valorUnitario: z.string(),
        })),
        valorTotal: z.string(),
        horaFim: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Atualizar o agendamento principal
        const updates: Record<string, any> = {
          servicoId: input.servicoIdPrincipal,
          valorTotal: input.valorTotal,
        };
        if (input.horaFim) updates.horaFim = input.horaFim;
        // Detectar atribuição de profissional: buscar agendamento antes de atualizar
        const agAntes = await getAgendamentoById(input.agendamentoId);
        const eraSemProfissional = agAntes && agAntes.profissionalId == null;
        const novoProfissionalId = input.profissionalIdPrincipal
          ?? input.servicos.find(s => s.profissionalId)?.profissionalId;
        if (input.profissionalIdPrincipal) updates.profissionalId = input.profissionalIdPrincipal;
        await updateAgendamento(input.agendamentoId, updates);
        // Substituir os itens
        await deleteItensByAgendamento(input.agendamentoId);
        // Sanitizar horaInicio/horaFim: garantir formato HH:MM (5 chars) para varchar(5)
        const sanitizarHora = (h: string | undefined | null) => h ? h.slice(0, 5) : null;
        await createAgendamentoItens(input.servicos.map(s => ({
          agendamentoId: input.agendamentoId,
          servicoId: s.servicoId,
          profissionalId: s.profissionalId ?? null,
          horaInicio: sanitizarHora(s.horaInicio),
          horaFim: sanitizarHora(s.horaFim),
          valorUnitario: s.valorUnitario,
        })));

        // ── Notificação WhatsApp: profissional atribuído a agendamento sem profissional ───────────────
        if (eraSemProfissional && novoProfissionalId) {
          try {
            const [agAtualizado, profissional] = await Promise.all([
              getAgendamentoById(input.agendamentoId),
              getProfissionalById(novoProfissionalId),
            ]);
            if (agAtualizado) {
              const cliente = await getClienteById(agAtualizado.clienteId);
              const telefone = cliente?.whatsapp || cliente?.telefone;
              if (telefone && cliente) {
                const todosServicos = await getServicosByEmpresa(empresa.id);
                const servico = todosServicos.find(s => s.id === agAtualizado.servicoId);
                const [ano, mes, dia] = agAtualizado.data.split('-').map(Number);
                const dataFormatada = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long'
                });
                // Verificar se existe automação personalizada para este evento
                const automacaoProfissional = await getAutomacaoByEvento(empresa.id, 'profissional_atribuido');
                const templateVarsProfissional = {
                  nome_cliente: cliente.nome,
                  primeiro_nome: cliente.nome.split(' ')[0],
                  servico: servico?.nome ?? '',
                  data: dataFormatada,
                  hora: `${String(agAtualizado.horaInicio ?? '').slice(0, 5)} – ${String(agAtualizado.horaFim ?? '').slice(0, 5)}`,
                  profissional: profissional?.nome ?? '',
                  empresa: empresa.nome,
                  valor: `R$ ${parseFloat(String(agAtualizado.valorTotal ?? '0')).toFixed(2).replace('.', ',')}`,
                };
                const mensagem = automacaoProfissional?.corpoMensagem
                  ? processarVariaveisTemplate(automacaoProfissional.corpoMensagem, templateVarsProfissional)
                  : [
                      '📋 *Atualização do seu agendamento*',
                      '',
                      `Olá, *${cliente.nome}*! Seu agendamento foi atualizado.`,
                      '',
                      `📅 *Data:* ${dataFormatada}`,
                      `⏰ *Horário:* ${agAtualizado.horaInicio.slice(0, 5)}`,
                      servico ? `✂️ *Serviço:* ${servico.nome}` : null,
                      profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
                      '',
                      `_${empresa.nome}_`,
                    ].filter(Boolean).join('\n');
                await registrarEnvioAutomacao({
                  empresaId: empresa.id,
                  agendamentoId: input.agendamentoId,
                  automacaoId: automacaoProfissional?.id,
                  automacaoNome: automacaoProfissional?.nome ?? 'Profissional Atribuído',
                  clienteId: cliente.id,
                  clienteNome: cliente.nome,
                  telefone,
                  canal: 'whatsapp',
                  mensagem,
                  status: 'pendente',
                  enviarEm: new Date(),
                  servicoNome: servico?.nome ?? undefined,
                });
                console.log(`[Fila] Profissional atribuído enfileirado para ag. ${input.agendamentoId} (${telefone})`);
              }
            }
          } catch (e) {
            console.error('[Fila] Erro ao enfileirar notificação de profissional atribuído:', e);
          }
        }

        return { success: true };
      }),
    updateValores: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        itens: z.array(z.object({
          servicoId: z.number(),
          profissionalId: z.number().optional(),
          valorUnitario: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Recalcular valor total
        const valorTotal = input.itens.reduce((acc, s) => acc + (parseFloat(s.valorUnitario) || 0), 0).toFixed(2);
        // Atualizar valorTotal do agendamento
        await updateAgendamento(input.agendamentoId, { valorTotal });
        // Substituir os itens mantendo os mesmos servicoIds mas com novos valores
        await deleteItensByAgendamento(input.agendamentoId);
        if (input.itens.length > 0) {
          await createAgendamentoItens(input.itens.map(s => ({
            agendamentoId: input.agendamentoId,
            servicoId: s.servicoId,
            profissionalId: s.profissionalId ?? null,
            valorUnitario: s.valorUnitario,
          })));
        }
        return { success: true, valorTotal };
      }),

    // Buscar pagamentos de um agendamento
    getPagamentos: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        return getPagamentosByAgendamento(input.agendamentoId);
      }),

    // Histórico de mensagens enviadas para o agendamento
    getMensagens: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        const db = await getDb();
        if (!db) return [];
        const { historicoEnviosAutomacao: hea } = await import('../drizzle/schema.js');
        const rows = await db
          .select()
          .from(hea)
          .where(and(eq(hea.empresaId, empresa.id), eq(hea.agendamentoId, input.agendamentoId)))
          .orderBy(desc(hea.criadoEm))
          .limit(50);
        return rows;
      }),

    // Preview de reenvio: retorna a mensagem com link de confirmação regenerado se necessário
    previewReenvio: protectedProcedure
      .input(z.object({ envioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        const envio = await getEnvioById(input.envioId, empresa.id);
        if (!envio) throw new TRPCError({ code: "NOT_FOUND", message: "Envio não encontrado" });
        let mensagemFinal = envio.mensagem ?? '';
        let linkRegenerado = false;
        if (envio.agendamentoId && mensagemFinal.includes('confirmar sua presença') && !mensagemFinal.match(/https?:\/\/[^\s]+confirmar/)) {
          try {
            const { gerarTokenConfirmacao } = await import('./confirmacao.js');
            const origin = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
            const token = await gerarTokenConfirmacao(envio.agendamentoId, empresa.id);
            const linkConfirmacao = `${origin}/confirmar/${token}`;
            mensagemFinal = mensagemFinal.replace(
              /(confirmar sua presença[\s\S]*?)(\n\n|\nPara|\n\*Para)/,
              `$1\n${linkConfirmacao}$2`
            );
            linkRegenerado = true;
          } catch (e) {
            console.error('[previewReenvio] Falha ao regenerar link:', e);
          }
        }
        return { mensagem: mensagemFinal, telefone: envio.telefone, automacaoNome: envio.automacaoNome, linkRegenerado };
      }),

    // Adicionar pagamento parcial
    addPagamento: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        valor: z.string(),
        meioPagamento: z.string().optional(),
        numeroParcelas: z.number().min(1).max(24).optional(), // apenas registro informativo
        observacao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await addPagamentoAgendamento(input);
        return { success: true };
      }),

    // Remover pagamento parcial
    removePagamento: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await removePagamentoAgendamento(input.id);
        return { success: true };
      }),

    // Atualizar desconto do agendamento
    updateDesconto: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        desconto: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateDescontoAgendamento(input.agendamentoId, input.desconto);
        return { success: true };
      }),

    updateTaxaAdicional: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        taxaAdicional: z.string(),
        nomeTaxaAdicional: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateTaxaAdicionalAgendamento(input.agendamentoId, input.taxaAdicional, input.nomeTaxaAdicional);
        return { success: true };
      }),

    // Atualização em lote de status de agendamentos
    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(100),
        status: z.enum(["agendado", "confirmado", "em_andamento", "concluido", "cancelado", "faltou", "remarcado"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });

        const { agendamentos: agendamentosTable } = await import('../drizzle/schema.js');
        const updates: Record<string, any> = { status: input.status };
        if (input.status === 'confirmado') updates.confirmadoEm = new Date();
        if (input.status === 'concluido') updates.concluidoEm = new Date();

        let sucesso = 0;
        let falhas = 0;
        for (const id of input.ids) {
          try {
            const ag = await getAgendamentoById(id);
            if (ag && ag.empresaId === empresa.id) {
              await db.update(agendamentosTable).set(updates).where(eq(agendamentosTable.id, id));
              sucesso++;
              
              // Enviar notificações quando agendamento é confirmado
              if (input.status === 'confirmado') {
                const { notifyOwner } = await import('./_core/notification.js');
                const horaFormatada = new Date(ag.horaInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const dataFormatada = new Date(ag.horaInicio).toLocaleDateString('pt-BR');
                
                // Notificar dono
                try {
                  await notifyOwner({
                    title: 'Agendamento Confirmado',
                    content: `Agendamento confirmado para ${dataFormatada} às ${horaFormatada}`
                  });
                } catch (e) {
                  console.error('[Notificação] Erro ao notificar dono:', e);
                }
                
                // Notificar profissional via push notification
                if (ag.profissionalId) {
                  try {
                    const { clientes: clientesTable, profissionais: profissionaisTable } = await import('../drizzle/schema.js');
                    const [prof] = await db.select().from(profissionaisTable).where(eq(profissionaisTable.id, ag.profissionalId)).limit(1);
                    const [cliente] = ag.clienteId ? await db.select().from(clientesTable).where(eq(clientesTable.id, ag.clienteId)).limit(1) : [null];
                    
                    if (prof && cliente) {
                      // Aqui integraria com sistema de push notifications do profissional
                      console.log(`[Notificação] Profissional ${prof.nome} notificado sobre agendamento de ${cliente.nome}`);
                    }
                  } catch (e) {
                    console.error('[Notificação] Erro ao notificar profissional:', e);
                  }
                }
              }
            } else {
              falhas++;
            }
          } catch {
            falhas++;
          }
        }

        return { sucesso, falhas, total: input.ids.length };
      }),

    // Exclusão em lote de agendamentos
    bulkDelete: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        let sucesso = 0;
        let falhas = 0;
        for (const id of input.ids) {
          try {
            const ag = await getAgendamentoById(id);
            if (ag && ag.empresaId === empresa.id) {
              await deleteAgendamentoCompleto(id);
              try { await decrementAgendamentosCount(empresa.id); } catch {}
              sucesso++;
            } else {
              falhas++;
            }
          } catch {
            falhas++;
          }
        }
        return { sucesso, falhas, total: input.ids.length };
      }),

    // Métricas de conversão de pré-agendamentos
    metricasPreAgendamento: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return { total: 0, convertidos: 0, cancelados: 0, pendentes: 0, taxaConversao: 0 };

      const db = await getDb();
      if (!db) return { total: 0, convertidos: 0, cancelados: 0, pendentes: 0, taxaConversao: 0 };

      const { agendamentos: agTable } = await import('../drizzle/schema.js');

      // Buscar pré-agendamentos do mês atual
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().slice(0, 10);

      // Total criados como pre_agendado no mês (incluindo os que já foram convertidos)
      // Usamos o histórico de envios para identificar os que tiveram evento agendamento_pre_agendado
      // Mas mais simples: buscar todos os agendamentos do mês que têm valorReserva > 0
      const todos = await db
        .select({ id: agTable.id, status: agTable.status, reservaPaga: agTable.reservaPaga })
        .from(agTable)
        .where(and(
          eq(agTable.empresaId, empresa.id),
          drizzleSql`${agTable.data} >= ${inicioMes}`,
          drizzleSql`${agTable.data} <= ${fimMes}`,
          drizzleSql`${agTable.valorReserva} IS NOT NULL AND ${agTable.valorReserva} > 0`,
        ));

      const total = todos.length;
      const convertidos = todos.filter(a => ['agendado', 'confirmado', 'em_andamento', 'concluido'].includes(a.status) && a.reservaPaga).length;
      const cancelados = todos.filter(a => a.status === 'cancelado').length;
      const pendentes = todos.filter(a => a.status === 'pre_agendado').length;
      const taxaConversao = total > 0 ? Math.round((convertidos / total) * 100) : 0;

      return { total, convertidos, cancelados, pendentes, taxaConversao };
    }),
    // Listar pré-agendamentos pendentes com dados enriquecidos (cliente, profissional, serviço)
    listPreAgendamentosPendentes: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      const db = await getDb();
      if (!db) return [];
      const { agendamentos: agTable, clientes: clTable, profissionais: profTable, servicos: svcTable } = await import('../drizzle/schema.js');
      const hoje = new Date().toISOString().slice(0, 10);
      const rows = await db
        .select({
          id: agTable.id,
          data: agTable.data,
          horaInicio: agTable.horaInicio,
          horaFim: agTable.horaFim,
          status: agTable.status,
          valorTotal: agTable.valorTotal,
          observacoes: agTable.observacoes,
          clienteId: agTable.clienteId,
          clienteNome: clTable.nome,
          clienteTelefone: clTable.telefone,
          profissionalId: agTable.profissionalId,
          profissionalNome: profTable.nome,
          servicoId: agTable.servicoId,
          servicoNome: svcTable.nome,
          createdAt: agTable.createdAt,
        })
        .from(agTable)
        .leftJoin(clTable, eq(clTable.id, agTable.clienteId))
        .leftJoin(profTable, eq(profTable.id, agTable.profissionalId))
        .leftJoin(svcTable, eq(svcTable.id, agTable.servicoId))
        .where(and(
          eq(agTable.empresaId, empresa.id),
          eq(agTable.status, 'pre_agendado'),
          drizzleSql`${agTable.data} >= ${hoje}`,
        ))
        .orderBy(agTable.data, agTable.horaInicio);
      return rows;
    }),
    // Contar pré-agendamentos pendentes (status pre_agendado, data >= hoje) — badge bottom nav
    contarPreAgendamentosPendentes: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return { total: 0 };
      const db = await getDb();
      if (!db) return { total: 0 };
      const { agendamentos: agTable } = await import('../drizzle/schema.js');
      const hoje = new Date().toISOString().slice(0, 10);
      const rows = await db
        .select({ id: agTable.id })
        .from(agTable)
        .where(and(
          eq(agTable.empresaId, empresa.id),
          eq(agTable.status, 'pre_agendado'),
          drizzleSql`${agTable.data} >= ${hoje}`,
        ));
      return { total: rows.length };
    }),
    // Excluir agendamento completamente (cascade: itens, pagamentos, comissões, prontuários, tokens)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        // Verificar se o agendamento pertence à empresa
        const ag = await getAgendamentoById(input.id);
        if (!ag || ag.empresaId !== empresa.id) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
        await deleteAgendamentoCompleto(input.id);
        // Decrementar contador de uso do plano
        try { await decrementAgendamentosCount(empresa.id); } catch {}
        return { success: true };
      }),

    // Verifica conflito de horário para um profissional
    verificarConflito: protectedProcedure
      .input(z.object({
        profissionalId: z.number(),
        data: z.string(),         // "YYYY-MM-DD"
        horaInicio: z.string(),   // "HH:MM"
        horaFim: z.string(),      // "HH:MM"
        excluirAgendamentoId: z.number().optional(), // ao editar, excluir o próprio agendamento da verificação
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { conflito: false, agendamentos: [] };

        const db = await getDb();
        if (!db) return { conflito: false, agendamentos: [] };

        const { agendamentos: agTable, clientes: clTable, profissionais: profTable } = await import('../drizzle/schema.js');
        const { and, eq, ne, sql, lt, gt } = await import('drizzle-orm');

        // Normaliza para "HH:MM:SS" para comparar com campo TIME do banco
        const inicio = input.horaInicio.length === 5 ? input.horaInicio + ':00' : input.horaInicio;
        const fim = input.horaFim.length === 5 ? input.horaFim + ':00' : input.horaFim;

        // Busca agendamentos do mesmo profissional, na mesma data, com status ativo
        // Conflito: (inicio_existente < fim_novo) AND (fim_existente > inicio_novo)
        const conditions = [
          eq(agTable.empresaId, empresa.id),
          eq(agTable.profissionalId, input.profissionalId),
          eq(agTable.data, input.data),
          sql`${agTable.status} NOT IN ('cancelado', 'cancelado_pelo_cliente')`,
          lt(agTable.horaInicio, fim),
          gt(agTable.horaFim, inicio),
        ];

        if (input.excluirAgendamentoId) {
          conditions.push(ne(agTable.id, input.excluirAgendamentoId));
        }

        const conflitantes = await db
          .select({
            id: agTable.id,
            horaInicio: agTable.horaInicio,
            horaFim: agTable.horaFim,
            clienteNome: clTable.nome,
          })
          .from(agTable)
          .leftJoin(clTable, eq(agTable.clienteId, clTable.id))
          .where(and(...conditions));

        return {
          conflito: conflitantes.length > 0,
          agendamentos: conflitantes.map(a => ({
            id: a.id,
            horaInicio: String(a.horaInicio).slice(0, 5),
            horaFim: String(a.horaFim).slice(0, 5),
            clienteNome: a.clienteNome ?? 'Cliente',
          })),
        };
      }),
  }),
  // ─── BLOQUEIOS ─────────────────────────────────────────────────────────────
  bloqueios: router({
    list: protectedProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        profissionalId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        // Verificar permissão: apenas quem pode ver agendamentos acessa bloqueios
        await requirePermissao(ctx, empresa, 'agendamentosVer');
        const bloqueios = await getBloqueiosByEmpresa(empresa.id);
        // Filtrar por data e profissional se fornecidos
        return bloqueios.filter(b => {
          if (input.dataInicio && b.dataInicio < input.dataInicio) return false;
          if (input.dataFim && b.dataInicio > input.dataFim) return false;
          if (input.profissionalId && b.profissionalId !== input.profissionalId) return false;
          return true;
        });
      }),
    create: protectedProcedure
      .input(z.object({
        profissionalId: z.number().optional(), // opcional: usa o profissional logado como fallback
        dataInicio: z.string(),
        horaInicio: z.string(),
        dataFim: z.string(),
        horaFim: z.string(),
        motivo: z.string().optional(),
        recorrencia: z.enum(["nenhuma", "semanal", "mensal"]).default("nenhuma"),
        dataFimRecorrencia: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Resolver profissionalId: usa o enviado ou o do profissional logado
        const profissionalId = input.profissionalId ?? ctx.systemUser?.profissionalId ?? ctx.systemUser?.id;
        if (!profissionalId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Profissional não identificado. Faça login como profissional.' });

        // Determinar se é owner (owner sempre aprova automaticamente)
        // Para OAuth users: comparar ctx.user.id com empresa.ownerId
        // Para SystemUsers: nunca são owners (ctx.user.id é negativo)
        const isOwner = !ctx.systemUser && empresa.ownerId === ctx.user?.id;

        // Owner: força status "aprovado". Qualquer outro (admin ou não): "pendente"
        const status = isOwner ? "aprovado" : "pendente";

        const id = await createBloqueioRecorrente({ ...input, profissionalId, empresaId: empresa.id, status });

        // Se não for owner, criar notificação para admins (destinatarioId = null = visível para todos admins)
        if (!isOwner) {
          const prof = await getProfissionalById(profissionalId);
          await createNotificacao({
            empresaId: empresa.id,
            destinatarioId: null as any,
            tipo: "bloqueio_solicitado",
            titulo: "Nova solicitação de bloqueio",
            mensagem: `${prof?.nome ?? 'Profissional'} solicitou bloqueio de agenda para ${input.dataInicio}`,
            dadosContexto: { bloqueioId: id, profissionalId, ...input },
          });
        }

        return { id, success: true };
      }),
    aprovar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Verificar permissão admin
        await requirePermissao(ctx, empresa, 'agendaAprovarBloqueio');
        await updateBloqueio(input.id, { status: "aprovado", aprovadoPorId: ctx.user.id });

        // Buscar bloqueio para obter profissionalId do solicitante
        const db = await getDb();
        if (db) {
          const { bloqueiosAgenda } = await import("../drizzle/schema");
          const [bloqueio] = await db.select({ profissionalId: bloqueiosAgenda.profissionalId, dataInicio: bloqueiosAgenda.dataInicio })
            .from(bloqueiosAgenda).where(eq(bloqueiosAgenda.id, input.id)).limit(1);
          if (bloqueio) {
            await createNotificacao({
              empresaId: empresa.id,
              destinatarioId: bloqueio.profissionalId,
              tipo: "bloqueio_aprovado",
              titulo: "Bloqueio aprovado",
              mensagem: `Seu bloqueio de agenda para ${bloqueio.dataInicio} foi aprovado.`,
              dadosContexto: { bloqueioId: input.id },
            });
          }
        }

        return { success: true };
      }),
    recusar: protectedProcedure
      .input(z.object({ id: z.number(), motivoRecusa: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Verificar permissão admin
        await requirePermissao(ctx, empresa, 'agendaAprovarBloqueio');
        await updateBloqueio(input.id, { status: "recusado", motivoRecusa: input.motivoRecusa, aprovadoPorId: ctx.user.id });

        // Buscar bloqueio para obter profissionalId do solicitante
        const db = await getDb();
        if (db) {
          const { bloqueiosAgenda } = await import("../drizzle/schema");
          const [bloqueio] = await db.select({ profissionalId: bloqueiosAgenda.profissionalId, dataInicio: bloqueiosAgenda.dataInicio })
            .from(bloqueiosAgenda).where(eq(bloqueiosAgenda.id, input.id)).limit(1);
          if (bloqueio) {
            await createNotificacao({
              empresaId: empresa.id,
              destinatarioId: bloqueio.profissionalId,
              tipo: "bloqueio_recusado",
              titulo: "Bloqueio recusado",
              mensagem: `Seu bloqueio de agenda para ${bloqueio.dataInicio} foi recusado.${input.motivoRecusa ? ` Motivo: ${input.motivoRecusa}` : ''}`,
              dadosContexto: { bloqueioId: input.id, motivoRecusa: input.motivoRecusa },
            });
          }
        }

        return { success: true };
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        
        // Buscar bloqueio antes de excluir
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");
        
        const { bloqueiosAgenda } = await import("../drizzle/schema");
        const [bloqueio] = await db.select()
          .from(bloqueiosAgenda)
          .where(eq(bloqueiosAgenda.id, input.id))
          .limit(1);
        
        if (!bloqueio) throw new Error("Bloqueio não encontrado");
        
        // Excluir bloqueio
        await db.delete(bloqueiosAgenda).where(eq(bloqueiosAgenda.id, input.id));
        
        // Notificar admins que o bloqueio foi cancelado
        await createNotificacao({
          empresaId: empresa.id,
          destinatarioId: null as any, // null = visível para todos os admins
          tipo: "bloqueio_cancelado",
          titulo: "Bloqueio cancelado",
          mensagem: `Bloqueio de agenda cancelado. Profissional: ${bloqueio.profissionalId}, Período: ${bloqueio.dataInicio} a ${bloqueio.dataFim}`,
          dadosContexto: { bloqueioId: input.id, profissionalId: bloqueio.profissionalId },
        });
        
        return { success: true };
      }),
  }),

  // ─── FINANCEIRO / COMISSÕES ───────────────────────────────────────────────
  financeiro: router({
    comissoes: protectedProcedure
      .input(z.object({
        profissionalId: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        // Admin vê todos; profissional vê apenas as suas próprias comissões
        const { isAdmin, profId: myProfId } = await resolveAdminContext(ctx, empresa, "financeiroVerComissoes");
        let profId: number | undefined;
        if (input?.profissionalId !== undefined) {
          // Profissional não pode ver comissões de outro profissional
          if (!isAdmin && myProfId !== null && input.profissionalId !== myProfId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para ver comissões de outro profissional.' });
          }
          profId = input.profissionalId;
        } else {
          profId = myProfId ?? undefined;
        }
        const dataInicio = input?.dataInicio ? new Date(input.dataInicio) : undefined;
        const dataFim = input?.dataFim ? new Date(input.dataFim + "T23:59:59") : undefined;
        return getComissoesByEmpresa(empresa.id, profId, dataInicio, dataFim);
      }),
    criarComissao: protectedProcedure
      .input(z.object({
        profissionalId: z.number(),
        agendamentoId: z.number(),
        valorServico: z.string(),
        percentualComissao: z.string(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
        custoReposicao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const valorServico = parseFloat(input.valorServico);
        const percentualComissao = parseFloat(input.percentualComissao);
        const custoReposicao = parseFloat(input.custoReposicao ?? "0");
        // Verificar se o meio de pagamento tem descontarDoAtendente=true
        let taxaMaquininha = 0;
        if (input.tipoPagamento && input.tipoPagamento !== "dinheiro" && input.tipoPagamento !== "pix" && input.tipoPagamento !== "outro") {
          const meiosConfig = await getMeiosPagamentoComTaxas(empresa.id);
          const meioConfig = meiosConfig.find(m =>
            m.tipo.toLowerCase() === input.tipoPagamento ||
            m.nome.toLowerCase() === input.tipoPagamento
          );
          if (meioConfig && meioConfig.descontarDoAtendente) {
            taxaMaquininha = valorServico * (parseFloat(String(meioConfig.taxaFixa ?? empresa.taxaMaquininha ?? 0)) / 100);
          }
          // Se não encontrou meio configurado, não desconta (empresa absorve)
        }
        const valorLiquido = valorServico - taxaMaquininha - custoReposicao;
        const valorComissao = valorLiquido * (percentualComissao / 100);
        const receitaDona = valorLiquido * (parseFloat(String(empresa.percentualDona)) / 100);
        const id = await createComissao({
          empresaId: empresa.id,
          profissionalId: input.profissionalId,
          agendamentoId: input.agendamentoId,
          valorServico: input.valorServico,
          percentualComissao: input.percentualComissao,
          tipoPagamento: input.tipoPagamento,
          taxaMaquininha: taxaMaquininha.toFixed(2),
          custoReposicao: custoReposicao.toFixed(2),
          valorLiquido: valorLiquido.toFixed(2),
          valorComissao: valorComissao.toFixed(2),
          receitaDona: receitaDona.toFixed(2),
        } as any);
        return { id, success: true };
      }),
    getComissaoByAgendamento: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return null;
        const db = await getDb();
        if (!db) return null;
        const { comissoes: comissoesTable } = await import('../drizzle/schema');
        const rows = await db.select().from(comissoesTable)
          .where(and(eq(comissoesTable.agendamentoId, input.agendamentoId), eq(comissoesTable.empresaId, empresa.id)))
          .limit(1);
        return rows[0] ?? null;
      }),
    marcarPaga: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateComissao(input.id, { paga: true, pagaEm: new Date() });
        return { success: true };
      }),
    editarComissao: protectedProcedure
      .input(z.object({
        id: z.number(),
        percentualComissao: z.string(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
        custoReposicao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Verificar que a comissão pertence à empresa
        const db = await getDb();
        if (!db) throw new Error("DB não disponível");
        const { comissoes: comissoesTable } = await import('../drizzle/schema');
        const rows = await db.select().from(comissoesTable)
          .where(and(eq(comissoesTable.id, input.id), eq(comissoesTable.empresaId, empresa.id)))
          .limit(1);
        if (rows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Comissão não encontrada' });
        const comissao = rows[0];
        const valorServico = parseFloat(String(comissao.valorServico ?? 0));
        const percentualComissao = parseFloat(input.percentualComissao);
        const custoReposicao = parseFloat(input.custoReposicao ?? "0");
        // Recalcular taxa de maquininha respeitando descontarDoAtendente
        let taxaMaquininha = 0;
        const tipoPag = input.tipoPagamento ?? comissao.tipoPagamento ?? 'outro';
        if (tipoPag !== "dinheiro" && tipoPag !== "pix" && tipoPag !== "outro") {
          const meiosConfig = await getMeiosPagamentoComTaxas(empresa.id);
          const meioConfig = meiosConfig.find(m =>
            m.tipo.toLowerCase() === tipoPag ||
            m.nome.toLowerCase() === tipoPag
          );
          if (meioConfig && meioConfig.descontarDoAtendente) {
            taxaMaquininha = valorServico * (parseFloat(String(meioConfig.taxaFixa ?? 0)) / 100);
          }
        }
        const valorLiquido = valorServico - taxaMaquininha - custoReposicao;
        const valorComissao = valorLiquido * (percentualComissao / 100);
        const receitaDona = valorLiquido * (parseFloat(String(empresa.percentualDona ?? 0)) / 100);
        await updateComissao(input.id, {
          percentualComissao: input.percentualComissao,
          tipoPagamento: tipoPag as any,
          custoReposicao: custoReposicao.toFixed(2),
          taxaMaquininha: taxaMaquininha.toFixed(2),
          valorLiquido: valorLiquido.toFixed(2),
          valorComissao: valorComissao.toFixed(2),
          receitaDona: receitaDona.toFixed(2),
        });
        return { success: true };
      }),
    dashboard: protectedProcedure
      .input(z.object({ profissionalId: z.number().nullable().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return null;
        // Admin vê métricas consolidadas; profissional respeita financeiroEscopo do grupo
        let profId: number | null;
        if (input?.profissionalId !== undefined) {
          profId = input.profissionalId;
        } else {
          const { isAdmin, profId: resolved } = await resolveAdminContext(ctx, empresa, "financeiroVer");
          if (isAdmin) {
            profId = null; // owner/admin: vê todos
          } else if (resolved !== null) {
            const perms = await getPermissoesGrupoByProfissional(resolved);
            const escopo = (perms as any)?.financeiroEscopo ?? 'proprio';
            profId = escopo === 'todos' ? null : resolved;
          } else {
            profId = null;
          }
        }
        return getDashboardMetrics(empresa.id, profId);
      }),
  }),

  // ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────
  notificacoes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      const { isAdmin, profId } = await resolveAdminContext(ctx, empresa, "agendamentosVerTodos");
      const { getNotificacoesByEmpresa, getPermissoesGrupoByProfissional } = await import("./db");
      // Verificar escopo de notificações do grupo
      let verTodas = isAdmin;
      if (!isAdmin && profId) {
        const perms = await getPermissoesGrupoByProfissional(profId);
        if ((perms as any)?.notificacoesEscopo === 'todos') verTodas = true;
      }
      return getNotificacoesByEmpresa(empresa.id, verTodas ? null : profId);
    }),
    marcarLida: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await marcarNotificacaoLida(input.id);
        return { success: true };
      }),
    marcarTodasLidas: protectedProcedure.mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      // Admin: mark all unread notifications for the company
      // Non-admin: mark only their own notifications
      const { isAdmin, profId } = await resolveAdminContext(ctx, empresa, "agendamentosVerTodos");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const { notificacoes: notifTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, or: orOp, isNull: isNullOp } = await import("drizzle-orm");
      if (isAdmin) {
        await db.update(notifTable).set({ lida: true, lidaEm: new Date() })
          .where(andOp(eqOp(notifTable.empresaId, empresa.id), eqOp(notifTable.lida, false)));
      } else if (profId) {
        await db.update(notifTable).set({ lida: true, lidaEm: new Date() })
          .where(andOp(
            eqOp(notifTable.empresaId, empresa.id),
            eqOp(notifTable.lida, false),
            orOp(eqOp(notifTable.destinatarioId, profId), isNullOp(notifTable.destinatarioId))
          ));
      }
      return { success: true };
    }),
    ocultar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { ocultarNotificacao } = await import("./db");
        await ocultarNotificacao(input.id);
        return { success: true };
      }),
    ocultarTodas: protectedProcedure.mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      const { isAdmin, profId } = await resolveAdminContext(ctx, empresa, "agendamentosVerTodos");
      const { ocultarTodasNotificacoes } = await import("./db");
      await ocultarTodasNotificacoes(empresa.id, isAdmin ? null : profId);
      return { success: true };
    }),
  }),

  // ─── AUTOMAÇÕES ───────────────────────────────────────────────────────────
  automacoes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getAutomacoesByEmpresa(empresa.id);
    }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        descricao: z.string().optional(),
        tipoGatilho: z.enum(["evento", "data_fixa", "aniversario_mes", "dias_antes_agendamento", "horas_antes_agendamento", "horas_apos_agendamento", "dias_depois_agendamento", "manual"]),
        evento: z.string().optional(),
        eventosAdicionais: z.string().nullable().optional(), // JSON array de eventos adicionais (multi-trigger)
        delayMinutos: z.number().optional(),
        dataFixaDia: z.number().optional(),
        dataFixaMes: z.number().optional(),
        dataFixaHora: z.string().optional(),
        diasAntesDepois: z.number().optional(),
        horaDisparo: z.string().optional(),
        canalEnvio: z.enum(["whatsapp", "email", "sms"]).default("whatsapp"),
        tituloMensagem: z.string().optional(),
        corpoMensagem: z.string().min(1),
        segmentacaoTipo: z.enum(["todas", "por_profissional", "por_tag"]).default("todas"),
        segmentacaoValor: z.string().optional(),
        flowJson: z.string().optional(),
        confirmacaoAutoAtivo: z.boolean().optional(),
        confirmacaoAutoHorasAntes: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");

        // Verificar duplicidade: mesmos tipoGatilho + evento + canal + timing
        const automacoes = await getAutomacoesByEmpresa(empresa.id);
        const duplicada = automacoes.find((a) => {
          if (a.tipoGatilho !== input.tipoGatilho) return false;
          if (a.canalEnvio !== input.canalEnvio) return false;
          // Para gatilhos de evento, comparar o evento
          if (input.tipoGatilho === "evento" && a.evento !== input.evento) return false;
          // Para gatilhos temporais, comparar o timing
          if (input.tipoGatilho === "dias_antes_agendamento" || input.tipoGatilho === "dias_depois_agendamento") {
            if (a.diasAntesDepois !== input.diasAntesDepois) return false;
            if (a.horaDisparo !== (input.horaDisparo ?? null)) return false;
          }
          if (input.tipoGatilho === "horas_antes_agendamento" || input.tipoGatilho === "horas_apos_agendamento") {
            if (a.delayMinutos !== input.delayMinutos) return false;
          }
          if (input.tipoGatilho === "data_fixa") {
            if (a.dataFixaDia !== input.dataFixaDia) return false;
            if (a.dataFixaMes !== input.dataFixaMes) return false;
            if (a.dataFixaHora !== (input.dataFixaHora ?? null)) return false;
          }
          return true;
        });

        if (duplicada) {
          throw new Error(`Já existe uma automação com o mesmo gatilho e canal: "${duplicada.nome}". Edite a automação existente ou escolha configurações diferentes.`);
        }

        const id = await createAutomacao({ ...input, empresaId: empresa.id });
        return { id, success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        corpoMensagem: z.string().optional(),
        ativo: z.boolean().optional(),
        flowJson: z.string().optional(),
        // Campos de agendamento temporal (necessários para dias_antes_agendamento funcionar após edição)
        tipoGatilho: z.enum(["evento", "data_fixa", "aniversario_mes", "dias_antes_agendamento", "horas_antes_agendamento", "horas_apos_agendamento", "dias_depois_agendamento", "manual"]).optional(),
        evento: z.string().nullable().optional(),
        eventosAdicionais: z.string().nullable().optional(), // JSON array de eventos adicionais (multi-trigger)
        diasAntesDepois: z.number().nullable().optional(),
        horaDisparo: z.string().nullable().optional(),
        delayMinutos: z.number().nullable().optional(),
        dataFixaDia: z.number().nullable().optional(),
        dataFixaMes: z.number().nullable().optional(),
        dataFixaHora: z.string().nullable().optional(),
        tituloMensagem: z.string().nullable().optional(),
        canalEnvio: z.enum(["whatsapp", "email", "sms"]).optional(),
        confirmacaoAutoAtivo: z.boolean().optional(),
        confirmacaoAutoHorasAntes: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        // Quando o usuário edita manualmente, o template deixa de ser usado
        await updateAutomacao(id, { ...data, isTemplate: false });
        return { success: true };
      }),
    savePositions: protectedProcedure
      .input(z.object({ id: z.number(), flowJson: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Auto-save leve: persiste apenas as posições dos nós sem validar duplicidade
        await updateAutomacao(input.id, { flowJson: input.flowJson });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await deleteAutomacao(input.id);
        return { success: true };
      }),
    deleteMany: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await Promise.all(input.ids.map(id => deleteAutomacao(id)));
        return { success: true, deletedCount: input.ids.length };
      }),
    uploadMidia: protectedProcedure
      .input(z.object({
        arquivoBase64: z.string(),
        arquivoNome: z.string(),
        arquivoTipo: z.string(), // "image/jpeg", "image/png", "application/pdf"
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const buffer = Buffer.from(input.arquivoBase64, "base64");
        if (buffer.length > 16 * 1024 * 1024) throw new Error("Arquivo muito grande. Máximo 16MB.");
        const ext = input.arquivoNome.split(".").pop() || "bin";
        const key = `empresa-${empresa.id}/automacoes/${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.arquivoTipo);
        return { url, key, success: true };
      }),
    getHistorico: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        canal: z.string().optional(),
        status: z.string().optional(),
        apenasTestes: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { rows: [], total: 0 };
        return getHistoricoEnvios(empresa.id, {
          limit: input.limit,
          offset: input.offset,
          canal: input.canal,
          status: input.status,
          apenasTestes: input.apenasTestes,
        });
      }),

    getMetricasJornada: protectedProcedure
      .input(z.object({
        periodo: z.enum(["24h", "7d", "30d"]).default("7d"),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { metricas: [], feed: [], totalFalhas: 0 };

        const horasPorPeriodo: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };
        const horas = horasPorPeriodo[input.periodo] ?? 168;
        const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

        const historico = await getHistoricoEnvios(empresa.id, { limit: 500, desde });
        const rows = historico.rows;

        // Métricas agregadas por status
        const contadores: Record<string, number> = {};
        for (const row of rows) {
          const key = row.status ?? "desconhecido";
          contadores[key] = (contadores[key] ?? 0) + 1;
        }

        const LABELS: Record<string, { label: string; cor: string; emoji: string }> = {
          enviado:    { label: "Enviados",    cor: "#22c55e", emoji: "✅" },
          pendente:   { label: "Pendentes",   cor: "#f59e0b", emoji: "⏳" },
          falhou:     { label: "Com falha",   cor: "#ef4444", emoji: "❌" },
          desconhecido: { label: "Outros",   cor: "#a78bfa", emoji: "❓" },
        };

        const metricas = Object.entries(contadores).map(([status, total]) => ({
          status,
          total,
          label: LABELS[status]?.label ?? status,
          cor: LABELS[status]?.cor ?? "#6b7280",
          emoji: LABELS[status]?.emoji ?? "•",
        }));

        // Feed dos 30 eventos mais recentes
        const feed = rows.slice(0, 30).map((row) => ({
          id: row.id,
          clienteNome: row.clienteNome ?? "Cliente",
          automacaoNome: row.automacaoNome ?? "Automação",
          canal: row.canal ?? "whatsapp",
          status: row.status ?? "desconhecido",
          criadoEm: row.criadoEm,
          emoji: LABELS[row.status ?? "desconhecido"]?.emoji ?? "•",
        }));

        const totalFalhas = rows.filter(r => r.status === "falhou").length;

        return { metricas, feed, totalFalhas };
      }),

    getFilaEnvios: protectedProcedure
      .input(z.object({
        status: z.enum(["pendente", "enviado", "falhou", "agendado", "todos"]).default("todos"),
        periodo: z.enum(["hoje", "semana", "mes", "todos"]).default("todos"),
        tipoAutomacao: z.string().optional(),
        automacaoNome: z.string().optional(),
        ordenacao: z.enum(["proximos", "recentes"]).default("proximos"),
        limit: z.number().min(1).max(200).default(100),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { rows: [], total: 0 };

        const db = await getDb();
        if (!db) return { rows: [], total: 0 };

        const conditions: any[] = [eq(historicoEnviosAutomacao.empresaId, empresa.id)];

        if (input.status !== "todos") {
          conditions.push(eq(historicoEnviosAutomacao.status, input.status));
        }

        // Filtro por automação específica
        if (input.automacaoNome && input.automacaoNome !== "__todos__") {
          conditions.push(eq(historicoEnviosAutomacao.automacaoNome, input.automacaoNome));
        }

        // Filtro de período
        if (input.periodo !== "todos") {
          const agora = new Date();
          let desde: Date;
          if (input.periodo === "hoje") desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
          else if (input.periodo === "semana") desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
          else desde = new Date(agora.getFullYear(), agora.getMonth(), 1);
          conditions.push(gte(historicoEnviosAutomacao.criadoEm, desde));
        }

        const where = conditions.length > 1 ? and(...conditions) : conditions[0];

        const rows = await db.select().from(historicoEnviosAutomacao)
          .where(where)
          .orderBy(
            input.ordenacao === "proximos"
              ? desc(historicoEnviosAutomacao.enviarEm)
              : desc(historicoEnviosAutomacao.criadoEm)
          )
          .limit(input.limit);

        const agora = new Date();
        const result = rows.map(r => {
          let tempoRestante: string | null = null;
          if ((r.status === 'pendente' || r.status === 'agendado') && r.enviarEm) {
            const diff = r.enviarEm.getTime() - agora.getTime();
            if (diff > 0) {
              const horas = Math.floor(diff / (1000 * 60 * 60));
              const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              if (horas > 0) tempoRestante = `Envia em ${horas}h ${minutos}min`;
              else tempoRestante = `Envia em ${minutos}min`;
            } else {
              tempoRestante = 'Processando...';
            }
          }
          return { ...r, tempoRestante };
        });

        return { rows: result, total: result.length };
      }),

    // Lista de nomes de automações distintos para o seletor de filtro
    getAutomacoesNomes: protectedProcedure
      .query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { nomes: [] };
        const db = await getDb();
        if (!db) return { nomes: [] };
        const rows = await db
          .selectDistinct({ automacaoNome: historicoEnviosAutomacao.automacaoNome })
          .from(historicoEnviosAutomacao)
          .where(eq(historicoEnviosAutomacao.empresaId, empresa.id));
        const nomes = rows
          .map(r => r.automacaoNome)
          .filter((n): n is string => !!n)
          .sort((a, b) => a.localeCompare(b));
        return { nomes };
      }),

    // Contadores de status (sem filtro de status) para os cards da fila
    getFilaTotais: protectedProcedure
      .input(z.object({
        periodo: z.enum(["hoje", "semana", "mes", "todos"]).default("todos"),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { pendentes: 0, enviados: 0, falhas: 0, agendados: 0 };

        const db = await getDb();
        if (!db) return { pendentes: 0, enviados: 0, falhas: 0, agendados: 0 };

        const conditions: any[] = [eq(historicoEnviosAutomacao.empresaId, empresa.id)];
        if (input.periodo !== "todos") {
          const agora = new Date();
          let desde: Date;
          if (input.periodo === "hoje") desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
          else if (input.periodo === "semana") desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
          else desde = new Date(agora.getFullYear(), agora.getMonth(), 1);
          conditions.push(gte(historicoEnviosAutomacao.criadoEm, desde));
        }
        const where = conditions.length > 1 ? and(...conditions) : conditions[0];

        const rows = await db.select({ status: historicoEnviosAutomacao.status }).from(historicoEnviosAutomacao).where(where);
        return {
          agendados: rows.filter(r => r.status === "agendado").length,
          pendentes: rows.filter(r => r.status === "pendente").length,
          enviados: rows.filter(r => r.status === "enviado").length,
          falhas: rows.filter(r => r.status === "falhou").length,
        };
      }),

    getFalhasRecentes: protectedProcedure
      .query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { total: 0 };
        const total = await contarFalhasRecentes(empresa.id, 24);
        return { total };
      }),

    // Contar mensagens agendadas para hoje (status 'agendado' com enviarEm no dia atual)
    getAgendadosHoje: protectedProcedure
      .query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { total: 0 };
        const db = await getDb();
        if (!db) return { total: 0 };
        const agora = new Date();
        const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
        const rows = await db.select({ id: historicoEnviosAutomacao.id })
          .from(historicoEnviosAutomacao)
          .where(and(
            eq(historicoEnviosAutomacao.empresaId, empresa.id),
            eq(historicoEnviosAutomacao.status, 'agendado'),
            gte(historicoEnviosAutomacao.enviarEm, inicioDia),
            lt(historicoEnviosAutomacao.enviarEm, fimDia),
          ));
        return { total: rows.length };
      }),

    // Reagendar item com falha para amanhã no mesmo horário
    reagendarItem: protectedProcedure
      .input(z.object({ id: z.number(), horasDelay: z.number().min(1).max(72).default(24) }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const rows = await db.select().from(historicoEnviosAutomacao)
          .where(and(eq(historicoEnviosAutomacao.id, input.id), eq(historicoEnviosAutomacao.empresaId, empresa.id)))
          .limit(1);
        if (!rows[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item não encontrado' });
        if (rows[0].status !== 'falhou') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas itens com falha podem ser reagendados' });
        const novoEnviarEm = new Date(Date.now() + input.horasDelay * 60 * 60 * 1000);
        await db.update(historicoEnviosAutomacao)
          .set({ status: 'agendado', enviarEm: novoEnviarEm, erroDetalhe: null })
          .where(eq(historicoEnviosAutomacao.id, input.id));
        return { success: true, enviarEm: novoEnviarEm };
      }),

    reenviarItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

        const { historicoEnviosAutomacao: tbl } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');

        // Verificar que o item pertence à empresa
        const rows = await db.select().from(tbl)
          .where(and(eq(tbl.id, input.id), eq(tbl.empresaId, empresa.id)))
          .limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });

        // Colocar de volta na fila como pendente com enviarEm = agora
        await db.update(tbl)
          .set({ status: 'pendente', enviarEm: new Date(), erroDetalhe: null })
          .where(eq(tbl.id, input.id));

        return { success: true };
      }),

    cancelarItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
        const { historicoEnviosAutomacao: tbl } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const rows = await db.select().from(tbl)
          .where(and(eq(tbl.id, input.id), eq(tbl.empresaId, empresa.id)))
          .limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
        if (rows[0].status !== 'pendente' && rows[0].status !== 'agendado' && rows[0].status !== 'falhou') throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas envios pendentes, agendados ou com falha podem ser removidos" });
        // Deletar o registro do banco
        await db.delete(tbl).where(and(eq(tbl.id, input.id), eq(tbl.empresaId, empresa.id)));
        return { success: true };
      }),

    cancelarItens: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
        const { historicoEnviosAutomacao: tbl } = await import('../drizzle/schema');
        const { eq, and, inArray } = await import('drizzle-orm');
        // Deleta apenas os itens pendentes ou falhados que pertencem à empresa
        const { or } = await import('drizzle-orm');
        await db.delete(tbl)
          .where(and(
            inArray(tbl.id, input.ids),
            eq(tbl.empresaId, empresa.id),
            or(eq(tbl.status, 'pendente'), eq(tbl.status, 'agendado'), eq(tbl.status, 'falhou'))
          ));
        return { success: true };
      }),

    // Limpar enviados com filtro (status=enviado, período, automação)
    limparEnviados: protectedProcedure
      .input(z.object({
        periodo: z.enum(["hoje", "semana", "mes", "todos"]).default("todos"),
        automacaoNome: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
        const { historicoEnviosAutomacao: tbl } = await import('../drizzle/schema');
        const { eq, and, gte } = await import('drizzle-orm');

        const conditions: any[] = [
          eq(tbl.empresaId, empresa.id),
          eq(tbl.status, 'enviado'),
        ];

        // Filtro por período
        if (input.periodo !== "todos") {
          const agora = new Date();
          let desde: Date;
          if (input.periodo === "hoje") desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
          else if (input.periodo === "semana") desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
          else desde = new Date(agora.getFullYear(), agora.getMonth(), 1);
          conditions.push(gte(tbl.criadoEm, desde));
        }

        // Filtro por automação específica
        if (input.automacaoNome && input.automacaoNome !== "__todos__") {
          conditions.push(eq(tbl.automacaoNome, input.automacaoNome));
        }

        const where = conditions.length > 1 ? and(...conditions) : conditions[0];
        // Contar quantos registros serao deletados antes de deletar
        const rowsToDelete = await db.select({ id: tbl.id }).from(tbl).where(where);
        const deletedCount = rowsToDelete.length;
        // Deletar os registros
        await db.delete(tbl).where(where);
        return { success: true, deletedCount };
      }),

    limparItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
        const { historicoEnviosAutomacao: tbl } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const rows = await db.select().from(tbl)
          .where(and(eq(tbl.id, input.id), eq(tbl.empresaId, empresa.id)))
          .limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
        if (rows[0].status !== 'enviado') throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas envios já enviados podem ser limpos" });
        await db.delete(tbl).where(and(eq(tbl.id, input.id), eq(tbl.empresaId, empresa.id)));
        return { success: true };
      }),

    // Jornada ao Vivo: clientes agrupados por status dentro de uma automação
    getJornadaAoVivo: protectedProcedure
      .input(z.object({ automacaoId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { grupos: [], automacaoNome: null };
        const db = await getDb();
        if (!db) return { grupos: [], automacaoNome: null };

        // Buscar nome da automação
        const autoRows = await db.select({ nome: automacoes.nome })
          .from(automacoes)
          .where(and(eq(automacoes.id, input.automacaoId), eq(automacoes.empresaId, empresa.id)))
          .limit(1);
        const automacaoNome = autoRows[0]?.nome ?? null;

        // Buscar todos os envios desta automação (últimos 90 dias)
        const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const rows = await db.select()
          .from(historicoEnviosAutomacao)
          .where(and(
            eq(historicoEnviosAutomacao.empresaId, empresa.id),
            eq(historicoEnviosAutomacao.automacaoId, input.automacaoId),
            gte(historicoEnviosAutomacao.criadoEm, desde),
          ))
          .orderBy(desc(historicoEnviosAutomacao.criadoEm))
          .limit(500);

        const agora = new Date();

        // Agrupar por status
        const grupos: Record<string, typeof rows> = {
          agendado: [],
          pendente: [],
          enviado: [],
          falhou: [],
        };

        for (const r of rows) {
          const g = grupos[r.status];
          if (g) g.push(r);
        }

        const statusConfig = [
          { key: 'agendado', label: 'Aguardando', cor: 'blue' },
          { key: 'pendente', label: 'Em andamento', cor: 'yellow' },
          { key: 'enviado', label: 'Enviado', cor: 'green' },
          { key: 'falhou', label: 'Falhou', cor: 'red' },
        ];

        const resultado = statusConfig.map(({ key, label, cor }) => {
          const itens = grupos[key] ?? [];
          return {
            status: key,
            label,
            cor,
            total: itens.length,
            itens: itens.slice(0, 50).map(r => {
              let tempoRestante: string | null = null;
              if ((r.status === 'pendente' || r.status === 'agendado') && r.enviarEm) {
                const diff = r.enviarEm.getTime() - agora.getTime();
                if (diff > 0) {
                  const horas = Math.floor(diff / (1000 * 60 * 60));
                  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  if (horas > 0) tempoRestante = `Envia em ${horas}h ${minutos}min`;
                  else tempoRestante = `Envia em ${minutos}min`;
                } else {
                  tempoRestante = 'Processando...';
                }
              }
              return {
                id: r.id,
                clienteNome: r.clienteNome,
                telefone: r.telefone,
                canal: r.canal,
                mensagem: r.mensagem,
                status: r.status,
                erroDetalhe: r.erroDetalhe,
                enviarEm: r.enviarEm,
                criadoEm: r.criadoEm,
                servicoNome: r.servicoNome,
                messageStatus: r.messageStatus,
                tempoRestante,
              };
            }),
          };
        });

        return { grupos: resultado, automacaoNome };
      }),

    reenviarMensagem: protectedProcedure
      .input(z.object({ envioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

        const envio = await getEnvioById(input.envioId, empresa.id);
        if (!envio) throw new TRPCError({ code: "NOT_FOUND", message: "Envio não encontrado" });

        // Tentar reenviar via WhatsApp (roteamento inteligente: Pro=Z-API, demais=Baileys)
        if (!envio.telefone || !envio.mensagem) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dados insuficientes para reenvio" });
        }

        // Regenerar link de confirmação se a mensagem contiver o placeholder vazio ou link ausente
        let mensagemFinal = envio.mensagem;
        if (envio.agendamentoId && mensagemFinal.includes('confirmar sua presença') && !mensagemFinal.match(/https?:\/\/[^\s]+confirmar/)) {
          try {
            const { gerarTokenConfirmacao } = await import('./confirmacao.js');
            const origin = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
            const token = await gerarTokenConfirmacao(envio.agendamentoId, empresa.id);
            const linkConfirmacao = `${origin}/confirmar/${token}`;
            // Inserir o link logo após a linha que pede confirmação
            mensagemFinal = mensagemFinal.replace(
              /(confirmar sua presença[\s\S]*?)(\n\n|\nPara|\n\*Para)/,
              `$1\n${linkConfirmacao}$2`
            );
            console.log(`[Reenvio] Link de confirmação regenerado para agendamento ${envio.agendamentoId}: ${linkConfirmacao}`);
          } catch (e) {
            console.error('[Reenvio] Falha ao regenerar link de confirmação:', e);
          }
        }

        try {
          const { routedSendMessage } = await import("./whatsapp-router");
          await routedSendMessage(empresa.id, envio.telefone, mensagemFinal);

          // Registrar novo envio bem-sucedido
          await registrarEnvioAutomacao({
            empresaId: empresa.id,
            automacaoId: envio.automacaoId ?? undefined,
            automacaoNome: envio.automacaoNome ? `${envio.automacaoNome} (reenvio)` : "Reenvio manual",
            clienteId: envio.clienteId ?? undefined,
            clienteNome: envio.clienteNome ?? undefined,
            telefone: envio.telefone,
            canal: envio.canal,
            mensagem: mensagemFinal,
            status: "enviado",
            agendamentoId: envio.agendamentoId ?? undefined,
          });

          return { success: true, mensagem: mensagemFinal };
        } catch (err: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Falha no reenvio: ${err?.message ?? "erro desconhecido"}` });
        }
      }),

    enviarManual: protectedProcedure
      .input(z.object({
        automacaoId: z.number(),
        clienteId: z.number(),
        pacoteClienteId: z.number().optional(),
        notificacaoPacoteId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

        // Buscar automação
        const [automacao] = await db.select().from(automacoes).where(and(eq(automacoes.id, input.automacaoId), eq(automacoes.empresaId, empresa.id))).limit(1);
        if (!automacao) throw new TRPCError({ code: "NOT_FOUND", message: "Automação não encontrada" });

        // Buscar cliente
        const [cliente] = await db.select().from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.empresaId, empresa.id))).limit(1);
        if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });

        const telefone = cliente.telefone || cliente.whatsapp;
        if (!telefone) throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente não possui telefone cadastrado" });

        // Buscar dados do pacote se fornecido
        let pacoteNome = "";
        let sessoesRestantes = 0;
        let sessoesTotal = 0;
        let dataVencimento = "";
        if (input.pacoteClienteId) {
          const [pacote] = await db.select().from(pacotesClientes).where(eq(pacotesClientes.id, input.pacoteClienteId)).limit(1);
          if (pacote) {
            pacoteNome = pacote.nome ?? "";
            dataVencimento = pacote.dataVencimento ? new Date(pacote.dataVencimento).toLocaleDateString("pt-BR") : "";
            // Buscar itens do pacote para calcular sessões
            const itens = await db.select().from(pacotesClientesItens).where(eq(pacotesClientesItens.pacoteClienteId, pacote.id));
            sessoesTotal = itens.reduce((acc, i) => acc + (i.quantidadeTotal ?? 0), 0);
            const usadas = itens.reduce((acc, i) => acc + (i.quantidadeUsada ?? 0), 0);
            sessoesRestantes = sessoesTotal - usadas;
          }
        }

        // Substituir variáveis no template
        let mensagem = automacao.corpoMensagem;
        const primeiroNome = (cliente.nome ?? "").split(" ")[0];
        mensagem = mensagem
          .replace(/\{\{nome_cliente\}\}/g, cliente.nome ?? "")
          .replace(/\{\{primeiro_nome\}\}/g, primeiroNome)
          .replace(/\{\{empresa\}\}/g, empresa.nome)
          .replace(/\{\{pacote\}\}/g, pacoteNome)
          .replace(/\{\{sessoes_restantes\}\}/g, String(sessoesRestantes))
          .replace(/\{\{sessoes_total\}\}/g, String(sessoesTotal))
          .replace(/\{\{data_vencimento\}\}/g, dataVencimento);

        // Enviar via roteamento inteligente (Pro=Z-API, demais=Baileys)
        try {
          const { routedSendMessage } = await import("./whatsapp-router");
          const ok = await routedSendMessage(empresa.id, telefone, mensagem);
          const status = ok ? "enviado" : "falhou";

          // Registrar no histórico
          await registrarEnvioAutomacao({
            empresaId: empresa.id,
            automacaoId: automacao.id,
            automacaoNome: automacao.nome,
            clienteId: cliente.id,
            clienteNome: cliente.nome,
            telefone,
            canal: "whatsapp",
            mensagem,
            status,
            erroDetalhe: ok ? undefined : "Falha no envio via WhatsApp",
          });

          if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar mensagem via WhatsApp" });

          // Marcar notificação de pacote como lida se fornecida
          if (input.notificacaoPacoteId) {
            try {
              const { notificacoesPacotes } = await import("../drizzle/schema");
              await db.update(notificacoesPacotes).set({ lida: true }).where(eq(notificacoesPacotes.id, input.notificacaoPacoteId));
            } catch { /* silencioso */ }
          }

          return { success: true, mensagem };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao enviar: ${err?.message ?? "desconhecido"}` });
        }
      }),

    getAutomacoesManual: protectedProcedure
      .input(z.object({ evento: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        const db = await getDb();
        if (!db) return [];
        const conditions = [eq(automacoes.empresaId, empresa.id), eq(automacoes.ativo, true), drizzleSql`${automacoes.tipoGatilho} = 'manual'`];
        if (input.evento) conditions.push(eq(automacoes.evento, input.evento));
        return db.select({ id: automacoes.id, nome: automacoes.nome, corpoMensagem: automacoes.corpoMensagem, evento: automacoes.evento }).from(automacoes).where(and(...conditions));
      }),

    debugList: protectedProcedure
      .input(z.object({
        automacaoId: z.number().optional(),
        status: z.enum(["pendente", "enviado", "falhou"]).optional(),
        periodo: z.enum(["1h", "24h", "7d"]).optional(),
        limite: z.number().default(100),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];

        const db = await getDb();
        if (!db) return [];

        const conditions: any[] = [eq(historicoEnviosAutomacao.empresaId, empresa.id)];

        if (input.automacaoId) {
          conditions.push(eq(historicoEnviosAutomacao.automacaoId, input.automacaoId));
        }
        if (input.status) {
          conditions.push(eq(historicoEnviosAutomacao.status, input.status));
        }
        if (input.periodo) {
          const agora = new Date();
          const horasMap: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168 };
          const horas = horasMap[input.periodo] ?? 24;
          const desde = new Date(agora.getTime() - horas * 60 * 60 * 1000);
          conditions.push(gte(historicoEnviosAutomacao.criadoEm, desde));
        }

        const where = conditions.length > 1 ? and(...conditions) : conditions[0];

        // Join with automacoes to get tipoGatilho
        const rows = await db.select({
          id: historicoEnviosAutomacao.id,
          criadoEm: historicoEnviosAutomacao.criadoEm,
          automacaoNome: historicoEnviosAutomacao.automacaoNome,
          automacaoId: historicoEnviosAutomacao.automacaoId,
          status: historicoEnviosAutomacao.status,
          clienteNome: historicoEnviosAutomacao.clienteNome,
          telefone: historicoEnviosAutomacao.telefone,
          erroDetalhe: historicoEnviosAutomacao.erroDetalhe,
          mensagem: historicoEnviosAutomacao.mensagem,
          isTeste: historicoEnviosAutomacao.isTeste,
          midiaUrl: historicoEnviosAutomacao.midiaUrl,
          tipoGatilho: automacoes.tipoGatilho,
        })
          .from(historicoEnviosAutomacao)
          .leftJoin(automacoes, eq(historicoEnviosAutomacao.automacaoId, automacoes.id))
          .where(where)
          .orderBy(desc(historicoEnviosAutomacao.criadoEm))
          .limit(input.limite);

        return rows;
      }),

    testarEnvio: protectedProcedure
      .input(z.object({
        automacaoId: z.number(),
        telefone: z.string().min(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

        // Verificar permissão admin
        await requirePermissao(ctx, empresa, 'automacoesEditar');

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

        // Buscar automação
        const [automacao] = await db.select().from(automacoes)
          .where(and(eq(automacoes.id, input.automacaoId), eq(automacoes.empresaId, empresa.id)))
          .limit(1);
        if (!automacao) throw new TRPCError({ code: "NOT_FOUND", message: "Automação não encontrada" });

        // Substituir variáveis por dados de teste
        const dadosTeste: Record<string, string> = {
          nome_cliente: "Cliente Teste",
          primeiro_nome: "Cliente",
          servico: "Serviço Exemplo",
          profissional: "Profissional Teste",
          data: "segunda-feira, 01 de janeiro",
          hora: "10:00 – 11:00",
          valor: "R$ 100,00",
          empresa: empresa.nome,
          valor_reserva: "R$ 30,00",
          link_confirmacao: `${process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br'}/confirmar/TESTE`,
          pacote: "Pacote Exemplo",
          sessoes_restantes: "3",
          sessoes_total: "10",
          data_vencimento: "01/02/2025",
          dias_antes: "1",
          horas_antes: "2",
        };

        let mensagem = automacao.corpoMensagem;
        mensagem = mensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => dadosTeste[key] ?? '');

        // Buscar midiaUrl do flowJson se existir
        let midiaUrl: string | null = null;
        if (automacao.flowJson) {
          try {
            const flow = JSON.parse(automacao.flowJson);
            // Procurar midiaUrl nos nós do flow
            if (Array.isArray(flow)) {
              for (const node of flow) {
                if (node?.data?.midiaUrl) {
                  midiaUrl = node.data.midiaUrl;
                  break;
                }
              }
            } else if (flow?.midiaUrl) {
              midiaUrl = flow.midiaUrl;
            }
          } catch { /* ignorar erro de parse */ }
        }

        // Enfileirar na fila com status pendente, isTeste=true
        await registrarEnvioAutomacao({
          empresaId: empresa.id,
          automacaoId: automacao.id,
          automacaoNome: `[TESTE] ${automacao.nome}`,
          telefone: input.telefone,
          mensagem,
          status: 'pendente',
          isTeste: true,
          midiaUrl: midiaUrl ?? undefined,
          enviarEm: new Date(),
        });

         return { success: true, message: "Teste enfileirado com sucesso" };
      }),
    enviarTesteComCliente: protectedProcedure
      .input(z.object({
        automacaoId: z.number(),
        clienteId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

        // Verificar permissão admin
        await requirePermissao(ctx, empresa, 'automacoesEditar');

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

        // Buscar automação
        const [automacao] = await db.select().from(automacoes)
          .where(and(eq(automacoes.id, input.automacaoId), eq(automacoes.empresaId, empresa.id)))
          .limit(1);
        if (!automacao) throw new TRPCError({ code: "NOT_FOUND", message: "Automação não encontrada" });

        // Buscar cliente
        const [cliente] = await db.select().from(clientes)
          .where(and(eq(clientes.id, input.clienteId), eq(clientes.empresaId, empresa.id)))
          .limit(1);
        if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });

        // Substituir variáveis com dados do cliente
        const dadosTeste: Record<string, string> = {
          nome_cliente: cliente.nome || "Cliente",
          primeiro_nome: (cliente.nome || "Cliente").split(' ')[0],
          servico: "Serviço Exemplo",
          profissional: "Profissional Teste",
          data: "segunda-feira, 01 de janeiro",
          hora: "10:00 – 11:00",
          valor: "R$ 100,00",
          empresa: empresa.nome,
          valor_reserva: "R$ 30,00",
          link_confirmacao: `${process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br'}/confirmar/TESTE`,
          pacote: "Pacote Exemplo",
          sessoes_restantes: "3",
          sessoes_total: "10",
          data_vencimento: "01/02/2025",
          dias_antes: "1",
          horas_antes: "2",
        };

        let mensagem = automacao.corpoMensagem;
        mensagem = mensagem.replace(/\{\{(\w+)\}\}/g, (_, key) => dadosTeste[key] ?? '');

        // Buscar midiaUrl do flowJson se existir
        let midiaUrl: string | null = null;
        if (automacao.flowJson) {
          try {
            const flow = JSON.parse(automacao.flowJson);
            if (Array.isArray(flow)) {
              for (const node of flow) {
                if (node?.data?.midiaUrl) {
                  midiaUrl = node.data.midiaUrl;
                  break;
                }
              }
            } else if (flow?.midiaUrl) {
              midiaUrl = flow.midiaUrl;
            }
          } catch { /* ignorar erro de parse */ }
        }

        // Enfileirar na fila com status pendente, isTeste=true
        await registrarEnvioAutomacao({
          empresaId: empresa.id,
          automacaoId: automacao.id,
          automacaoNome: `[TESTE] ${automacao.nome}`,
          telefone: cliente.telefone || cliente.whatsapp || "",
          clienteId: cliente.id,
          mensagem,
          status: 'pendente',
          isTeste: true,
          midiaUrl: midiaUrl ?? undefined,
          enviarEm: new Date(),
        });

        return { success: true, message: `Teste enfileirado para ${cliente.nome}` };
      }),
  }),
  // ─── CORES / CONFIGURAÇÕES ────────────────────────────────────────────────
  configuracoes: router({
    getCores: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return null;
      return getCoresStatus(empresa.id);
    }),
    updateCores: protectedProcedure
      .input(z.object({
        corAgendado: z.string().optional(),
        corConfirmado: z.string().optional(),
        corConcluido: z.string().optional(),
        corCancelado: z.string().optional(),
        corFaltou: z.string().optional(),
        corPreAgendado: z.string().optional(),
        corAguardandoReserva: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await upsertCoresStatus(empresa.id, input);
        return { success: true };
      }),

    // Pausa geral de automações: bloqueia todos os envios enquanto ativo
    getAutomacoesPausadas: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return false;
      return empresa.automacoesPausadas ?? false;
    }),

    toggleAutomacoesPausadas: protectedProcedure
      .input(z.object({ pausar: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateEmpresa(empresa.id, { automacoesPausadas: input.pausar } as any);
        return { success: true, pausado: input.pausar };
      }),
    updateRateLimit: protectedProcedure
      .input(z.object({
        envioDelaySegundos: z.number().min(5).max(300),
        envioPorCiclo: z.number().min(1).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateEmpresa(empresa.id, {
          envioDelaySegundos: input.envioDelaySegundos,
          envioPorCiclo: input.envioPorCiclo,
        } as any);
        return { success: true };
      }),
    getRateLimit: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return { envioDelaySegundos: 30, envioPorCiclo: 10 };
      const db = await getDb();
      if (!db) return { envioDelaySegundos: 30, envioPorCiclo: 10 };
      const { empresas: empresasTable } = await import('../drizzle/schema.js');
      const [row] = await db.select({
        envioDelaySegundos: empresasTable.envioDelaySegundos,
        envioPorCiclo: empresasTable.envioPorCiclo,
      }).from(empresasTable).where(eq(empresasTable.id, empresa.id)).limit(1);
      return { envioDelaySegundos: row?.envioDelaySegundos ?? 30, envioPorCiclo: row?.envioPorCiclo ?? 10 };
    }),
  }),

  // ─── GRUPOS DE PERMISSÕES ──────────────────────────────────────────────────
  grupos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      const grupos = await getGruposByEmpresa(empresa.id);
      // Para cada grupo, buscar contagem de membros e permissões
      const result = await Promise.all(grupos.map(async (g) => {
        const membros = await getMembrosGrupo(g.id);
        const perms = await getPermissoesGrupo(g.id);
        return { ...g, totalMembros: membros.length, permissoes: perms };
      }));
      return result;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const grupo = await getGrupoById(input.id);
        if (!grupo) return null;
        const membros = await getMembrosGrupo(input.id);
        const perms = await getPermissoesGrupo(input.id);
        return { ...grupo, membros, permissoes: perms };
      }),

    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        descricao: z.string().optional(),
        cor: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'gruposCriar');
        const id = await createGrupo({ ...input, empresaId: empresa.id });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        cor: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'gruposEditar');
        // Proteger grupo isAdmin contra renomeação
        const grupoAtual = await getGrupoById(input.id);
        if (grupoAtual?.isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'O grupo Administradores é protegido e não pode ser editado.' });
        }
        const { id, ...data } = input;
        await updateGrupo(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'gruposExcluir');
        // Proteger grupo isAdmin contra exclusão
        const grupoAtual = await getGrupoById(input.id);
        if (grupoAtual?.isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'O grupo Administradores é protegido e não pode ser excluído.' });
        }
        await deleteGrupo(input.id);
        return { success: true };
      }),

    updatePermissoes: protectedProcedure
      .input(z.object({
        grupoId: z.number(),
        // Aceita qualquer valor e filtra no servidor para garantir robustez
        permissoes: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'gruposEditar');
        // Proteger grupo isAdmin contra alteração de permissões
        const grupoAtual = await getGrupoById(input.grupoId);
        if (grupoAtual?.isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'O grupo Administradores é protegido e suas permissões não podem ser alteradas.' });
        }
        // Filtrar campos booleanos e campos de escopo (enum strings)
        const escopoFields = ['notificacoesEscopo', 'agendaEscopo', 'calendarioEscopo', 'financeiroEscopo'];
        const permissoesBooleanas = Object.fromEntries(
          Object.entries(input.permissoes).filter(([k, v]) => typeof v === 'boolean' || escopoFields.includes(k))
        ) as Record<string, boolean | string>;
        await updatePermissoesGrupo(input.grupoId, permissoesBooleanas as any);
        return { success: true };
      }),

    addMembro: protectedProcedure
      .input(z.object({ grupoId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'gruposEditar');
        const id = await addMembroGrupo(input.grupoId, input.userId, empresa.id, ctx.user.id);
        return { id };
      }),

    removeMembro: protectedProcedure
      .input(z.object({ membroId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'gruposEditar');
        await removeMembroGrupo(input.membroId);
        return { success: true };
      }),
  }),

  // ─── USUÁRIOS DA EMPRESA ───────────────────────────────────────────────────
  usuarios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getUsersByEmpresa(empresa.id);
    }),

    minhasPermissoes: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return null;
      // Owner tem todas as permissões
      if (empresa.ownerId === ctx.user.id) return { isOwner: true };
      return getPermissoesUsuario(ctx.user.id, empresa.id);
    }),

    convites: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        return getConvitesByEmpresa(empresa.id);
      }),

      criar: protectedProcedure
        .input(z.object({
          email: z.string().email(),
          grupoId: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new Error("Empresa não encontrada");
          const token = nanoid(32);
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
          const id = await createConvite({
            empresaId: empresa.id,
            email: input.email,
            grupoId: input.grupoId,
            token,
            expiresAt,
            convidadoPorId: ctx.user.id,
          });
          return { id, token, link: `/convite/${token}` };
        }),

      cancelar: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await updateConvite(input.id, { status: "expirado" });
          return { success: true };
        }),
    }),
    // ─── Usuários do Sistema (cadastro por admin com senha) ───
    systemUsers: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        return getSystemUsersByEmpresa(empresa.id);
      }),
      criar: protectedProcedure
        .input(z.object({
          nome: z.string().min(2),
          email: z.string().email(),
          senha: z.string().min(6),
          grupoId: z.number().optional(),
          isProfissional: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new Error("Empresa não encontrada");
          await requirePermissao(ctx, empresa, 'usuariosEditar');
          return createSystemUser({
            empresaId: empresa.id,
            nome: input.nome,
            email: input.email,
            senha: input.senha,
            grupoId: input.grupoId,
            isProfissional: input.isProfissional,
            criadoPorId: ctx.user.id,
          });
        }),
      atualizar: protectedProcedure
        .input(z.object({
          id: z.number(),
          nome: z.string().min(2).optional(),
          email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
          senha: z.string().min(6).optional(),
          grupoId: z.number().nullable().optional(),
          isProfissional: z.boolean().optional(),
          ativo: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new Error("Empresa não encontrada");
          await requirePermissao(ctx, empresa, 'usuariosEditar');
          const { id, ...data } = input;
          await updateSystemUser(id, data);
          return { success: true };
        }),
      excluir: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new Error("Empresa não encontrada");
          await requirePermissao(ctx, empresa, 'usuariosEditar');
          await deleteSystemUser(input.id);
          return { success: true };
        }),
      resetarSenha: protectedProcedure
        .input(z.object({ id: z.number(), novaSenha: z.string().min(6) }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new Error("Empresa não encontrada");
          await requirePermissao(ctx, empresa, 'usuariosEditar');
          await resetSystemUserPassword(input.id, input.novaSenha);
          return { success: true };
        }),
    }),
  }),

  // ─── PERFIL DO USUÁRIO ──────────────────────────────────────────────────────────────────────────────────────
  perfil: router({
    // No modelo unificado, o systemUser é um registro da tabela profissionais
    getMe: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.systemUser) {
        const db = await getDb();
        if (!db) return null;
        const { profissionais: profTable } = await import('../drizzle/schema');
        const [su] = await db.select().from(profTable).where(eq(profTable.id, ctx.systemUser.id)).limit(1);
        return su ? { id: su.id, nome: su.nome, email: su.email ?? '', avatarUrl: su.avatarUrl ?? null, isSystemUser: true, isProfissional: su.isProfissional ?? false } : null;
      }
      return { id: ctx.user.id, nome: ctx.user.name ?? '', email: ctx.user.email ?? '', avatarUrl: null, isSystemUser: false, isProfissional: false };
    }),
    update: protectedProcedure
      .input(z.object({
        nome: z.string().min(2).optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.systemUser) throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas usuários do sistema podem atualizar o perfil aqui' });
        await updateSystemUser(ctx.systemUser.id, { nome: input.nome, email: input.email });
        return { success: true };
      }),
    uploadAvatar: protectedProcedure
      .input(z.object({
        imagemBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.systemUser) throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas usuários do sistema podem alterar o avatar' });
        const buffer = Buffer.from(input.imagemBase64, 'base64');
        const ext = input.mimeType.includes('png') ? 'png' : 'jpg';
        const key = `avatars/prof-${ctx.systemUser.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const db = await getDb();
        if (!db) throw new Error('DB not available');
        const { profissionais: profTable } = await import('../drizzle/schema');
        await db.update(profTable).set({ avatarUrl: url }).where(eq(profTable.id, ctx.systemUser.id));
        return { success: true, url };
      }),
    changePassword: protectedProcedure
      .input(z.object({
        senhaAtual: z.string().min(1),
        novaSenha: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.systemUser) throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas usuários do sistema podem alterar a senha' });
        const bcrypt = await import('bcryptjs');
        const db = await getDb();
        if (!db) throw new Error('DB not available');
        const { profissionais: profTable } = await import('../drizzle/schema');
        const [su] = await db.select().from(profTable).where(eq(profTable.id, ctx.systemUser.id)).limit(1);
        if (!su) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        if (!su.passwordHash) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este usuário não tem senha definida' });
        const ok = await bcrypt.compare(input.senhaAtual, su.passwordHash);
        if (!ok) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Senha atual incorreta' });
        const hash = await bcrypt.hash(input.novaSenha, 10);
        await db.update(profTable).set({ passwordHash: hash }).where(eq(profTable.id, ctx.systemUser.id));
        return { success: true };
      }),
  }),

  // ─── WHATSAPP ──────────────────────────────────────────────────────────────────────────────────────
  whatsapp: router({
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      // Para plano PRO: consultar status via Z-API
      try {
        const userId = ctx.user?.id ?? ctx.systemUser?.id ?? 0;
        const systemUserEmpresaId = ctx.systemUser?.empresaId ?? null;
        const empresa = await getEmpresaDoContexto(userId, systemUserEmpresaId);
        if (empresa?.id) {
          const db = await getDb();
          if (db) {
            const { subscriptions: subsTable } = await import('../drizzle/schema');
            const [sub] = await db
              .select({ planType: subsTable.planType })
              .from(subsTable)
              .where(eq(subsTable.empresaId, empresa.id))
              .limit(1);
            if (sub?.planType === 'PRO') {
              const { zapiCheckStatus, zapiGetConnectedPhone } = await import('./zapi');
              const zapiStatus = await zapiCheckStatus();
              let phoneNumber: string | null = null;
              if (zapiStatus.connected) {
                const phoneInfo = await zapiGetConnectedPhone();
                phoneNumber = phoneInfo.phone;
              }
              return {
                status: zapiStatus.connected ? 'connected' : 'disconnected',
                phoneNumber,
                connectedAt: null,
                qrDataUrl: null,
                nextReconnectAt: null,
                provider: 'zapi' as const,
              };
            }
          }
        }
      } catch {
        // Se banco ou Z-API falhar, cai para Baileys abaixo
      }
      // Solo / Plus / Free → Baileys
      const { waManager } = await import('./whatsapp');
      const state = waManager.getState();
      return {
        status: state.status,
        phoneNumber: state.phoneNumber,
        connectedAt: state.connectedAt,
        qrDataUrl: state.qrDataUrl,
        nextReconnectAt: state.nextReconnectAt ?? null,
        provider: 'baileys' as const,
      };
    }),
    getConnectionLog: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const rows = await db.execute(
          drizzleSql`SELECT id, event, detail, statusCode, motivo, duracaoSessaoMs, tentativa, detalheTecnico, telefone, createdAt
              FROM wa_connection_log
              ORDER BY createdAt DESC
              LIMIT ${input?.limit ?? 50}`
        );
        return (rows[0] as unknown as any[]).map((r: any) => ({
          id: r.id as number,
          event: r.event as string,
          detail: r.detail as string | null,
          statusCode: r.statusCode as number | null,
          motivo: r.motivo as string | null,
          duracaoSessaoMs: r.duracaoSessaoMs ? Number(r.duracaoSessaoMs) : null,
          tentativa: r.tentativa as number | null,
          detalheTecnico: r.detalheTecnico as string | null,
          telefone: r.telefone as string | null,
          createdAt: new Date(r.createdAt),
        }));
      }),
    connect: protectedProcedure.mutation(async () => {
      const { waManager } = await import('./whatsapp');
      const state = waManager.getState();
      if (state.status === 'connected') {
        return { success: true, message: 'Já conectado' };
      }
      // Iniciar conexão em background (não aguarda)
      waManager.connect().catch(console.error);
      return { success: true, message: 'Conexão iniciada' };
    }),
    disconnect: protectedProcedure.mutation(async () => {
      const { waManager } = await import('./whatsapp');
      await waManager.disconnect();
      return { success: true };
    }),
    resetSession: protectedProcedure.mutation(async () => {
      const { waManager } = await import('./whatsapp');
      await waManager.resetSession();
      return { success: true };
    }),
    sendTest: protectedProcedure
      .input(z.object({ telefone: z.string().min(10) }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const { routedSendMessage } = await import('./whatsapp-router');
        const ok = await routedSendMessage(
          empresa.id,
          input.telefone,
          '\u2705 *Teste Hubly*\n\nSeu WhatsApp está conectado e funcionando corretamente!'
        );
        return { success: ok };
      }),

    // ─── Z-API (plano Pro) ──────────────────────────────────────────────────────
     /** Status da instância Z-API */
    zapiGetStatus: protectedProcedure.query(async ({ ctx }) => {
      const { ENV } = await import('./_core/env');
      // Se credenciais Z-API não estão configuradas no servidor, não é Pro
      if (!ENV.zapiInstanceId || !ENV.zapiToken || !ENV.zapiClientToken) {
        return { connected: false, status: 'not_pro', isPro: false, phoneNumber: null, deviceName: null };
      }
      // Tenta verificar plano no banco; se banco falhar, assume Pro (credenciais já estão configuradas)
      let isPro = false;
      try {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (empresa) {
          const plan = await getEmpresaPlan(empresa.id);
          isPro = plan === 'PRO';
        }
      } catch {
        // Banco indisponível — credenciais Z-API configuradas, assume Pro
        isPro = true;
      }
      if (!isPro) return { connected: false, status: 'not_pro', isPro: false, phoneNumber: null, deviceName: null };
      const { zapiCheckStatus, zapiGetConnectedPhone } = await import('./zapi');
      const result = await zapiCheckStatus();
      let phoneNumber: string | null = null;
      let deviceName: string | null = null;
      if (result.connected) {
        const phoneInfo = await zapiGetConnectedPhone();
        phoneNumber = phoneInfo.phone;
        deviceName = phoneInfo.name;
      }
      return { ...result, isPro: true, phoneNumber, deviceName };
    }),
    /** QR Code da instância Z-API como base64 */
    zapiGetQrCode: protectedProcedure
      .input(z.object({ origin: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
      const { ENV } = await import('./_core/env');
      if (!ENV.zapiInstanceId || !ENV.zapiToken || !ENV.zapiClientToken) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Recurso exclusivo do plano Pro' });
      }
      // Tenta verificar plano; se banco falhar, assume Pro
      let isPro = false;
      try {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (empresa) isPro = (await getEmpresaPlan(empresa.id)) === 'PRO';
      } catch { isPro = true; }
      if (!isPro) throw new TRPCError({ code: 'FORBIDDEN', message: 'Recurso exclusivo do plano Pro' });
      const { zapiGetQrCode, zapiSetWebhook } = await import('./zapi');
      const result = await zapiGetQrCode();
      // Ao detectar que acabou de conectar, configura o webhook automaticamente
      if (result.connected) {
        const webhookUrl = (input?.origin ?? 'https://hubly.orizontech.com.br') + '/api/zapi/webhook';
        zapiSetWebhook(webhookUrl).catch((err) =>
          console.error('[Z-API] Falha ao configurar webhook automaticamente:', err)
        );
      }
      return result;
    }),
    /** Reinicia a instância Z-API */
    zapiRestart: protectedProcedure.mutation(async ({ ctx }) => {
      const { ENV } = await import('./_core/env');
      if (!ENV.zapiInstanceId || !ENV.zapiToken || !ENV.zapiClientToken) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Recurso exclusivo do plano Pro' });
      }
      let isPro = false;
      try {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (empresa) isPro = (await getEmpresaPlan(empresa.id)) === 'PRO';
      } catch { isPro = true; }
      if (!isPro) throw new TRPCError({ code: 'FORBIDDEN', message: 'Recurso exclusivo do plano Pro' });
      const { zapiRestart } = await import('./zapi');
      return zapiRestart();
    }),
    /** Desconecta a instância Z-API */
    zapiDisconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const { ENV } = await import('./_core/env');
      if (!ENV.zapiInstanceId || !ENV.zapiToken || !ENV.zapiClientToken) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Recurso exclusivo do plano Pro' });
      }
      let isPro = false;
      try {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (empresa) isPro = (await getEmpresaPlan(empresa.id)) === 'PRO';
      } catch { isPro = true; }
      if (!isPro) throw new TRPCError({ code: 'FORBIDDEN', message: 'Recurso exclusivo do plano Pro' });
      const { zapiDisconnect } = await import('./zapi');
      return zapiDisconnect();
    }),
  }),
  // ─── PLANOS E ASSINATURAS ────────────────────────────────────────────────────────────────────────────────────────────────────
  planos: router({
    /** Retorna dados da subscription + uso atual da empresa */
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return null;
      const [plan, sub, usage] = await Promise.all([
        getEmpresaPlan(empresa.id),
        getSubscriptionData(empresa.id),
        getOrCreateUsage(empresa.id),
      ]);
      const limits = PLAN_LIMITS[plan];
      const prices = PLAN_PRICES[plan];
      const agendamentosPercent = getAgendamentosUsagePercent(plan, usage?.agendamentosCount ?? 0);
      return {
        plan,
        planLabel: prices.label,
        status: sub?.status ?? "active",
        trialEnd: sub?.trialEnd ?? null,
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        billingCycle: sub?.billingCycle ?? "monthly",
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
        usage: {
          agendamentosCount: usage?.agendamentosCount ?? 0,
          agendamentosLimit: limits.agendamentosMes,
          agendamentosPercent,
          notificacoesWhatsappCount: usage?.notificacoesWhatsappCount ?? 0,
          notificacoesWhatsappLimit: limits.notificacoesWhatsappMes,
        },
        limits,
        prices,
      };
    }),
    /** Retorna todos os planos com preços para a página de planos */
    getPlans: publicProcedure.query(() => {
      return Object.entries(PLAN_PRICES).map(([key, price]) => ({
        type: key as PlanType,
        ...price,
        limits: PLAN_LIMITS[key as PlanType],
      }));
    }),
    /** Busca preços reais do Stripe para exibir na página de planos */
    getStripePrices: publicProcedure.query(async () => {
      try {
        const { stripe: stripeClient } = await import('./stripe');
        const { PLANOS_STRIPE } = await import('./stripe-products');
        const result: Record<string, { mensal: number | null; anual: number | null; mensal_id: string | null; anual_id: string | null }> = {};
        for (const [key, plano] of Object.entries(PLANOS_STRIPE)) {
          let mensalCentavos: number | null = plano.mensal.valorCentavos;
          let anualCentavos: number | null = plano.anual.valorCentavos;
          // Tenta buscar preço real do Stripe se tiver price ID
          if (plano.mensal.priceId) {
            try {
              const price = await stripeClient.prices.retrieve(plano.mensal.priceId);
              if (price.unit_amount) mensalCentavos = price.unit_amount;
            } catch { /* usa fallback local */ }
          }
          if (plano.anual.priceId) {
            try {
              const price = await stripeClient.prices.retrieve(plano.anual.priceId);
              if (price.unit_amount) anualCentavos = price.unit_amount;
            } catch { /* usa fallback local */ }
          }
          result[key] = {
            mensal: mensalCentavos ? mensalCentavos / 100 : null,
            anual: anualCentavos ? anualCentavos / 100 : null,
            mensal_id: plano.mensal.priceId,
            anual_id: plano.anual.priceId,
          };
        }
        return result;
      } catch {
        // Fallback: retorna valores do arquivo local
        const { PLANOS_STRIPE } = await import('./stripe-products');
        return Object.fromEntries(
          Object.entries(PLANOS_STRIPE).map(([key, p]) => [
            key,
            { mensal: p.mensal.valorCentavos / 100, anual: p.anual.valorCentavos / 100, mensal_id: p.mensal.priceId, anual_id: p.anual.priceId },
          ])
        );
      }
    }),
    /** Inicializa o trial para uma empresa recém-criada */
    initTrial: protectedProcedure.mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      await getOrCreateSubscription(empresa.id);
      return { success: true };
    }),
    /** Verifica alertas de limite de plano */
    checkAlerts: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return { alertas: [], temAlerta: false };
      const { getUsageWithAlerts } = await import("./db-usage-alerts");
      const plan = await getEmpresaPlan(empresa.id);
      const result = await getUsageWithAlerts(empresa.id, plan);
      return result;
    }),
  }),
  // ─── STRIPE ───────────────────────────────────────────────────────────────────────────────────────
  stripe: router({
    /** Cria uma sessão de checkout do Stripe para assinar um plano */
    createCheckoutSession: protectedProcedure
      .input(z.object({
        planType: z.enum(["SOLO", "PLUS", "PRO"]),
        billingCycle: z.enum(["monthly", "annual"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // Apenas admin/owner pode assinar planos
        const { isAdmin } = await resolveAdminContext(ctx, empresa);
        if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar assinaturas" });
        const { stripe: stripeClient, getOrCreateStripeCustomer } = await import("./stripe");
        const { PLANOS_STRIPE } = await import("./stripe-products");
        // Obter ou criar o Customer do Stripe
        const subscription = await getOrCreateSubscription(empresa.id);
        const customerId = await getOrCreateStripeCustomer(
          empresa.id,
          empresa.email ?? "",
          empresa.nome,
          subscription.stripeCustomerId
        );
        // Atualizar o stripeCustomerId no banco se recém-criado
        if (!subscription.stripeCustomerId) {
          const db = await getDb();
          if (db) {
            const { subscriptions: subsTable } = await import("../drizzle/schema");
            await db
              .update(subsTable)
              .set({ stripeCustomerId: customerId, updatedAt: new Date() })
              .where(eq(subsTable.empresaId, empresa.id));
          }
        }
        const plano = PLANOS_STRIPE[input.planType];
        const preco = input.billingCycle === "annual" ? plano.anual : plano.mensal;
        const origin = ctx.req.headers.origin ?? "https://agendei-app.manus.space";
        const session = await stripeClient.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: preco.priceId ?? undefined,
              quantity: 1,
            },
          ],
          success_url: `${origin}/admin/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/admin/planos/cancelado`,
          metadata: {
            empresaId: String(empresa.id),
            planType: input.planType,
            billingCycle: input.billingCycle,
          },
          allow_promotion_codes: true,
        });
        return { url: session.url };
      }),
    /** Cria uma sessão do portal do cliente para gerenciar assinatura */
    createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      // Apenas admin/owner pode gerenciar assinatura
      const { isAdmin } = await resolveAdminContext(ctx, empresa);
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar assinaturas" });
      const subscription = await getOrCreateSubscription(empresa.id);
      const { stripe: stripeClient, getOrCreateStripeCustomer } = await import("./stripe");
      // Validar/criar customer (trata IDs inválidos de outro ambiente)
      const customerId = await getOrCreateStripeCustomer(
        empresa.id,
        empresa.email ?? "",
        empresa.nome,
        subscription.stripeCustomerId
      );
      const origin = ctx.req.headers.origin ?? "https://agendei-app.manus.space";
      const session = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/admin/assinatura`,
      });
      return { url: session.url };
    }),
    /** Retorna as últimas faturas do cliente no Stripe */
    getInvoices: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      const subscription = await getOrCreateSubscription(empresa.id);
      if (!subscription.stripeCustomerId) return [];
      try {
        const { stripe: stripeClient } = await import("./stripe");
        const invoices = await stripeClient.invoices.list({
          customer: subscription.stripeCustomerId,
          limit: 12,
        });
        return invoices.data.map((inv) => {
          const invAny = inv as unknown as {
            id: string;
            number: string | null;
            status: string | null;
            amount_paid: number;
            amount_due: number;
            currency: string;
            created: number;
            period_start: number;
            period_end: number;
            hosted_invoice_url: string | null;
            invoice_pdf: string | null;
            lines: { data: Array<{ description: string | null }> };
          };
          return {
            id: invAny.id,
            numero: invAny.number,
            status: invAny.status,
            valorPago: invAny.amount_paid / 100,
            valorDevido: invAny.amount_due / 100,
            moeda: invAny.currency.toUpperCase(),
            criadoEm: new Date(invAny.created * 1000),
            periodoInicio: new Date(invAny.period_start * 1000),
            periodoFim: new Date(invAny.period_end * 1000),
            urlFatura: invAny.hosted_invoice_url,
            urlPdf: invAny.invoice_pdf,
            descricao: invAny.lines.data[0]?.description ?? null,
          };
        });
      } catch {
        return [];
      }
    }),
    /** Busca dados de uma sessão de checkout pelo session_id (para página de sucesso) */
    getCheckoutSession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return null;
        try {
          const { stripe: stripeClient } = await import("./stripe");
          const session = await stripeClient.checkout.sessions.retrieve(
            input.sessionId,
            { expand: ["subscription"] }
          );
          const sessionAny = session as unknown as {
            id: string;
            status: string | null;
            payment_status: string;
            amount_total: number | null;
            currency: string | null;
            metadata: Record<string, string>;
            subscription: {
              id: string;
              status: string;
              current_period_end: number;
              items: { data: Array<{ price: { unit_amount: number; currency: string; recurring: { interval: string } } }> };
            } | null;
          };
          // Verificar que a sessão pertence à empresa
          const empresaId = sessionAny.metadata?.empresaId;
          if (empresaId && String(empresa.id) !== empresaId) return null;
          const planType = (sessionAny.metadata?.planType ?? "SOLO") as "SOLO" | "PLUS" | "PRO";
          const billingCycle = (sessionAny.metadata?.billingCycle ?? "monthly") as "monthly" | "annual";
          const planInfo = PLAN_PRICES[planType];
          return {
            sessionId: sessionAny.id,
            status: sessionAny.status,
            paymentStatus: sessionAny.payment_status,
            planType,
            billingCycle,
            planLabel: planInfo?.label ?? planType,
            valorTotal: sessionAny.amount_total ? sessionAny.amount_total / 100 : null,
            moeda: sessionAny.currency?.toUpperCase() ?? "BRL",
            proximaCobranca: sessionAny.subscription
              ? new Date(sessionAny.subscription.current_period_end * 1000)
              : null,
            limites: PLAN_LIMITS[planType],
          };
        } catch {
          return null;
        }
      }),
    /** Retorna detalhes completos da assinatura ativa no Stripe */
    getSubscriptionDetails: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return null;
      const subscription = await getOrCreateSubscription(empresa.id);
      const { stripe: stripeClient, getOrCreateStripeCustomer } = await import("./stripe");

      /**
       * Busca o método de pagamento padrão do Customer diretamente.
       * Usado como fallback quando não há assinatura ativa.
       */
      async function getMetodoPagamentoDoCustomer(customerId: string) {
        try {
          const pms = await stripeClient.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
          const pm = pms.data[0] as any;
          if (!pm) return null;
          return {
            tipo: "card",
            bandeira: pm.card?.brand ?? null,
            ultimos4: pm.card?.last4 ?? null,
            expMes: pm.card?.exp_month ?? null,
            expAno: pm.card?.exp_year ?? null,
          };
        } catch { return null; }
      }

      // Se não há assinatura ativa, tentar retornar apenas o método de pagamento do customer
      if (!subscription.stripeSubscriptionId) {
        if (!subscription.stripeCustomerId) return null;
        try {
          const metodoPagamento = await getMetodoPagamentoDoCustomer(subscription.stripeCustomerId);
          if (!metodoPagamento) return null;
          return {
            stripeSubId: null,
            status: null,
            proximaCobranca: null,
            inicioPerioodo: null,
            cancelarAoFinal: false,
            cancelarEm: null,
            metodoPagamento,
            valorMensal: null,
            intervalo: null,
          };
        } catch { return null; }
      }

      try {
        console.log(`[Stripe] Buscando assinatura: ${subscription.stripeSubscriptionId}`);
        const sub = await stripeClient.subscriptions.retrieve(
          subscription.stripeSubscriptionId,
          { expand: ["default_payment_method"] }
        );
        const subAny = sub as unknown as {
          id: string;
          status: string;
          current_period_end: number;
          current_period_start: number;
          cancel_at_period_end: boolean;
          cancel_at: number | null;
          default_payment_method: {
            type: string;
            card?: { brand: string; last4: string; exp_month: number; exp_year: number };
          } | null;
          customer: string;
          items: { data: Array<{ price: { unit_amount: number; currency: string; recurring: { interval: string; interval_count: number } } }> };
        };
        let pm = subAny.default_payment_method;
        // Se a assinatura não tem default_payment_method, buscar do customer
        let metodoPagamento = pm ? {
          tipo: pm.type,
          bandeira: pm.card?.brand ?? null,
          ultimos4: pm.card?.last4 ?? null,
          expMes: pm.card?.exp_month ?? null,
          expAno: pm.card?.exp_year ?? null,
        } : await getMetodoPagamentoDoCustomer(subAny.customer);
        // Usar dados do banco como fallback quando o Stripe não retorna os períodos
        const inicioFromStripe = subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : null;
        const fimFromStripe = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : null;
        const inicioFinal = inicioFromStripe ?? (subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null);
        const fimFinal = fimFromStripe ?? (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null);
        return {
          stripeSubId: subAny.id,
          status: subAny.status,
          proximaCobranca: fimFinal,
          inicioPerioodo: inicioFinal,
          cancelarAoFinal: subAny.cancel_at_period_end,
          cancelarEm: subAny.cancel_at ? new Date(subAny.cancel_at * 1000) : null,
          metodoPagamento,
          valorMensal: subAny.items.data[0]?.price?.unit_amount
            ? subAny.items.data[0].price.unit_amount / 100
            : null,
          intervalo: subAny.items.data[0]?.price?.recurring?.interval ?? null,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Stripe] Erro ao buscar assinatura ${subscription.stripeSubscriptionId}: ${msg}`);
        // Fallback: usar dados salvos no banco quando o Stripe não está acessível
        console.log(`[Stripe] Usando fallback do banco para empresa ${empresa.id}`);
        let metodoPagamento = null;
        if (subscription.stripeCustomerId) {
          try { metodoPagamento = await getMetodoPagamentoDoCustomer(subscription.stripeCustomerId); } catch {}
        }
        return {
          stripeSubId: subscription.stripeSubscriptionId,
          status: subscription.status,
          proximaCobranca: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
          inicioPerioodo: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null,
          cancelarAoFinal: subscription.cancelAtPeriodEnd ?? false,
          cancelarEm: null,
          metodoPagamento,
          valorMensal: null,
          intervalo: subscription.billingCycle === "annual" ? "year" : "month",
        };
      }
    }),
  }),
  // ─── VÍNCULO PROFISSIONAL-SERVIÇO ──────────────────────────────────────────
  profissionalServicos: router({
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        const db = await getDb();
        if (!db) return [];
        // Busca todos os vínculos profissional-serviço da empresa
        const { profissionalServicos: ps, profissionais: pf } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return db
          .select({ profissionalId: ps.profissionalId, servicoId: ps.servicoId })
          .from(ps)
          .innerJoin(pf, eq(ps.profissionalId, pf.id))
          .where(eq(pf.empresaId, empresa.id));
      }),
    getByProfissional: protectedProcedure
      .input(z.object({ profissionalId: z.number() }))
      .query(async ({ input }) => {
        const { getServicosByProfissional } = await import('./db');
        return getServicosByProfissional(input.profissionalId);
      }),
    set: protectedProcedure
      .input(z.object({
        profissionalId: z.number(),
        servicoIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const { setServicosProfissional } = await import('./db');
        await setServicosProfissional(input.profissionalId, input.servicoIds);
        return { success: true };
      }),
    vincular: protectedProcedure
      .input(z.object({ profissionalId: z.number(), servicoId: z.number() }))
      .mutation(async ({ input }) => {
        const { vincularServicoProfissional } = await import('./db');
        return vincularServicoProfissional(input.profissionalId, input.servicoId);
      }),
    desvincular: protectedProcedure
      .input(z.object({ profissionalId: z.number(), servicoId: z.number() }))
      .mutation(async ({ input }) => {
        const { desvincularServicoProfissional } = await import('./db');
        await desvincularServicoProfissional(input.profissionalId, input.servicoId);
        return { success: true };
      }),
  }),
  // ─── EQUIPE (Tela Unificada: Profissionais + Usuários) ──────────────────────
  equipe: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getEquipeByEmpresa(empresa.id);
    }),
    criar: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        corCalendario: z.string().optional(),
        isProfissional: z.boolean().default(true),
        temAcesso: z.boolean().default(false),
        senha: z.string().min(6).optional(),
        grupoId: z.number().optional(),
        percentualComissao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'profissionaisCriar');
        // Validar email único globalmente (entre todas as empresas)
        if (input.email) {
          const db = await getDb();
          if (db) {
            const { profissionais: profTable } = await import('../drizzle/schema.js');
            const existing = await db.select({ id: profTable.id }).from(profTable)
              .where(eq(profTable.email, input.email.toLowerCase().trim())).limit(1);
            if (existing.length > 0) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este e-mail já está cadastrado no sistema. Utilize outro e-mail.' });
            }
          }
        }
        let passwordHash: string | undefined;
        if (input.temAcesso && input.senha) {
          const bcryptLib = await import('bcryptjs');
          passwordHash = await bcryptLib.default.hash(input.senha, 10);
        }
        const id = await createProfissional({
          empresaId: empresa.id,
          nome: input.nome,
          email: input.email,
          telefone: input.telefone,
          especialidade: input.especialidade,
          corCalendario: input.corCalendario ?? '#7c3aed',
          isProfissional: input.isProfissional,
          temAcesso: input.temAcesso,
          passwordHash: passwordHash ?? null,
          grupoId: input.grupoId ?? null,
          criadoPorId: ctx.user.id,
          ativo: true,
          percentualComissao: input.percentualComissao ?? '0.00',
        } as any);
        return { id, success: true };
      }),
    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
        telefone: z.string().nullable().optional(),
        especialidade: z.string().nullable().optional(),
        corCalendario: z.string().optional(),
        isProfissional: z.boolean().optional(),
        temAcesso: z.boolean().optional(),
        ativo: z.boolean().optional(),
        senha: z.string().min(6).optional(),
        grupoId: z.number().nullable().optional(),
        percentualComissao: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'profissionaisEditar');
        // Validar email único globalmente ao atualizar
        if (input.email) {
          const db = await getDb();
          if (db) {
            const { profissionais: profTable } = await import('../drizzle/schema.js');
            const existing = await db.select({ id: profTable.id }).from(profTable)
              .where(eq(profTable.email, input.email.toLowerCase().trim())).limit(1);
            if (existing.length > 0 && existing[0].id !== input.id) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este e-mail já está cadastrado no sistema. Utilize outro e-mail.' });
            }
          }
        }
        const { id, senha, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (senha) {
          const bcryptLib = await import('bcryptjs');
          updateData.passwordHash = await bcryptLib.default.hash(senha, 10);
        }
        await updateProfissional(id, updateData as any);
        return { success: true };
      }),
    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateProfissional(input.id, { ativo: false });
        return { success: true };
      }),
    resetarSenha: protectedProcedure
      .input(z.object({ id: z.number(), novaSenha: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const bcryptLib = await import('bcryptjs');
        const passwordHash = await bcryptLib.default.hash(input.novaSenha, 10);
        await updateProfissional(input.id, { passwordHash });
        return { success: true };
      }),
  }),
  tiposProfissional: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getTiposProfissionalByEmpresa(empresa.id);
    }),
    criar: protectedProcedure
      .input(z.object({ nome: z.string().min(1), cor: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa n\u00e3o encontrada' });
        return createTipoProfissional(empresa.id, input.nome, input.cor);
      }),
    atualizar: protectedProcedure
      .input(z.object({ id: z.number(), nome: z.string().min(1).optional(), cor: z.string().optional(), ativo: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateTipoProfissional(id, data);
        return { success: true };
      }),
    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTipoProfissional(input.id);
        return { success: true };
      }),
    getByProfissional: protectedProcedure
      .input(z.object({ profissionalId: z.number() }))
      .query(async ({ input }) => {
        return getTiposByProfissional(input.profissionalId);
      }),
    setProfissional: protectedProcedure
      .input(z.object({ profissionalId: z.number(), tipoIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await setTiposProfissional(input.profissionalId, input.tipoIds);
        return { success: true };
      }),
  }),  // ─── Permissões Individuais ─────────────────────────────────────────────────
  permissoesIndividuais: router({
    get: protectedProcedure
      .input(z.object({ profissionalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'FORBIDDEN' });
        await requirePermissao(ctx, empresa, 'profissionaisGerenciarPermissoes');
        return getPermissoesIndividuais(input.profissionalId);
      }),
    update: protectedProcedure
      .input(z.object({
        profissionalId: z.number(),
        permissoes: z.record(z.string(), z.boolean().nullable()),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'FORBIDDEN' });
        await requirePermissao(ctx, empresa, 'profissionaisGerenciarPermissoes');
        await updatePermissoesIndividuais(input.profissionalId, input.permissoes as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ profissionalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'FORBIDDEN' });
        await requirePermissao(ctx, empresa, 'profissionaisGerenciarPermissoes');
        await deletePermissoesIndividuais(input.profissionalId);
        return { success: true };
      }),
  }),

  // ─── Contas a Pagar ───────────────────────────────────────────────────────────
  contasPagar: router({
    categorias: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        return getCategoriasDespesaByEmpresa(empresa.id);
      }),
      criar: protectedProcedure
        .input(z.object({
          nome: z.string().min(1).max(100),
          cor: z.string().optional(),
          icone: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new TRPCError({ code: "NOT_FOUND" });
          const id = await createCategoriaDespesa({ ...input, empresaId: empresa.id });
          return { id };
        }),
      atualizar: protectedProcedure
        .input(z.object({
          id: z.number(),
          nome: z.string().min(1).max(100).optional(),
          cor: z.string().optional(),
          icone: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          await updateCategoriaDespesa(id, data);
          return { success: true };
        }),
      deletar: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deleteCategoriaDespesa(input.id);
          return { success: true };
        }),
    }),
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        categoriaId: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        // Apenas quem tem financeiroVer pode acessar contas a pagar
        await requirePermissao(ctx, empresa, 'financeiroVer');
        return getContasPagarByEmpresa(empresa.id, input ?? {});
      }),
    metricas: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return { totalPendente: 0, totalVencido: 0, totalPagoMes: 0, totalMes: 0, contasVencidas: 0, contasPendentes: 0 };
      // Apenas quem tem financeiroVer pode ver métricas de contas a pagar
      await requirePermissao(ctx, empresa, 'financeiroVer');
      return getMetricasContasPagar(empresa.id);
    }),
    criar: protectedProcedure
      .input(z.object({
        descricao: z.string().min(1).max(200),
        valor: z.number().positive(),
        dataVencimento: z.string(),
        categoriaId: z.number().optional(),
        recorrente: z.boolean().optional(),
        recorrenciaTipo: z.enum(["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]).optional(),
        fornecedor: z.string().optional(),
        meioPagamentoId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await createContaPagar({
          ...input,
          valor: String(input.valor),
          empresaId: empresa.id,
          status: "pendente",
        });
        return { id };
      }),
    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        descricao: z.string().min(1).max(200).optional(),
        valor: z.number().positive().optional(),
        dataVencimento: z.string().optional(),
        dataPagamento: z.string().optional().nullable(),
        categoriaId: z.number().optional().nullable(),
        status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
        recorrente: z.boolean().optional(),
        recorrenciaTipo: z.enum(["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]).optional().nullable(),
        observacoes: z.string().optional().nullable(),
        fornecedor: z.string().optional().nullable(),
        meioPagamentoId: z.number().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, valor, ...rest } = input;
        await updateContaPagar(id, { ...rest, ...(valor !== undefined ? { valor: String(valor) } : {}) });
        return { success: true };
      }),
    marcarPago: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataPagamento: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const hoje = new Date().toISOString().split("T")[0];
        await updateContaPagar(input.id, {
          status: "pago",
          dataPagamento: input.dataPagamento ?? hoje,
        });
        return { success: true };
      }),
    deletar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteContaPagar(input.id);
        return { success: true };
      }),
  }),
  // ─── CONTAS A RECEBER ─────────────────────────────────────────────────────
  contasReceber: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      // Apenas quem tem financeiroVer pode acessar contas a receber
      await requirePermissao(ctx, empresa, 'financeiroVer');
      return getContasReceberByEmpresa(empresa.id);
    }),
    metricas: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return { totalPendente: 0, totalRecebidoMes: 0, totalVencido: 0, quantidadePendentes: 0, quantidadeVencidas: 0, quantidadeProximas7: 0, totalProximas7: 0 };
      // Apenas quem tem financeiroVer pode ver métricas de contas a receber
      await requirePermissao(ctx, empresa, 'financeiroVer');
      return getMetricasContasReceber(empresa.id);
    }),
    criar: protectedProcedure
      .input(z.object({
        descricao: z.string().min(1),
        valor: z.number().positive(),
        dataVencimento: z.string(),
        dataRecebimento: z.string().optional(),
        status: z.enum(["pendente", "recebido", "vencido", "cancelado"]).default("pendente"),
        origem: z.enum(["manual", "agendamento", "pacote"]).default("manual"),
        clienteId: z.number().optional(),
        profissionalId: z.number().optional(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
        observacoes: z.string().optional(),
        recorrente: z.boolean().default(false),
        recorrenciaTipo: z.enum(["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]).optional(),
        meioPagamentoId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await createContaReceber({
          empresaId: empresa.id,
          descricao: input.descricao,
          valor: String(input.valor),
          dataVencimento: input.dataVencimento,
          dataRecebimento: input.dataRecebimento,
          status: input.status,
          origem: input.origem,
          clienteId: input.clienteId,
          profissionalId: input.profissionalId,
          tipoPagamento: input.tipoPagamento,
          meioPagamentoId: input.meioPagamentoId,
          observacoes: input.observacoes,
          recorrente: input.recorrente,
          recorrenciaTipo: input.recorrenciaTipo,
        });
        return { id, success: true };
      }),
    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        descricao: z.string().min(1).optional(),
        valor: z.number().positive().optional(),
        dataVencimento: z.string().optional(),
        dataRecebimento: z.string().optional(),
        status: z.enum(["pendente", "recebido", "vencido", "cancelado"]).optional(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
        observacoes: z.string().optional(),
        clienteId: z.number().optional(),
        profissionalId: z.number().optional(),
        meioPagamentoId: z.number().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, valor, ...rest } = input;
        await updateContaReceber(id, { ...rest, ...(valor !== undefined ? { valor: String(valor) } : {}) });
        return { success: true };
      }),
    marcarRecebido: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataRecebimento: z.string().optional(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const hoje = new Date().toISOString().split("T")[0];
        await updateContaReceber(input.id, {
          status: "recebido",
          dataRecebimento: input.dataRecebimento ?? hoje,
          tipoPagamento: input.tipoPagamento,
        });
        return { success: true };
      }),
    deletar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteContaReceber(input.id);
        return { success: true };
      }),
    importarAgendamentos: protectedProcedure
      .mutation(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND" });
        const count = await importarAgendamentosParaContasReceber(empresa.id);
        return { count, success: true };
      }),
  }),
  // ─── PUSH NOTIFICATIONS (PWA) ────────────────────────────────────────────────────────────────────────────────
  push: router({
    /** Retorna a chave pública VAPID para o frontend criar a subscription */
    getVapidPublicKey: publicProcedure.query(() => {
      return { publicKey: process.env.VITE_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? "" };
    }),
    /** Salva a subscription push do dispositivo atual */
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND' });
        const { savePushSubscription } = await import('./pushNotifications');
        await savePushSubscription({
          userId: ctx.user.id,
          empresaId: empresa.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        });
        return { success: true };
      }),
    /** Remove a subscription push do dispositivo atual */
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        const { removePushSubscription } = await import('./pushNotifications');
        await removePushSubscription(input.endpoint);
        return { success: true };
      }),
    /** Envia uma notificação de teste para o usuário atual */
    sendTest: protectedProcedure.mutation(async ({ ctx }) => {
      const { sendPushToUser } = await import('./pushNotifications');
      const result = await sendPushToUser(ctx.user.id, {
        title: '🔔 Hubly - Teste de Notificação',
        body: 'Notificações push estão funcionando corretamente!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        sound: true,
        tag: 'test-notification',
        url: '/',
      });
      return result;
    }),
    /** Retorna as preferências de notificações push do usuário atual */
    getPreferencias: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      let userId = ctx.user.id;
      if (ctx.systemUser) {
        const { profissionais: profTable } = await import('../drizzle/schema');
        const [prof] = await db.select({ userId: profTable.userId }).from(profTable).where(eq(profTable.id, ctx.systemUser.id)).limit(1);
        if (prof?.userId) userId = prof.userId;
      }
      if (userId < 0) {
        return { novoAgendamento: true, confirmacao: true, cancelamento: true, lembrete: true, pagamento: true, comissao: true };
      }
      const { users: usersTable } = await import('../drizzle/schema');
      const [user] = await db.select({
        notifNovoAgendamento: usersTable.notifNovoAgendamento,
        notifConfirmacao: usersTable.notifConfirmacao,
        notifCancelamento: usersTable.notifCancelamento,
        notifLembrete: usersTable.notifLembrete,
        notifPagamento: usersTable.notifPagamento,
        notifComissao: usersTable.notifComissao,
      }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      return {
        novoAgendamento: user?.notifNovoAgendamento ?? true,
        confirmacao: user?.notifConfirmacao ?? true,
        cancelamento: user?.notifCancelamento ?? true,
        lembrete: user?.notifLembrete ?? true,
        pagamento: user?.notifPagamento ?? true,
        comissao: user?.notifComissao ?? true,
      };
    }),
    /** Salva as preferências de notificações push do usuário atual */
    salvarPreferencias: protectedProcedure
      .input(z.object({
        novoAgendamento: z.boolean(),
        confirmacao: z.boolean(),
        cancelamento: z.boolean(),
        lembrete: z.boolean(),
        pagamento: z.boolean(),
        comissao: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        let userId = ctx.user.id;
        if (ctx.systemUser) {
          const { profissionais: profTable } = await import('../drizzle/schema');
          const [prof] = await db.select({ userId: profTable.userId }).from(profTable).where(eq(profTable.id, ctx.systemUser.id)).limit(1);
          if (prof?.userId) userId = prof.userId;
        }
        if (userId < 0) return { success: true };
        const { users: usersTable } = await import('../drizzle/schema');
        await db.update(usersTable).set({
          notifNovoAgendamento: input.novoAgendamento,
          notifConfirmacao: input.confirmacao,
          notifCancelamento: input.cancelamento,
          notifLembrete: input.lembrete,
          notifPagamento: input.pagamento,
          notifComissao: input.comissao,
        }).where(eq(usersTable.id, userId));
        return { success: true };
      }),
  }),

  // ─── CONFIRMAÇÃO DE AGENDAMENTO ──────────────────────────────────────────────
  confirmacao: router({
    /** Gera um link de confirmação para um agendamento (para incluir na mensagem de lembrete) */
    gerarLink: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        origin: z.string().optional(), // window.location.origin do frontend
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const { gerarTokenConfirmacao } = await import('./confirmacao');
        const token = await gerarTokenConfirmacao(input.agendamentoId, empresa.id);
        const origin = input.origin ?? process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
        const link = `${origin}/api/confirmar/${token}`;
        return { token, link };
      }),
    /** Verifica o status de um token de confirmação (para a página pública) */
    verificarToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { status: 'erro' as const };
        const { tokensConfirmacao: tbl, agendamentos: agTbl, empresas: empTbl } = await import('../drizzle/schema');
        const agora = new Date();
        const [tokenRow] = await db.select()
          .from(tbl)
          .where(eq(tbl.token, input.token))
          .limit(1);
        if (!tokenRow) return { status: 'invalido' as const };

        // Buscar dados do agendamento e empresa para enriquecer a resposta
        const [agendamento] = await db.select({
          data: agTbl.data,
          horaInicio: agTbl.horaInicio,
          horaFim: agTbl.horaFim,
        }).from(agTbl).where(eq(agTbl.id, tokenRow.agendamentoId)).limit(1);

        const [empresa] = await db.select({
          nome: empTbl.nome,
          whatsappNumero: empTbl.whatsappNumero,
          telefone: empTbl.telefone,
        }).from(empTbl).where(eq(empTbl.id, tokenRow.empresaId)).limit(1);

        const dadosExtras = {
          empresaNome: empresa?.nome ?? null,
          empresaContato: empresa?.whatsappNumero ?? empresa?.telefone ?? null,
          agendamentoData: agendamento?.data ?? null,
          agendamentoHora: agendamento?.horaInicio ? String(agendamento.horaInicio).slice(0, 5) : null,
        };

        if (tokenRow.usadoEm) return { status: 'ja_confirmado' as const, usadoEm: tokenRow.usadoEm, ...dadosExtras };
        if (tokenRow.expiresAt < agora) return { status: 'expirado' as const, expiresAt: tokenRow.expiresAt, ...dadosExtras };
        return { status: 'pendente' as const, ...dadosExtras };
      }),

    /** Busca detalhes completos do agendamento pelo token (para a página de confirmação) */
    detalhes: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { tokensConfirmacao: tbl, agendamentos: agTbl, empresas: empTbl, clientes: cliTbl, profissionais: profTbl, servicos: svcTbl, agendamentoItens: itensTbl } = await import('../drizzle/schema.js');
        const agora = new Date();
        const [tokenRow] = await db.select().from(tbl).where(eq(tbl.token, input.token)).limit(1);
        if (!tokenRow) return null;
        const [ag] = await db.select().from(agTbl).where(eq(agTbl.id, tokenRow.agendamentoId)).limit(1);
        if (!ag) return null;
        const [empresa] = await db.select({
          nome: empTbl.nome, logoUrl: empTbl.logoUrl, corPrimaria: empTbl.corPrimaria,
          corSecundaria: empTbl.corSecundaria, whatsappNumero: empTbl.whatsappNumero, telefone: empTbl.telefone,
        }).from(empTbl).where(eq(empTbl.id, tokenRow.empresaId)).limit(1);
        const [cliente] = await db.select({ nome: cliTbl.nome }).from(cliTbl).where(eq(cliTbl.id, ag.clienteId)).limit(1);
        const [profissional] = ag.profissionalId
          ? await db.select({ nome: profTbl.nome }).from(profTbl).where(eq(profTbl.id, ag.profissionalId)).limit(1)
          : [null];
        const itens = await db.select({ nomeServico: svcTbl.nome, duracaoMinutos: svcTbl.duracaoMinutos })
          .from(itensTbl)
          .innerJoin(svcTbl, eq(itensTbl.servicoId, svcTbl.id))
          .where(eq(itensTbl.agendamentoId, ag.id));
        const [servicoPrincipal] = itens.length === 0
          ? await db.select({ nomeServico: svcTbl.nome, duracaoMinutos: svcTbl.duracaoMinutos }).from(svcTbl).where(eq(svcTbl.id, ag.servicoId)).limit(1)
          : [null];
        const servicos = itens.length > 0 ? itens : (servicoPrincipal ? [servicoPrincipal] : []);
        const statusToken = tokenRow.usadoEm ? 'ja_confirmado' : tokenRow.expiresAt < agora ? 'expirado' : ag.status === 'cancelado' ? 'cancelado' : 'pendente';
        // Calcular valor final com desconto aplicado
        const valorBruto = parseFloat(String(ag.valorTotal ?? '0'));
        const descontoAg = parseFloat(String(ag.desconto ?? '0'));
        const valorFinal = Math.max(0, valorBruto - descontoAg);
        return {
          token: input.token,
          status: statusToken,
          agendamentoStatus: ag.status,
          data: ag.data,
          horaInicio: String(ag.horaInicio).slice(0, 5),
          horaFim: String(ag.horaFim).slice(0, 5),
          valorTotal: ag.valorTotal,
          desconto: ag.desconto ?? '0',
          valorFinal: valorFinal.toFixed(2),
          observacoes: ag.observacoes,
          clienteNome: cliente?.nome ?? null,
          profissionalNome: profissional?.nome ?? null,
          servicos,
          empresa: empresa ? {
            nome: empresa.nome,
            logoUrl: empresa.logoUrl,
            corPrimaria: empresa.corPrimaria ?? '#1a3a6b',
            corSecundaria: empresa.corSecundaria ?? '#e8d5c4',
            contato: empresa.whatsappNumero ?? empresa.telefone ?? null,
          } : null,
          usadoEm: tokenRow.usadoEm,
          expiresAt: tokenRow.expiresAt,
        };
      }),

    /** Confirma o agendamento via token (chamado pelo botão na página) */
    confirmar: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { tokensConfirmacao: tbl, agendamentos: agTbl } = await import('../drizzle/schema.js');
        const agora = new Date();
        const [tokenRow] = await db.select().from(tbl).where(and(eq(tbl.token, input.token), isNull(tbl.usadoEm), gt(tbl.expiresAt, agora))).limit(1);
        if (!tokenRow) {
          const [usado] = await db.select().from(tbl).where(eq(tbl.token, input.token)).limit(1);
          if (usado?.usadoEm) return { resultado: 'ja_confirmado' as const };
          return { resultado: 'expirado' as const };
        }
        await db.update(tbl).set({ usadoEm: agora }).where(eq(tbl.id, tokenRow.id));
        // Se o agendamento é pré-agendado, confirmar = mudar para 'agendado'; senão, 'confirmado'
        const [agParaConfirmar] = await db.select({ status: agTbl.status }).from(agTbl).where(eq(agTbl.id, tokenRow.agendamentoId)).limit(1);
        const novoStatus = agParaConfirmar?.status === 'pre_agendado' ? 'agendado' : 'confirmado';
        await db.update(agTbl).set({ status: novoStatus, confirmadoEm: agora }).where(eq(agTbl.id, tokenRow.agendamentoId));
        // Buscar agendamento atualizado para notificações e automações
        const [ag] = await db.select().from(agTbl).where(eq(agTbl.id, tokenRow.agendamentoId)).limit(1);
        // Notificação push para admin e profissional
        try {
          const { notificarConfirmacaoPublica } = await import('./confirmacao.js');
          if (ag) await notificarConfirmacaoPublica(ag, tokenRow.empresaId, db);
        } catch (e) { console.error('[confirmar] Erro ao notificar:', e); }
        // Disparar automação agendamento_confirmado (mesma lógica do painel interno)
        if (ag) {
          try {
            const { empresas: empTbl2, clientes: cliTbl2, profissionais: profTbl2, servicos: svcTbl2, agendamentoItens: itensTbl2 } = await import('../drizzle/schema.js');
            const { getAutomacoesByEvento, registrarEnvioAutomacao } = await import('./db.js');
            const automacoesConfirmado = await getAutomacoesByEvento(tokenRow.empresaId, 'agendamento_confirmado');
            if (automacoesConfirmado.length > 0) {
              const [empresa2] = await db.select({ nome: empTbl2.nome, portalSlug: empTbl2.portalSlug }).from(empTbl2).where(eq(empTbl2.id, tokenRow.empresaId)).limit(1);
              const [cliente2] = await db.select({ id: cliTbl2.id, nome: cliTbl2.nome, telefone: cliTbl2.telefone, tags: cliTbl2.tags }).from(cliTbl2).where(eq(cliTbl2.id, ag.clienteId)).limit(1);
              const [profissional2] = ag.profissionalId ? await db.select({ nome: profTbl2.nome }).from(profTbl2).where(eq(profTbl2.id, ag.profissionalId)).limit(1) : [null];
              const [servico2] = ag.servicoId ? await db.select({ nome: svcTbl2.nome, categoria: svcTbl2.categoria }).from(svcTbl2).where(eq(svcTbl2.id, ag.servicoId)).limit(1) : [null];
              if (cliente2?.telefone) {
                const dataPartes = String(ag.data).split('-');
                const dataFormatada2 = dataPartes.length === 3 ? `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]}` : String(ag.data);
                const valorBruto2 = parseFloat(String(ag.valorTotal ?? '0'));
                const descontoAg2 = parseFloat(String(ag.desconto ?? '0'));
                const valorFinal2 = Math.max(0, valorBruto2 - descontoAg2);
                const origin2 = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
                const linkAgendamento2 = empresa2?.portalSlug ? `${origin2}/agendar/${empresa2.portalSlug}` : `${origin2}/agendar?e=${tokenRow.empresaId}`;
                const templateVarsConf = {
                  nome_cliente: cliente2.nome,
                  primeiro_nome: cliente2.nome.split(' ')[0],
                  servico: servico2?.nome ?? '',
                  data: dataFormatada2,
                  hora: `${String(ag.horaInicio ?? '').slice(0, 5)} – ${String(ag.horaFim ?? '').slice(0, 5)}`,
                  profissional: profissional2?.nome ?? '',
                  empresa: empresa2?.nome ?? '',
                  valor: `R$ ${valorFinal2.toFixed(2).replace('.', ',')}`,
                  valor_reserva: '',
                  link_agendamento: linkAgendamento2,
                  link_agenda: '',
                  observacoes: ag.observacoes ?? '',
                };
                // Buscar itens compostos para filtros de condição
                const itensConf = await db.select({ servicoNome: svcTbl2.nome }).from(itensTbl2).leftJoin(svcTbl2, eq(itensTbl2.servicoId, svcTbl2.id)).where(eq(itensTbl2.agendamentoId, ag.id));
                const todosServicosConf: string[] = servico2?.nome ? [servico2.nome] : [];
                for (const it of itensConf) { if (it.servicoNome && !todosServicosConf.includes(it.servicoNome)) todosServicosConf.push(it.servicoNome); }
                for (const automacaoConf of automacoesConfirmado) {
                  if (!verificarCondicoesFlowRouter(automacaoConf.flowJson, servico2?.nome, todosServicosConf, {
                    profissionalNome: profissional2?.nome ?? null,
                    categoriaServico: servico2?.categoria ?? null,
                    todasCategorias: servico2?.categoria ? [servico2.categoria] : [],
                    valorAgendamento: valorFinal2,
                    clienteTags: Array.isArray(cliente2.tags) ? cliente2.tags as string[] : [],
                    totalAgendamentosCliente: 0,
                    ultimoAgendamentoData: null,
                  })) continue;
                  const mensagemConf = automacaoConf.corpoMensagem ? processarVariaveisTemplate(automacaoConf.corpoMensagem, templateVarsConf) : null;
                  if (!mensagemConf) continue;
                  const midiaUrlConf = extrairMidiaUrl(automacaoConf.flowJson);
                  await registrarEnvioAutomacao({
                    empresaId: tokenRow.empresaId,
                    agendamentoId: ag.id,
                    automacaoId: automacaoConf.id,
                    automacaoNome: automacaoConf.nome ?? 'Confirmação de Agendamento',
                    clienteId: cliente2.id,
                    clienteNome: cliente2.nome,
                    telefone: cliente2.telefone,
                    canal: 'whatsapp',
                    mensagem: mensagemConf,
                    status: 'pendente',
                    enviarEm: new Date(),
                    midiaUrl: midiaUrlConf ?? undefined,
                    servicoNome: servico2?.nome ?? undefined,
                  });
                  console.log(`[confirmar] Automação "${automacaoConf.nome}" enfileirada para ag. ${ag.id} (${cliente2.telefone})`);
                  try { await (await import('./db-plans.js')).incrementWhatsappCount(tokenRow.empresaId); } catch {}
                }
              }
            }
          } catch (e) { console.error('[confirmar] Erro ao disparar automação:', e); }
        }
        // Mover cartão no Pipeline
        try {
          const { moverCartaoPorStatusInterno } = await import('./routers/pipeline.js');
          await moverCartaoPorStatusInterno({
            empresaId: tokenRow.empresaId,
            agendamentoId: ag.id,
            clienteId: ag.clienteId ?? undefined,
            novoStatus: 'confirmado',
          });
        } catch (e) { console.error('[Pipeline/confirmar] Erro ao mover cartão:', e); }
        return { resultado: 'confirmado' as const };
      }),

    /** Cancela o agendamento via token de confirmação */
    cancelar: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { tokensConfirmacao: tbl, agendamentos: agTbl } = await import('../drizzle/schema.js');
        const agora = new Date();
        const [tokenRow] = await db.select().from(tbl).where(eq(tbl.token, input.token)).limit(1);
        if (!tokenRow) return { resultado: 'invalido' as const };
        const [ag] = await db.select().from(agTbl).where(eq(agTbl.id, tokenRow.agendamentoId)).limit(1);
        if (!ag || ag.status === 'cancelado') return { resultado: 'ja_cancelado' as const };
        if (ag.status === 'concluido') return { resultado: 'ja_concluido' as const };
        await db.update(agTbl).set({ status: 'cancelado' }).where(eq(agTbl.id, tokenRow.agendamentoId));
        await db.update(tbl).set({ usadoEm: agora }).where(eq(tbl.id, tokenRow.id));
        // Disparar automação agendamento_cancelado_pelo_cliente
        try {
          const { clientes: cliTbl3, empresas: empTbl3, profissionais: profTbl3, servicos: svcTbl3, agendamentoItens: itensTbl3 } = await import('../drizzle/schema.js');
          const automacoesCancel = await getAutomacoesByEvento(tokenRow.empresaId, 'agendamento_cancelado_pelo_cliente');
          if (automacoesCancel.length > 0) {
            const [empresa3] = await db.select({ nome: empTbl3.nome, portalSlug: empTbl3.portalSlug }).from(empTbl3).where(eq(empTbl3.id, tokenRow.empresaId)).limit(1);
            const [cliente3] = ag.clienteId ? await db.select({ id: cliTbl3.id, nome: cliTbl3.nome, telefone: cliTbl3.telefone, tags: cliTbl3.tags }).from(cliTbl3).where(eq(cliTbl3.id, ag.clienteId)).limit(1) : [null];
            const [profissional3] = ag.profissionalId ? await db.select({ nome: profTbl3.nome }).from(profTbl3).where(eq(profTbl3.id, ag.profissionalId)).limit(1) : [null];
            const [servico3] = ag.servicoId ? await db.select({ nome: svcTbl3.nome, categoria: svcTbl3.categoria }).from(svcTbl3).where(eq(svcTbl3.id, ag.servicoId)).limit(1) : [null];
            if (cliente3?.telefone) {
              const dataPartes3 = String(ag.data).split('-');
              const dataFormatada3 = dataPartes3.length === 3 ? `${dataPartes3[2]}/${dataPartes3[1]}/${dataPartes3[0]}` : String(ag.data);
              const valorBruto3 = parseFloat(String(ag.valorTotal ?? '0'));
              const descontoAg3 = parseFloat(String(ag.desconto ?? '0'));
              const valorFinal3 = Math.max(0, valorBruto3 - descontoAg3);
              const origin3 = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
              const linkAgendamento3 = empresa3?.portalSlug ? `${origin3}/agendar/${empresa3.portalSlug}` : `${origin3}/agendar?e=${tokenRow.empresaId}`;
              const templateVarsCancel = {
                nome_cliente: cliente3.nome,
                primeiro_nome: cliente3.nome.split(' ')[0],
                servico: servico3?.nome ?? '',
                data: dataFormatada3,
                hora: `${String(ag.horaInicio ?? '').slice(0, 5)} – ${String(ag.horaFim ?? '').slice(0, 5)}`,
                profissional: profissional3?.nome ?? '',
                empresa: empresa3?.nome ?? '',
                valor: `R$ ${valorFinal3.toFixed(2).replace('.', ',')}`,
                valor_reserva: '',
                link_agendamento: linkAgendamento3,
                link_agenda: '',
                observacoes: ag.observacoes ?? '',
              };
              const itensCancel = await db.select({ servicoNome: svcTbl3.nome }).from(itensTbl3).leftJoin(svcTbl3, eq(itensTbl3.servicoId, svcTbl3.id)).where(eq(itensTbl3.agendamentoId, ag.id));
              const todosServicosCancel: string[] = servico3?.nome ? [servico3.nome] : [];
              for (const it of itensCancel) { if (it.servicoNome && !todosServicosCancel.includes(it.servicoNome)) todosServicosCancel.push(it.servicoNome); }
              for (const automacaoCancel of automacoesCancel) {
                if (!verificarCondicoesFlowRouter(automacaoCancel.flowJson, servico3?.nome, todosServicosCancel, {
                  profissionalNome: profissional3?.nome ?? null,
                  categoriaServico: servico3?.categoria ?? null,
                  todasCategorias: servico3?.categoria ? [servico3.categoria] : [],
                  valorAgendamento: valorFinal3,
                  clienteTags: Array.isArray(cliente3.tags) ? cliente3.tags as string[] : [],
                  totalAgendamentosCliente: 0,
                  ultimoAgendamentoData: null,
                })) continue;
                const mensagemCancel = automacaoCancel.corpoMensagem ? processarVariaveisTemplate(automacaoCancel.corpoMensagem, templateVarsCancel) : null;
                if (!mensagemCancel) continue;
                const midiaUrlCancel = extrairMidiaUrl(automacaoCancel.flowJson);
                await registrarEnvioAutomacao({
                  empresaId: tokenRow.empresaId,
                  agendamentoId: ag.id,
                  automacaoId: automacaoCancel.id,
                  automacaoNome: automacaoCancel.nome ?? 'Cancelamento pelo cliente',
                  clienteId: cliente3.id,
                  clienteNome: cliente3.nome,
                  telefone: cliente3.telefone,
                  canal: 'whatsapp',
                  mensagem: mensagemCancel,
                  status: 'pendente',
                  enviarEm: new Date(),
                  midiaUrl: midiaUrlCancel ?? undefined,
                  servicoNome: servico3?.nome ?? undefined,
                });
                console.log(`[cancelar] Automação "${automacaoCancel.nome}" enfileirada para ag. ${ag.id} (${cliente3.telefone})`);
                try { await (await import('./db-plans.js')).incrementWhatsappCount(tokenRow.empresaId); } catch {}
              }
            }
          }
          // Notificar owner sobre cancelamento pelo cliente
          const { notifyOwner } = await import('./_core/notification.js');
          await notifyOwner({
            title: `❌ Cancelamento pelo cliente`,
            content: `Um cliente cancelou o agendamento via link de confirmação.`,
          }).catch(() => {});
        } catch (e) { console.error('[cancelar] Erro ao disparar automação:', e); }
        // Mover cartão no Pipeline
        try {
          const { moverCartaoPorStatusInterno } = await import('./routers/pipeline.js');
          await moverCartaoPorStatusInterno({
            empresaId: tokenRow.empresaId,
            agendamentoId: ag.id,
            clienteId: ag.clienteId ?? undefined,
            novoStatus: 'cancelado',
          });
        } catch (e) { console.error('[Pipeline/cancelar] Erro ao mover cartão:', e); }
        return { resultado: 'cancelado' as const };
      }),
  }),

  // ─── COMISSÕES A PAGAR ────────────────────────────────────────────────────────
  comissoesPagar: router({
    /** Lista comissões com detalhes (nome do profissional, cliente, serviço) */
    list: protectedProcedure
      .input(z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        profissionalId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        const { isAdmin, profId: myProfId } = await resolveAdminContext(ctx, empresa, 'financeiroVer');
        const profId = !isAdmin && myProfId ? myProfId : (input?.profissionalId ?? undefined);
        return getComissoesPagarDetalhadas(empresa.id, profId, input?.dataInicio, input?.dataFim);
      }),
    /** Marca múltiplas comissões como pagas */
    marcarPago: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1),
        dataPagamento: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await requirePermissao(ctx, empresa, 'financeiroMarcarPago');
        await marcarComissoesPagas(input.ids, input.dataPagamento ?? new Date());
        return { success: true };
      }),
  }),

  // ─── MEIOS DE PAGAMENTO ───────────────────────────────────────────────────────
  meiosPagamento: router({
    /** Lista todos os meios de pagamento da empresa com suas taxas por parcela */
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
      return getMeiosPagamentoComTaxas(empresa.id);
    }),
    /** Lista apenas meios ativos (para seletores em formulários) */
    listAtivos: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
      return getMeiosPagamentoComTaxas(empresa.id);
    }),
    /** Cria um novo meio de pagamento */
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1, 'Nome é obrigatório'),
        tipo: z.enum(['pix', 'debito', 'credito', 'dinheiro', 'outro']),
        parcelamentoMaximo: z.number().int().min(1).max(24).default(1),
        taxaFixa: z.string().default('0.00'),
        descontarDoVendedor: z.boolean().default(false),
        descontarDoAtendente: z.boolean().default(false),
        taxasParcela: z.array(z.object({
          parcela: z.number().int().min(1),
          taxa: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await requirePermissao(ctx, empresa, 'configuracoesEditar');
        const { taxasParcela: taxas, ...meioDados } = input;
        const id = await createMeioPagamento({ ...meioDados, empresaId: empresa.id });
        if (taxas && taxas.length > 0) {
          await upsertTaxasParcela(id, taxas);
        }
        return { id };
      }),
    /** Atualiza um meio de pagamento existente */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        tipo: z.enum(['pix', 'debito', 'credito', 'dinheiro', 'outro']).optional(),
        parcelamentoMaximo: z.number().int().min(1).max(24).optional(),
        taxaFixa: z.string().optional(),
        descontarDoVendedor: z.boolean().optional(),
        descontarDoAtendente: z.boolean().optional(),
        ativo: z.boolean().optional(),
        taxasParcela: z.array(z.object({
          parcela: z.number().int().min(1),
          taxa: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await requirePermissao(ctx, empresa, 'configuracoesEditar');
        const { id, taxasParcela: taxas, ...dados } = input;
        await updateMeioPagamento(id, dados);
        if (taxas !== undefined) {
          await upsertTaxasParcela(id, taxas);
        }
        return { success: true };
      }),
    /** Remove um meio de pagamento */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await requirePermissao(ctx, empresa, 'configuracoesEditar');
        await deleteMeioPagamento(input.id);
        return { success: true };
      }),
  }),

  taxasConfig: router({
    /** Lista todas as taxas configuradas da empresa */
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
      return getTaxasConfigByEmpresa(empresa.id);
    }),
    /** Cria uma nova taxa configurada */
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1, 'Nome é obrigatório'),
        valor: z.string(),
        tipo: z.enum(['fixo', 'percentual']).default('fixo'),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const id = await createTaxaConfig({ ...input, empresaId: empresa.id });
        return { id };
      }),
    /** Atualiza uma taxa configurada */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        valor: z.string().optional(),
        tipo: z.enum(['fixo', 'percentual']).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const { id, ...dados } = input;
        await updateTaxaConfig(id, dados);
        return { success: true };
      }),
    /** Remove uma taxa configurada */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await deleteTaxaConfig(input.id);
        return { success: true };
      }),
  }),

  creditos: router({
    /** Retorna o saldo de crédito disponível de um cliente */
    getSaldo: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const saldo = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        return { saldo };
      }),

    /** Registra um crédito manualmente (ex: pagamento a maior) */
    registrar: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        valor: z.number().positive(),
        origem: z.string().optional(),
        agendamentoId: z.number().optional(),
        notificarWhatsApp: z.boolean().optional().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await registrarCreditoCliente({
          clienteId: input.clienteId,
          empresaId: empresa.id,
          valor: input.valor,
          tipo: 'credito',
          origem: input.origem ?? 'Registro manual',
          agendamentoId: input.agendamentoId,
        });
        const novoSaldo = await getSaldoCreditoCliente(input.clienteId, empresa.id);

        // Notificar cliente via automação configurada (SEM hardcode)
        if (input.notificarWhatsApp !== false) {
          try {
            const cliente = await getClienteById(input.clienteId);
            const telefone = cliente?.whatsapp || cliente?.telefone;
            if (cliente && telefone) {
              // Buscar automação configurada para credito_gerado
              const automacaoCredito = await getAutomacaoByEvento(empresa.id, 'credito_gerado');
              if (!automacaoCredito || !automacaoCredito.corpoMensagem) {
                console.log(`[Credito] Nenhuma automação ativa para credito_gerado — envio ignorado (cliente ${input.clienteId})`);
              } else {
                const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                const templateVarsCredito: Record<string, string> = {
                  nome_cliente: cliente.nome || 'Cliente',
                  primeiro_nome: (cliente.nome || 'Cliente').split(' ')[0],
                  valor: fmt(input.valor),
                  saldo_total: fmt(novoSaldo),
                  empresa: empresa.nome ?? 'Estabelecimento',
                  origem: input.origem ?? '',
                };
                const mensagem = processarVariaveisTemplate(automacaoCredito.corpoMensagem, templateVarsCredito);
                const midiaUrlCredito = extrairMidiaUrl(automacaoCredito.flowJson);
                await registrarEnvioAutomacao({
                  empresaId: empresa.id,
                  automacaoId: automacaoCredito.id,
                  automacaoNome: automacaoCredito.nome,
                  clienteId: input.clienteId,
                  clienteNome: cliente.nome,
                  telefone,
                  canal: 'whatsapp',
                  mensagem,
                  status: 'pendente',
                  enviarEm: new Date(),
                  agendamentoId: input.agendamentoId,
                  midiaUrl: midiaUrlCredito ?? undefined,
                });
              }
            }
          } catch (err) {
            // Falha no WhatsApp não deve impedir o registro do crédito
            console.error('[Credito] Erro ao notificar cliente via WhatsApp:', err);
          }
        }

        return { success: true, novoSaldo };
      }),

    /** Usa crédito do cliente para abater em um agendamento */
    usar: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        valor: z.number().positive(),
        agendamentoId: z.number().optional(),
        origem: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const saldoAtual = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        if (saldoAtual < input.valor) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Saldo insuficiente. Disponível: R$${saldoAtual.toFixed(2)}` });
        }
        await registrarCreditoCliente({
          clienteId: input.clienteId,
          empresaId: empresa.id,
          valor: -input.valor,
          tipo: 'uso',
          origem: input.origem ?? 'Uso em agendamento',
          agendamentoId: input.agendamentoId,
        });
        const novoSaldo = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        return { success: true, novoSaldo };
      }),

    /** Registra devolução de crédito em dinheiro */
    devolver: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        valor: z.number().positive(),
        origem: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const saldoAtual = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        if (saldoAtual < input.valor) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Saldo insuficiente. Disponível: R$${saldoAtual.toFixed(2)}` });
        }
        await registrarCreditoCliente({
          clienteId: input.clienteId,
          empresaId: empresa.id,
          valor: -input.valor,
          tipo: 'devolucao',
          origem: input.origem ?? 'Devolução em dinheiro',
        });
        const novoSaldo = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        return { success: true, novoSaldo };
      }),

    /** Retorna o histórico de movimentações de crédito do cliente */
    getHistorico: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        const historico = await getHistoricoCreditoCliente(input.clienteId, empresa.id);
        return historico;
      }),

    /** Retorna mapa clienteId → saldo para toda a empresa (para badge na listagem) */
    listSaldos: protectedProcedure
      .query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        return listSaldosCreditoPorEmpresa(empresa.id);
      }),

    /** Retorna resumo de créditos em aberto da empresa para o módulo financeiro */
    getResumo: protectedProcedure
      .query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        return getResumoCreditosEmpresa(empresa.id);
      }),

    /** Edita uma movimentação de crédito (valor e/ou descrição) */
    editar: protectedProcedure
      .input(z.object({
        id: z.number(),
        clienteId: z.number(),
        valor: z.number().optional(),
        origem: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await editarCreditoCliente(input.id, empresa.id, {
          valor: input.valor,
          origem: input.origem,
        });
        const novoSaldo = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        return { success: true, novoSaldo };
      }),

    /** Remove uma movimentação de crédito */
    remover: protectedProcedure
      .input(z.object({
        id: z.number(),
        clienteId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
        await removerCreditoCliente(input.id, empresa.id);
        const novoSaldo = await getSaldoCreditoCliente(input.clienteId, empresa.id);
        return { success: true, novoSaldo };
      }),
  }),

  /** Router de Pessoas da Reserva */
  reservaPessoas: router({
    /** Lista todas as pessoas vinculadas a um agendamento */
    listar: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ input }) => {
        return getPessoasAgendamento(input.agendamentoId);
      }),

    /** Adiciona uma pessoa a um agendamento */
    adicionar: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        clienteId: z.number(),
        isPrincipal: z.boolean().optional(),
        role: z.enum(['principal', 'acompanhante', 'dependente', 'outro']).optional(),
      }))
      .mutation(async ({ input }) => {
        // Verificar duplicata
        const existentes = await getPessoasAgendamento(input.agendamentoId);
        if (existentes.some(p => p.clienteId === input.clienteId)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta pessoa já está vinculada à reserva.' });
        }
        const id = await adicionarPessoaAgendamento(input);
        return { success: true, id };
      }),

    /** Remove uma pessoa de um agendamento */
    remover: protectedProcedure
      .input(z.object({ id: z.number(), agendamentoId: z.number() }))
      .mutation(async ({ input }) => {
        const pessoas = await getPessoasAgendamento(input.agendamentoId);
        const pessoa = pessoas.find(p => p.id === input.id);
        if (pessoa?.isPrincipal && pessoas.length > 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível remover o contato principal. Defina outro contato principal antes.' });
        }
        await removerPessoaAgendamento(input.id);
        return { success: true };
      }),

    /** Define o contato principal de um agendamento */
    definirPrincipal: protectedProcedure
      .input(z.object({ agendamentoId: z.number(), pessoaId: z.number() }))
      .mutation(async ({ input }) => {
        await definirPrincipalAgendamento(input.agendamentoId, input.pessoaId);
        return { success: true };
      }),

    /** Retorna o contato principal de um agendamento */
    getContatoPrincipal: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ input }) => {
        return getContatoPrincipalAgendamento(input.agendamentoId);
      }),
  }),
});
export type AppRouter = typeof appRouter;
import type { PlanType } from "./plans";
