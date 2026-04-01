import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getEmpresaByOwnerId, getEmpresaDoUsuario as getEmpresaDoUsuarioDb, createEmpresa, updateEmpresa,
  getProfissionaisByEmpresa, getProfissionalById, createProfissional, updateProfissional,
  getPermissoesByProfissional, updatePermissoes,
  getClientesByEmpresa, getClienteById, createCliente, updateCliente,
  getServicosByEmpresa, createServico, updateServico,
  getAgendamentosByEmpresa, getAgendamentoById, createAgendamento, updateAgendamento,
  getBloqueiosByEmpresa, createBloqueio, updateBloqueio,
  getComissoesByEmpresa, createComissao, updateComissao,
  getNotificacoesByDestinatario, createNotificacao, marcarNotificacaoLida, marcarTodasNotificacoesLidas,
  getAutomacoesByEmpresa, createAutomacao, updateAutomacao, deleteAutomacao,
  getProntuariosByCliente, createProntuario,
  getCoresStatus, upsertCoresStatus,
  getDashboardMetrics,
  getGruposByEmpresa, getGrupoById, createGrupo, updateGrupo, deleteGrupo,
  getPermissoesGrupo, updatePermissoesGrupo,
  getMembrosGrupo, getMembrosEmpresa, addMembroGrupo, removeMembroGrupo, getPermissoesUsuario,
  getConvitesByEmpresa, createConvite, getConviteByToken, updateConvite, getUsersByEmpresa,
  createSystemUser, getSystemUsersByEmpresa, updateSystemUser, deleteSystemUser, resetSystemUserPassword,
} from "./db";
import { storagePut } from "./storage";
import { zanduRouter } from "./routers/zandu";
import { pipelineRouter } from "./routers/pipeline";
import { iaFinanceiroRouter } from "./routers/iaFinanceiro";
import { iaClientesRouter } from "./routers/iaClientes";
import { suporteRouter } from "./routers/suporte";
import { portalRouter } from "./routers/portal";
import { nanoid } from "nanoid";

// Helper para obter empresa do usuário logado
// Delega para o db.ts que trata owner, membro de grupo e fallback admin
async function getEmpresaDoUsuario(userId: number) {
  return getEmpresaDoUsuarioDb(userId);
}

