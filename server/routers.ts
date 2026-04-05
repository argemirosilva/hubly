import { COOKIE_NAME } from "@shared/const";
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
  getAgendamentosByEmpresa, getAgendamentoById, createAgendamento, updateAgendamento,
  getBloqueiosByEmpresa, createBloqueio, createBloqueioRecorrente, updateBloqueio,
  getComissoesByEmpresa, createComissao, updateComissao,
  getNotificacoesByDestinatario, createNotificacao, marcarNotificacaoLida, marcarTodasNotificacoesLidas,
  getAutomacoesByEmpresa, createAutomacao, updateAutomacao, deleteAutomacao, getAutomacaoByEvento,
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
  getPagamentosByAgendamento, addPagamentoAgendamento, removePagamentoAgendamento, updateDescontoAgendamento,
  getDashboardConfig, saveDashboardConfig,
  deleteAgendamentoCompleto,
} from "./db";
import { storagePut } from "./storage";
import { checkAgendamentoLimit, checkProfissionalLimit, getEmpresaPlan, getOrCreateSubscription, getOrCreateUsage, incrementAgendamentosCount, decrementAgendamentosCount, getSubscriptionData } from "./db-plans";
import { checkAndNotifyUsageLimits } from "./usage-alerts";
import { PLAN_LIMITS, PLAN_PRICES, getAgendamentosUsagePercent } from "./plans";
import { zanduRouter } from "./routers/zandu";
import { pipelineRouter } from "./routers/pipeline";
import { iaFinanceiroRouter } from "./routers/iaFinanceiro";
import { iaClientesRouter } from "./routers/iaClientes";
import { suporteRouter } from "./routers/suporte";
import { portalRouter } from "./routers/portal";
import { importacaoRouter } from "./routers/importacao";
import { pacotesRouter } from "./routers/pacotes";
import { relatoriosRouter } from "./routers/relatorios";
import { onboardingRouter } from "./routers/onboarding";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { pacotesClientes, pacotesClientesItens, historicoEnviosAutomacao, automacoes, clientes } from "../drizzle/schema";
import { eq, and, sql as drizzleSql, desc, gte } from "drizzle-orm";

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
    .replace(/\{\{link_confirmacao\}\}/g, vars.link_confirmacao ?? '');
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

