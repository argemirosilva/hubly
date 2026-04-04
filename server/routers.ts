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
  getBloqueiosByEmpresa, createBloqueio, updateBloqueio,
  getComissoesByEmpresa, createComissao, updateComissao,
  getNotificacoesByDestinatario, createNotificacao, marcarNotificacaoLida, marcarTodasNotificacoesLidas,
  getAutomacoesByEmpresa, createAutomacao, updateAutomacao, deleteAutomacao,
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
  registrarEnvioAutomacao, getHistoricoEnvios,
  getMeiosPagamentoByEmpresa, getMeioPagamentoById, createMeioPagamento, updateMeioPagamento, deleteMeioPagamento,
  getTaxasParcelaByMeio, upsertTaxasParcela, getMeiosPagamentoComTaxas,
  getComissoesPagarDetalhadas, marcarComissoesPagas,
  createAgendamentoItens, getItensByAgendamento, getItensByAgendamentos, deleteItensByAgendamento,
  getPagamentosByAgendamento, addPagamentoAgendamento, removePagamentoAgendamento, updateDescontoAgendamento,
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
import { pacotesRouter } from "./routers/pacotes";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { pacotesClientes, pacotesClientesItens } from "../drizzle/schema";
import { eq, and, sql as drizzleSql } from "drizzle-orm";

/**
 * Processa variáveis de template em mensagens de WhatsApp/automações.
 * Substitui {{variavel}} pelos valores reais do agendamento.
 */