export const appRouter = router({
  system: systemRouter,
  zandu: zanduRouter,
  pipeline: pipelineRouter,
  iaFinanceiro: iaFinanceiroRouter,
  iaClientes: iaClientesRouter,
  suporte: suporteRouter,
  portal: portalRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── EMPRESA ──────────────────────────────────────────────────────────────
  empresa: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getEmpresaByOwnerId(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        tipo: z.enum(["salao", "clinica", "barbearia", "consultorio", "outro"]).default("salao"),
        telefone: z.string().optional(),
        email: z.string().email().optional(),
        endereco: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getEmpresaByOwnerId(ctx.user.id);
        if (existing) throw new Error("Empresa já cadastrada");
        await createEmpresa({ ...input, ownerId: ctx.user.id });
        return { success: true };
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
        autoConfirmarPortal: z.boolean().optional(),
        portalHeaderUrl: z.string().optional(),
        portalMensagemBemVindo: z.string().optional(),
        horaAbertura: z.string().optional(),
        horaFechamento: z.string().optional(),
        diasFuncionamento: z.array(z.number()).optional(),
        intervaloMinutos: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaByOwnerId(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateEmpresa(empresa.id, input as any);
        return { success: true };
      }),
  }),

  // ─── PROFISSIONAIS ────────────────────────────────────────────────────────
  profissionais: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const prof = await getProfissionalById(input.id);
        if (!prof || prof.empresaId !== empresa.id) throw new Error("Profissional não encontrado");
        const perms = await getPermissoesByProfissional(prof.id);
        return { ...prof, permissoes: perms };
      }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        corCalendario: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
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
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        await updateProfissional(id, data);
        return { success: true };
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { profissionalId, ...perms } = input;
        await updatePermissoes(profissionalId, perms);
        return { success: true };
      }),
  }),

  // ─── CLIENTES ─────────────────────────────────────────────────────────────
  clientes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) return [];
      return getClientesByEmpresa(empresa.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const cliente = await getClienteById(input.id);
        if (!cliente || cliente.empresaId !== empresa.id) throw new Error("Cliente não encontrado");
        const pronts = await getProntuariosByCliente(cliente.id);
        return { ...cliente, prontuarios: pronts };
      }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        whatsapp: z.string().optional(),
        cpf: z.string().optional(),
        dataNascimento: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
  }),

  // ─── SERVIÇOS ─────────────────────────────────────────────────────────────
  servicos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) return [];
      return getServicosByEmpresa(empresa.id);
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
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
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
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
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
      }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) return [];
        return getAgendamentosByEmpresa(empresa.id, input?.dataInicio, input?.dataFim);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        return getAgendamentoById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        profissionalId: z.number(),
        servicoId: z.number(),
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { comReserva, ...rest } = input;
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        const updates: Record<string, any> = { ...data };
        if (data.status === "confirmado") updates.confirmadoEm = new Date();
        if (data.status === "concluido") updates.concluidoEm = new Date();
        if (data.reservaPaga) updates.reservaPagaEm = new Date();
        await updateAgendamento(id, updates);
        return { success: true };
      }),
    confirmarReserva: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateAgendamento(input.id, {
          status: "agendado",
          reservaPaga: true,
          reservaPagaEm: new Date(),
        });
        return { success: true };
      }),
  }),

  // ─── BLOQUEIOS ────────────────────────────────────────────────────────────
  bloqueios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateBloqueio(input.id, { status: "aprovado", aprovadoPorId: ctx.user.id });
        return { success: true };
      }),
    recusar: protectedProcedure
      .input(z.object({ id: z.number(), motivoRecusa: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateBloqueio(input.id, { status: "recusado", motivoRecusa: input.motivoRecusa, aprovadoPorId: ctx.user.id });
        return { success: true };
      }),
  }),

  // ─── FINANCEIRO / COMISSÕES ───────────────────────────────────────────────
  financeiro: router({
    comissoes: protectedProcedure
      .input(z.object({ profissionalId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) return [];
        return getComissoesByEmpresa(empresa.id, input?.profissionalId);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await updateComissao(input.id, { paga: true, pagaEm: new Date() });
        return { success: true };
      }),
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) return null;
      return getDashboardMetrics(empresa.id);
    }),
  }),

  // ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────
  notificacoes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");
      await marcarTodasNotificacoesLidas(ctx.user.id, empresa.id);
      return { success: true };
    }),
  }),

  // ─── AUTOMAÇÕES ───────────────────────────────────────────────────────────
  automacoes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const { id, ...data } = input;
        await updateAutomacao(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await deleteAutomacao(input.id);
        return { success: true };
      }),
  }),

  // ─── CORES / CONFIGURAÇÕES ────────────────────────────────────────────────
  configuracoes: router({
    getCores: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        await upsertCoresStatus(empresa.id, input);
        return { success: true };
      }),
  }),

  // ─── GRUPOS DE PERMISSÕES ──────────────────────────────────────────────────
  grupos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
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
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateGrupo(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGrupo(input.id);
        return { success: true };
      }),

    updatePermissoes: protectedProcedure
      .input(z.object({
        grupoId: z.number(),
        permissoes: z.record(z.string(), z.boolean()),
      }))
      .mutation(async ({ input }) => {
        await updatePermissoesGrupo(input.grupoId, input.permissoes as any);
        return { success: true };
      }),

    addMembro: protectedProcedure
      .input(z.object({ grupoId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) throw new Error("Empresa não encontrada");
        const id = await addMembroGrupo(input.grupoId, input.userId, empresa.id, ctx.user.id);
        return { id };
      }),

    removeMembro: protectedProcedure
      .input(z.object({ membroId: z.number() }))
      .mutation(async ({ input }) => {
        await removeMembroGrupo(input.membroId);
        return { success: true };
      }),
  }),

  // ─── USUÁRIOS DA EMPRESA ───────────────────────────────────────────────────
  usuarios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) return [];
      return getUsersByEmpresa(empresa.id);
    }),

    minhasPermissoes: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) return null;
      // Owner tem todas as permissões
      if (empresa.ownerId === ctx.user.id) return { isOwner: true };
      return getPermissoesUsuario(ctx.user.id, empresa.id);
    }),

    convites: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) return [];
        return getConvitesByEmpresa(empresa.id);
      }),

      criar: protectedProcedure
        .input(z.object({
          email: z.string().email(),
          grupoId: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id);
        if (!empresa) return [];
        return getSystemUsersByEmpresa(empresa.id);
      }),
      criar: protectedProcedure
        .input(z.object({
          nome: z.string().min(2),
          email: z.string().email(),
          senha: z.string().min(6),
          grupoId: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id);
          if (!empresa) throw new Error("Empresa não encontrada");
          return createSystemUser({
            empresaId: empresa.id,
            nome: input.nome,
            email: input.email,
            senha: input.senha,
            grupoId: input.grupoId,
            criadoPorId: ctx.user.id,
          });
        }),
      atualizar: protectedProcedure
        .input(z.object({
          id: z.number(),
          nome: z.string().min(2).optional(),
          email: z.string().email().optional(),
          senha: z.string().min(6).optional(),
          grupoId: z.number().nullable().optional(),
          ativo: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          await updateSystemUser(id, data);
          return { success: true };
        }),
      excluir: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deleteSystemUser(input.id);
          return { success: true };
        }),
      resetarSenha: protectedProcedure
        .input(z.object({ id: z.number(), novaSenha: z.string().min(6) }))
        .mutation(async ({ input }) => {
          await resetSystemUserPassword(input.id, input.novaSenha);
          return { success: true };
        }),
    }),
  }),
});
export type AppRouter = typeof appRouter;