export const appRouter = router({
  system: systemRouter,
  zandu: zanduRouter,
  pipeline: pipelineRouter,
  iaFinanceiro: iaFinanceiroRouter,
  iaClientes: iaClientesRouter,
  suporte: suporteRouter,
  portal: portalRouter,
  importacao: importacaoRouter,
  pacotes: pacotesRouter,
  relatorios: relatoriosRouter,
  onboarding: onboardingRouter,

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
        isAdmin = perms ? (perms as any).agendamentosVerTodos === true : false;
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
        await createEmpresa({ ...input, ownerId: ctx.user.id });
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
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
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
        dataNascimento: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const id = await createCliente({ ...input, empresaId: empresa.id });

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
        dataNascimento: z.string().optional(),
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
        // Caso contrário: admin vê todos (profId=null), profissional vê só os seus
        let profId: number | null;
        if (input?.profissionalId !== undefined) {
          profId = input.profissionalId;
        } else {
          const { profId: resolvedProfId } = await resolveAdminContext(ctx, empresa, "agendamentosVerTodos");
          profId = resolvedProfId;
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
    create: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        profissionalId: z.number(),
        servicoId: z.number(),
        // Lista de serviços adicionais (múltiplos serviços por agendamento)
        servicos: z.array(z.object({
          servicoId: z.number(),
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
        pacoteClienteItemId: z.number().optional(), // vincular sessão de pacote (serviço principal)
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // ── Restrição: profissional sem permissão só pode agendar para si próprio ──
        if (ctx.systemUser?.profissionalId) {
          const { isAdmin } = await resolveAdminContext(ctx, empresa, 'agendamentosVerTodos');
          if (!isAdmin && input.profissionalId !== ctx.systemUser.profissionalId) {
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
        const { comReserva, servicos: servicosInput, ...rest } = input;
        let valorReserva: string | undefined;
        let reservaExpiracaoEm: Date | undefined;
        // statusOriginal = status escolhido pelo usuário (pre_agendado, agendado, etc.)
        // Não sobrescrevemos mais para 'aguardando_reserva' — o status original é mantido
        const statusOriginal = rest.status;
        const status = rest.status;
        if (comReserva) {
          const percentual = parseFloat(String(empresa.reservaPercentual)) / 100;
          valorReserva = (parseFloat(rest.valorTotal) * percentual).toFixed(2);
          reservaExpiracaoEm = new Date(Date.now() + (empresa.reservaHorasExpiracao ?? 24) * 60 * 60 * 1000);
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
          await createAgendamentoItens(servicosInput.map(s => ({
            agendamentoId: id,
            servicoId: s.servicoId,
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
          const [cliente, profissional, servico] = await Promise.all([
            getClienteById(rest.clienteId),
            getProfissionalById(rest.profissionalId),
            (async () => {
              const servicos = await getServicosByEmpresa(empresa.id);
              return servicos.find(s => s.id === rest.servicoId);
            })(),
          ]);
          const telefone = cliente?.whatsapp || cliente?.telefone;
          if (telefone && cliente) {
            const dataFormatada = new Date(rest.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            // Calcular valor_reserva: percentual da empresa × valor do serviço
            const percentualReserva = parseFloat(String(empresa.reservaPercentual ?? 0)) / 100;
            const valorServico = parseFloat(rest.valorTotal ?? '0');
            const valorReservaCalc = percentualReserva > 0 ? `R$ ${(valorServico * percentualReserva).toFixed(2).replace('.', ',')}` : '';
            const templateVars = {
              nome_cliente: cliente.nome || 'Cliente',
              primeiro_nome: (cliente.nome || 'Cliente').split(' ')[0],
              servico: servico?.nome ?? '',
              data: dataFormatada,
              hora: `${rest.horaInicio} – ${rest.horaFim}`,
              profissional: profissional?.nome ?? '',
              empresa: empresa.nome,
              valor: `R$ ${valorServico.toFixed(2).replace('.', ',')}`,
              valor_reserva: valorReservaCalc,
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

            // Mensagem padrão de fallback varia por status
            const mensagemPadraoPreAgendado = [
              `⏳ *Pré-agendamento Recebido!*`,
              ``,
              `Olá, *${cliente.nome}*!`,
              `Recebemos seu pedido de agendamento. Em breve confirmaremos sua disponibilidade.`,
              ``,
              `📅 *Data solicitada:* ${dataFormatada}`,
              `⏰ *Horário:* ${rest.horaInicio} – ${rest.horaFim}`,
              servico ? `✂️ *Serviço:* ${servico.nome}` : null,
              profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
              ``,
              `_${empresa.nome}_`,
            ].filter(Boolean).join('\n');

            const mensagemPadraoCriado = [
              `✅ *Agendamento Confirmado!*`,
              ``,
              `Olá, *${cliente.nome}*!`,
              `Seu agendamento foi confirmado com sucesso.`,
              ``,
              `📅 *Data:* ${dataFormatada}`,
              `⏰ *Horário:* ${rest.horaInicio} – ${rest.horaFim}`,
              servico ? `✂️ *Serviço:* ${servico.nome}` : null,
              profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
              `💰 *Valor:* R$ ${valorServico.toFixed(2).replace('.', ',')}`,
              valorReservaCalc ? `🔒 *Reserva:* ${valorReservaCalc}` : null,
              ``,
              `_${empresa.nome}_`,
            ].filter(Boolean).join('\n');

            const mensagem = automacaoAtiva?.corpoMensagem
              ? processarVariaveisTemplate(automacaoAtiva.corpoMensagem, templateVars)
              : (statusOriginal === 'pre_agendado' ? mensagemPadraoPreAgendado : mensagemPadraoCriado);

            // Enfileirar como pendente — o worker enviará quando o WhatsApp estiver conectado
            const midiaUrlCriado = automacaoAtiva ? extrairMidiaUrl(automacaoAtiva.flowJson) : null;
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
            });
            console.log(`[Fila] Envio enfileirado para ag. ${id} (${statusOriginal}) → ${automacaoAtiva?.nome ?? nomeEventoUsado}`);
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
        status: z.enum(["pre_agendado", "agendado", "confirmado", "em_andamento", "concluido", "cancelado", "faltou"]).optional(),
        data: z.string().optional(),
        horaInicio: z.string().optional(),
        horaFim: z.string().optional(),
        tipoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]).optional(),
        observacoes: z.string().optional(),
        observacoesInternas: z.string().optional(),
        reservaPaga: z.boolean().optional(),
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

          // ── Enfileirar automação para confirmado, cancelado ou concluido ───────────
        if (data.status === 'confirmado' || data.status === 'cancelado' || data.status === 'concluido') {
          try {
            const agendamento = await getAgendamentoById(id);
            if (agendamento) {
              const [cliente, profissional, servico] = await Promise.all([
                getClienteById(agendamento.clienteId),
                getProfissionalById(agendamento.profissionalId),
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
                const templateVars2 = {
                  nome_cliente: cliente.nome,
                  primeiro_nome: cliente.nome.split(' ')[0],
                  servico: servico?.nome ?? '',
                  data: dataFormatada,
                  hora: `${agendamento.horaInicio} – ${agendamento.horaFim}`,
                  profissional: profissional?.nome ?? '',
                  empresa: empresa.nome,
                  valor: `R$ ${valorServico2.toFixed(2).replace('.', ',')}`,
                  valor_reserva: valorReservaCalc2,
                };

                // Determinar evento e mensagem padrão por status
                const eventoStatus = data.status === 'confirmado' ? 'agendamento_confirmado'
                  : data.status === 'cancelado' ? 'agendamento_cancelado'
                  : 'agendamento_concluido';
                const automacaoUsada = await getAutomacaoByEvento(empresa.id, eventoStatus);

                let mensagem: string;
                if (data.status === 'confirmado') {
                  mensagem = automacaoUsada?.corpoMensagem
                    ? processarVariaveisTemplate(automacaoUsada.corpoMensagem, templateVars2)
                    : [
                        `✅ *Agendamento Confirmado!*`,
                        ``,
                        `Olá, *${cliente.nome}*! Seu agendamento foi confirmado.`,
                        ``,
                        `📅 *Data:* ${dataFormatada}`,
                        `⏰ *Horário:* ${agendamento.horaInicio} – ${agendamento.horaFim}`,
                        servico ? `✂️ *Serviço:* ${servico.nome}` : null,
                        profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
                        ``,
                        `_${empresa.nome}_`,
                      ].filter(Boolean).join('\n');
                } else if (data.status === 'cancelado') {
                  mensagem = automacaoUsada?.corpoMensagem
                    ? processarVariaveisTemplate(automacaoUsada.corpoMensagem, templateVars2)
                    : [
                        `❌ *Agendamento Cancelado*`,
                        ``,
                        `Olá, *${cliente.nome}*. Infelizmente seu agendamento foi cancelado.`,
                        ``,
                        `📅 *Data:* ${dataFormatada}`,
                        `⏰ *Horário:* ${agendamento.horaInicio} – ${agendamento.horaFim}`,
                        servico ? `✂️ *Serviço:* ${servico.nome}` : null,
                        ``,
                        `Entre em contato para reagendar.`,
                        `_${empresa.nome}_`,
                      ].filter(Boolean).join('\n');
                } else {
                  // concluido
                  mensagem = automacaoUsada?.corpoMensagem
                    ? processarVariaveisTemplate(automacaoUsada.corpoMensagem, templateVars2)
                    : [
                        `🌟 *Atendimento Concluído!*`,
                        ``,
                        `Olá, *${cliente.nome}*! Seu atendimento foi concluído com sucesso.`,
                        ``,
                        `📅 *Data:* ${dataFormatada}`,
                        servico ? `✂️ *Serviço:* ${servico.nome}` : null,
                        profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
                        ``,
                        `Obrigada pela preferência! Esperamos você em breve. 💖`,
                        `_${empresa.nome}_`,
                      ].filter(Boolean).join('\n');
                }

                // Enfileirar na fila universal (envia imediatamente quando WA conectar)
                const nomeEvento = data.status === 'confirmado' ? 'Confirmação de Agendamento'
                  : data.status === 'cancelado' ? 'Cancelamento de Agendamento'
                  : 'Atendimento Concluído';
                const midiaUrlStatus = automacaoUsada ? extrairMidiaUrl(automacaoUsada.flowJson) : null;
                await registrarEnvioAutomacao({
                  empresaId: empresa.id,
                  agendamentoId: id,
                  automacaoId: automacaoUsada?.id,
                  automacaoNome: automacaoUsada?.nome ?? nomeEvento,
                  clienteId: cliente.id,
                  clienteNome: cliente.nome,
                  telefone,
                  canal: 'whatsapp',
                  mensagem,
                  status: 'pendente',
                  enviarEm: new Date(),
                  midiaUrl: midiaUrlStatus ?? undefined,
                });
                console.log(`[Fila] ${nomeEvento} enfileirado para ag. ${id} (${telefone})`);
                try { await (await import('./db-plans')).incrementWhatsappCount(empresa.id); } catch {}
              }
            }
          } catch (e) {
            console.error('[Fila] Erro ao enfileirar atualização de status:', e);
          }
        }

        return { success: true };
      }),
    confirmarReserva: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateAgendamento(input.id, {
          status: "agendado",
          reservaPaga: true,
          reservaPagaEm: new Date(),
        });
        return { success: true };
      }),
    updateServicos: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        servicoIdPrincipal: z.number(),
        servicos: z.array(z.object({
          servicoId: z.number(),
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
        await updateAgendamento(input.agendamentoId, updates);
        // Substituir os itens
        await deleteItensByAgendamento(input.agendamentoId);
        await createAgendamentoItens(input.servicos.map(s => ({
          agendamentoId: input.agendamentoId,
          servicoId: s.servicoId,
          valorUnitario: s.valorUnitario,
        })));
        return { success: true };
      }),
    updateValores: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        itens: z.array(z.object({
          servicoId: z.number(),
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

    // Atualização em lote de status de agendamentos
    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(100),
        status: z.enum(["agendado", "confirmado", "em_andamento", "concluido", "cancelado", "faltou"]),
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

    // Leitura de comprovante via IA
    lerComprovante: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        imageUrl: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });

        const { invokeLLM } = await import('./_core/llm');
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em leitura de comprovantes de pagamento. Extraia as informações do comprovante e retorne JSON válido.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: input.imageUrl, detail: 'high' },
                },
                {
                  type: 'text',
                  text: 'Analise este comprovante de pagamento e extraia: valor transferido (apenas número decimal, ex: 150.00), data do pagamento (formato YYYY-MM-DD), banco/instituicao de origem, tipo de transferência (PIX, TED, DOC, etc). Retorne JSON com campos: valor (number), data (string), banco (string), tipo (string), valido (boolean indicando se é um comprovante válido).',
                },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'comprovante_info',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  valor: { type: 'number', description: 'Valor transferido' },
                  data: { type: 'string', description: 'Data do pagamento YYYY-MM-DD' },
                  banco: { type: 'string', description: 'Banco ou instituição de origem' },
                  tipo: { type: 'string', description: 'Tipo de transferência' },
                  valido: { type: 'boolean', description: 'Se é um comprovante válido' },
                },
                required: ['valor', 'data', 'banco', 'tipo', 'valido'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        if (!rawContent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'IA não retornou resposta' });
        const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const dados = JSON.parse(contentStr);

        if (!dados.valido) {
          return { sucesso: false, mensagem: 'Imagem não reconhecida como comprovante válido', dados };
        }

        return { sucesso: true, dados };
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
        const taxaMaquininha = (input.tipoPagamento === "cartao_debito" || input.tipoPagamento === "cartao_credito")
          ? valorServico * (parseFloat(String(empresa.taxaMaquininha)) / 100) : 0;
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
    marcarPaga: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateComissao(input.id, { paga: true, pagaEm: new Date() });
        return { success: true };
      }),
    dashboard: protectedProcedure
      .input(z.object({ profissionalId: z.number().nullable().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return null;
        // Admin vê métricas consolidadas; profissional vê apenas as suas
        let profId: number | null;
        if (input?.profissionalId !== undefined) {
          profId = input.profissionalId;
        } else {
          const { profId: resolved } = await resolveAdminContext(ctx, empresa, "financeiroVer");
          profId = resolved;
        }
        return getDashboardMetrics(empresa.id, profId);
      }),
  }),

  // ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────
  notificacoes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      // Determinar se admin ou não-admin para filtrar notificações
      const { isAdmin, profId } = await resolveAdminContext(ctx, empresa, "agendamentosVerTodos");
      const { getNotificacoesByEmpresa } = await import("./db");
      return getNotificacoesByEmpresa(empresa.id, isAdmin ? null : profId);
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
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
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
        diasAntesDepois: z.number().nullable().optional(),
        horaDisparo: z.string().nullable().optional(),
        delayMinutos: z.number().nullable().optional(),
        dataFixaDia: z.number().nullable().optional(),
        dataFixaMes: z.number().nullable().optional(),
        dataFixaHora: z.string().nullable().optional(),
        tituloMensagem: z.string().nullable().optional(),
        canalEnvio: z.enum(["whatsapp", "email", "sms"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        await updateAutomacao(id, data);
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
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { rows: [], total: 0 };
        return getHistoricoEnvios(empresa.id, {
          limit: input.limit,
          offset: input.offset,
          canal: input.canal,
          status: input.status,
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
        status: z.enum(["pendente", "enviado", "falhou", "todos"]).default("todos"),
        periodo: z.enum(["hoje", "semana", "mes", "todos"]).default("todos"),
        tipoAutomacao: z.string().optional(),
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
          if (r.status === 'pendente' && r.enviarEm) {
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

    // Contadores de status (sem filtro de status) para os cards da fila
    getFilaTotais: protectedProcedure
      .input(z.object({
        periodo: z.enum(["hoje", "semana", "mes", "todos"]).default("todos"),
      }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return { pendentes: 0, enviados: 0, falhas: 0 };

        const db = await getDb();
        if (!db) return { pendentes: 0, enviados: 0, falhas: 0 };

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

    reenviarMensagem: protectedProcedure
      .input(z.object({ envioId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

        const envio = await getEnvioById(input.envioId, empresa.id);
        if (!envio) throw new TRPCError({ code: "NOT_FOUND", message: "Envio não encontrado" });
        if (envio.status !== "falhou") throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas envios com falha podem ser reenviados" });

        // Tentar reenviar via WhatsApp
        const { waManager } = await import("./whatsapp");
        const waState = waManager.getState();

        if (waState.status !== "connected" || !envio.telefone || !envio.mensagem) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "WhatsApp não conectado ou dados insuficientes para reenvio" });
        }

        try {
          await waManager.sendMessage(envio.telefone, envio.mensagem);

          // Registrar novo envio bem-sucedido
          await registrarEnvioAutomacao({
            empresaId: empresa.id,
            automacaoId: envio.automacaoId ?? undefined,
            automacaoNome: envio.automacaoNome ? `${envio.automacaoNome} (reenvio)` : "Reenvio manual",
            clienteId: envio.clienteId ?? undefined,
            clienteNome: envio.clienteNome ?? undefined,
            telefone: envio.telefone,
            canal: envio.canal,
            mensagem: envio.mensagem,
            status: "enviado",
          });

          return { success: true };
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

        // Verificar WhatsApp
        const { waManager } = await import("./whatsapp");
        const waState = waManager.getState();
        if (waState.status !== "connected") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "WhatsApp não está conectado. Conecte primeiro em Configurações > WhatsApp." });
        }

        // Enviar
        try {
          const ok = await waManager.sendMessage(telefone, mensagem);
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
          link_confirmacao: "https://exemplo.com/confirmar/teste",
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
        // Filtrar apenas campos booleanos para evitar erro com campos extras do banco (id, grupoId, createdAt, updatedAt)
        const permissoesBooleanas = Object.fromEntries(
          Object.entries(input.permissoes).filter(([, v]) => typeof v === 'boolean')
        ) as Record<string, boolean>;
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
    getStatus: protectedProcedure.query(async () => {
      const { waManager } = await import('./whatsapp');
      const state = waManager.getState();
      return {
        status: state.status,
        phoneNumber: state.phoneNumber,
        connectedAt: state.connectedAt,
        qrDataUrl: state.qrDataUrl,
        nextReconnectAt: state.nextReconnectAt ?? null,
      };
    }),
    getConnectionLog: protectedProcedure.query(async () => {
      const { getDb } = await import('./db');
      const { waConnectionLog } = await import('../drizzle/schema');
      const { desc } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(waConnectionLog).orderBy(desc(waConnectionLog.createdAt)).limit(30);
      return rows;
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
      .mutation(async ({ input }) => {
        const { waManager } = await import('./whatsapp');
        const state = waManager.getState();
        if (state.status !== 'connected') {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'WhatsApp não está conectado' });
        }
        const ok = await waManager.sendMessage(
          input.telefone,
          '✅ *Teste Hubly*\n\nSeu WhatsApp está conectado e funcionando corretamente!'
        );
        return { success: ok };
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
      if (!subscription.stripeCustomerId) {
        throw new Error("Nenhuma assinatura ativa encontrada");
      }
      const { stripe: stripeClient } = await import("./stripe");
      const origin = ctx.req.headers.origin ?? "https://agendei-app.manus.space";
      const session = await stripeClient.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
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
      if (!subscription.stripeSubscriptionId) return null;
      try {
        const { stripe: stripeClient } = await import("./stripe");
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
          items: { data: Array<{ price: { unit_amount: number; currency: string; recurring: { interval: string; interval_count: number } } }> };
        };
        const pm = subAny.default_payment_method;
        return {
          stripeSubId: subAny.id,
          status: subAny.status,
          proximaCobranca: new Date(subAny.current_period_end * 1000),
          inicioPerioodo: new Date(subAny.current_period_start * 1000),
          cancelarAoFinal: subAny.cancel_at_period_end,
          cancelarEm: subAny.cancel_at ? new Date(subAny.cancel_at * 1000) : null,
          metodoPagamento: pm ? {
            tipo: pm.type,
            bandeira: pm.card?.brand ?? null,
            ultimos4: pm.card?.last4 ?? null,
            expMes: pm.card?.exp_month ?? null,
            expAno: pm.card?.exp_year ?? null,
          } : null,
          valorMensal: subAny.items.data[0]?.price?.unit_amount
            ? subAny.items.data[0].price.unit_amount / 100
            : null,
          intervalo: subAny.items.data[0]?.price?.recurring?.interval ?? null,
        };
      } catch {
        return null;
      }
    }),
  }),
  // ─── VÍNCULO PROFISSIONAL-SERVIÇO ──────────────────────────────────────────
  profissionalServicos: router({
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
        const origin = input.origin ?? 'https://agendei-app-bkct9rps.manus.space';
        const link = `${origin}/api/confirmar/${token}`;
        return { token, link };
      }),
    /** Verifica o status de um token de confirmação (para a página pública) */
    verificarToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { status: 'erro' as const };
        const { tokensConfirmacao: tbl } = await import('../drizzle/schema');
        const { isNull, gt: drizzleGt } = await import('drizzle-orm');
        const agora = new Date();
        const [tokenRow] = await db.select()
          .from(tbl)
          .where(and(eq(tbl.token, input.token)))
          .limit(1);
        if (!tokenRow) return { status: 'invalido' as const };
        if (tokenRow.usadoEm) return { status: 'ja_confirmado' as const, usadoEm: tokenRow.usadoEm };
        if (tokenRow.expiresAt < agora) return { status: 'expirado' as const };
        return { status: 'pendente' as const };
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
});
export type AppRouter = typeof appRouter;
import type { PlanType } from "./plans";