function processarVariaveisTemplate(template: string, vars: {
  nome_cliente?: string;
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
  permField: "agendamentosVerTodos" | "financeiroVerComissoes" | "financeiroVer" | "servicosEditar" | "profissionaisEditar" = "agendamentosVerTodos"
): Promise<{ isAdmin: boolean; profId: number | null }> {
  // Owner OAuth: sempre admin
  if (!ctx.systemUser && ctx.user && empresa.ownerId === ctx.user.id) {
    return { isAdmin: true, profId: null };
  }
  // SystemUser: verificar permissões do grupo (tabela permissoes_grupo via grupoId do profissional)
  if (ctx.systemUser) {
    const perms = await getPermissoesGrupoByProfissional(ctx.systemUser.id);
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
  pacotes: pacotesRouter,

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
        const perms = await getPermissoesGrupoByProfissional(opts.ctx.systemUser.id);
        isAdmin = perms ? (perms as any).agendamentosVerTodos === true : false;
        if (perms) {
          // Extrair apenas os campos booleanos de permissão (sem id, grupoId, timestamps)
          const { id: _id, grupoId: _g, createdAt: _c, updatedAt: _u, ...boolPerms } = perms as any;
          permissoes = boolPerms as Record<string, boolean>;
        } else {
          permissoes = {}; // sem grupo = sem permissões
        }
      }
      return {
        ...opts.ctx.user,
        profissionalId: opts.ctx.systemUser ? opts.ctx.systemUser.id : null,
        isProfissional: opts.ctx.systemUser?.isProfissional ?? false,
        isSystemUser: !!opts.ctx.systemUser,
        isAdmin,
        permissoes, // null = owner (acesso total); objeto = permissões do grupo
      };
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
        })).optional(),
        data: z.string(),
        horaInicio: z.string(),
        horaFim: z.string(),
        valorTotal: z.string(),
        status: z.enum(["pre_agendado", "aguardando_reserva", "agendado", "confirmado"]).default("agendado"),
        observacoes: z.string().optional(),
        observacoesInternas: z.string().optional(),
        comReserva: z.boolean().default(false),
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
        let status = rest.status;
        if (comReserva) {
          const percentual = parseFloat(String(empresa.reservaPercentual)) / 100;
          valorReserva = (parseFloat(rest.valorTotal) * percentual).toFixed(2);
          reservaExpiracaoEm = new Date(Date.now() + (empresa.reservaHorasExpiracao ?? 24) * 60 * 60 * 1000);
          status = "aguardando_reserva";
        }
        const id = await createAgendamento({
          ...rest,
          empresaId: empresa.id,
          status,
          valorReserva,
          reservaExpiracaoEm,
        } as any);

        // ── Criar itens de agendamento (múltiplos serviços) ────────────────────────────────
        if (servicosInput && servicosInput.length > 0) {
          await createAgendamentoItens(servicosInput.map(s => ({
            agendamentoId: id,
            servicoId: s.servicoId,
            valorUnitario: s.valorUnitario,
          })));
        } else {
          // Compatibilidade: criar item com o serviço principal
          await createAgendamentoItens([{
            agendamentoId: id,
            servicoId: rest.servicoId,
            valorUnitario: rest.valorTotal,
          }]);
        }

        // ── Envio automático de confirmação via WhatsApp ────────────────────────────
        try {
          const { waManager } = await import('./whatsapp');
          const waState = waManager.getState();
          if (waState.status === 'connected') {
            // Buscar dados do cliente e profissional para montar a mensagem
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
                nome_cliente: cliente.nome,
                servico: servico?.nome ?? '',
                data: dataFormatada,
                hora: `${rest.horaInicio} – ${rest.horaFim}`,
                profissional: profissional?.nome ?? '',
                empresa: empresa.nome,
                valor: `R$ ${valorServico.toFixed(2).replace('.', ',')}`,
                valor_reserva: valorReservaCalc,
              };
              // Usar template personalizado da empresa se configurado, senão usar mensagem padrão
              const templateConfirmacao = (empresa as any).waMsgConfirmacao;
              const mensagem = templateConfirmacao
                ? processarVariaveisTemplate(templateConfirmacao, templateVars)
                : [
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
              await waManager.sendMessage(telefone, mensagem);
              // Registrar no histórico de envios
              registrarEnvioAutomacao({
                empresaId: empresa.id,
                automacaoNome: 'Confirmação de Agendamento',
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                telefone,
                canal: 'whatsapp',
                mensagem,
                status: 'enviado',
              }).catch(() => {});
              // Incrementar contador de notificações WhatsApp
              try { await (await import('./db-plans')).incrementWhatsappCount(empresa.id); } catch {}
            }
          }
        } catch (e) {
          // Não bloquear o fluxo principal se o WhatsApp falhar
          console.error('[WhatsApp] Erro ao enviar confirmação:', e);
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
        status: z.enum(["pre_agendado", "aguardando_reserva", "agendado", "confirmado", "em_andamento", "concluido", "cancelado", "faltou"]).optional(),
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
        }

        // ── Envio automático de WhatsApp ao confirmar ou cancelar ────────────────
        if (data.status === 'confirmado' || data.status === 'cancelado') {
          try {
            const { waManager } = await import('./whatsapp');
            const waState = waManager.getState();
            if (waState.status === 'connected') {
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
                  // Calcular valor_reserva
                  const percentualReserva2 = parseFloat(String(empresa.reservaPercentual ?? 0)) / 100;
                  const valorServico2 = parseFloat(String(agendamento.valorTotal ?? '0'));
                  const valorReservaCalc2 = percentualReserva2 > 0 ? `R$ ${(valorServico2 * percentualReserva2).toFixed(2).replace('.', ',')}` : '';
                  const templateVars2 = {
                    nome_cliente: cliente.nome,
                    servico: servico?.nome ?? '',
                    data: dataFormatada,
                    hora: `${agendamento.horaInicio} – ${agendamento.horaFim}`,
                    profissional: profissional?.nome ?? '',
                    empresa: empresa.nome,
                    valor: `R$ ${valorServico2.toFixed(2).replace('.', ',')}`,
                    valor_reserva: valorReservaCalc2,
                  };
                  let mensagem: string;
                  if (data.status === 'confirmado') {
                    const templateConf = (empresa as any).waMsgConfirmacao;
                    mensagem = templateConf
                      ? processarVariaveisTemplate(templateConf, templateVars2)
                      : [
                          `✅ *Agendamento Confirmado!*`,
                          ``,
                          `Olá, *${cliente.nome}*! Seu agendamento foi confirmado.`,
                          ``,
                          `📅 *Data:* ${dataFormatada}`,
                          `⏰ *Horário:* ${agendamento.horaInicio} – ${agendamento.horaFim}`,
                          servico ? `✂️ *Serviço:* ${servico.nome}` : null,
                          profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
                          valorReservaCalc2 ? `🔒 *Reserva:* ${valorReservaCalc2}` : null,
                          ``,
                          `_${empresa.nome}_`,
                        ].filter(Boolean).join('\n');
                  } else {
                    const templateCanc = (empresa as any).waMsgCancelamento;
                    mensagem = templateCanc
                      ? processarVariaveisTemplate(templateCanc, templateVars2)
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
                  }
                  await waManager.sendMessage(telefone, mensagem);
                }
              }
            }
          } catch (e) {
            console.error('[WhatsApp] Erro ao enviar atualização de status:', e);
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
  }),

  // ─── BLOQUEIOS ────────────────────────────────────────────────────────────
  bloqueios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
      if (!empresa) return [];
      return getBloqueiosByEmpresa(empresa.id);
    }),
    create: protectedProcedure
      .input(z.object({
        profissionalId: z.number(),
        dataInicio: z.string(),
        horaInicio: z.string(),
        dataFim: z.string(),
        horaFim: z.string(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        const id = await createBloqueio({ ...input, empresaId: empresa.id });
        // Notificar dona
        await createNotificacao({
          empresaId: empresa.id,
          destinatarioId: ctx.user.id,
          tipo: "bloqueio_solicitado",
          titulo: "Nova solicitação de bloqueio",
          mensagem: `Profissional solicitou bloqueio de agenda para ${input.dataInicio}`,
          dadosContexto: { bloqueioId: id, ...input },
        });
        return { id, success: true };
      }),
    aprovar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateBloqueio(input.id, { status: "aprovado", aprovadoPorId: ctx.user.id });
        return { success: true };
      }),
    recusar: protectedProcedure
      .input(z.object({ id: z.number(), motivoRecusa: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateBloqueio(input.id, { status: "recusado", motivoRecusa: input.motivoRecusa, aprovadoPorId: ctx.user.id });
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
      return getNotificacoesByDestinatario(ctx.user.id, empresa.id);
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
      await marcarTodasNotificacoesLidas(ctx.user.id, empresa.id);
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
        tipoGatilho: z.enum(["evento", "data_fixa", "aniversario_mes", "dias_antes_agendamento", "horas_apos_agendamento"]),
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
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        corCalendario: z.string().optional(),
        isProfissional: z.boolean().optional(),
        temAcesso: z.boolean().optional(),
        ativo: z.boolean().optional(),
        senha: z.string().min(6).optional(),
        grupoId: z.number().nullable().optional(),
        percentualComissao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        await requirePermissao(ctx, empresa, 'profissionaisEditar');
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
