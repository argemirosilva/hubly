import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getEmpresaByOwnerId, getEmpresaDoUsuario as getEmpresaDoUsuarioDb, getEmpresaDoContexto, createEmpresa, updateEmpresa,
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

// Helper para obter empresa do usuário logado
// Suporta tanto usuários OAuth quanto system_users (ID negativo)
async function getEmpresaDoUsuario(userId: number, systemUserEmpresaId?: number | null) {
  return getEmpresaDoContexto(userId, systemUserEmpresaId);
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
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      return {
        ...opts.ctx.user,
        profissionalId: opts.ctx.systemUser?.profissionalId ?? null,
        isSystemUser: !!opts.ctx.systemUser,
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
        email: z.string().email().optional(),
        endereco: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
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
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        corCalendario: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
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
        email: z.string().email().optional(),
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
  }),

  // ─── SERVIÇOS ─────────────────────────────────────────────────────────────
  servicos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        percentualComissao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        percentualComissao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        // Filtro opcional por profissional — usado pelo Dashboard e páginas de profissional
        profissionalId: z.number().nullable().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) return [];
        // Prioridade: filtro explícito do input > profissional vinculado ao system_user
        const profId = input?.profissionalId ?? ctx.systemUser?.profissionalId ?? null;
        return getAgendamentosByEmpresa(empresa.id, input?.dataInicio, input?.dataFim, profId);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
        if (!empresa) throw new Error("Empresa não encontrada");
        // ── Verificar limite de agendamentos do plano ──────────────────────────
        const limitError = await checkAgendamentoLimit(empresa.id);
        if (limitError) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Limite de agendamentos do plano atingido. Faça upgrade para continuar agendando.',
          });
        }
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
              const mensagem = [
                `✅ *Agendamento Confirmado!*`,
                ``,
                `Olá, *${cliente.nome}*!`,
                `Seu agendamento foi confirmado com sucesso.`,
                ``,
                `📅 *Data:* ${dataFormatada}`,
                `⏰ *Horário:* ${rest.horaInicio} – ${rest.horaFim}`,
                servico ? `✂️ *Serviço:* ${servico.nome}` : null,
                profissional ? `👤 *Profissional:* ${profissional.nome}` : null,
                `💰 *Valor:* R$ ${parseFloat(rest.valorTotal).toFixed(2).replace('.', ',')}`,
                ``,
                `_${empresa.nome}_`,
              ].filter(Boolean).join('\n');
              await waManager.sendMessage(telefone, mensagem);
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
                  let mensagem: string;
                  if (data.status === 'confirmado') {
                    mensagem = [
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
                  } else {
                    mensagem = [
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
      .input(z.object({ profissionalId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
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
        // Se o usuário é um system_user vinculado a um profissional, filtrar automaticamente
        const profId = input?.profissionalId ?? ctx.systemUser?.profissionalId ?? null;
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
        // Aceita qualquer valor e filtra no servidor para garantir robustez
        permissoes: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
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
          profissionalId: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const empresa = await getEmpresaDoUsuario(ctx.user.id, ctx.systemUser?.empresaId);
          if (!empresa) throw new Error("Empresa não encontrada");
          return createSystemUser({
            empresaId: empresa.id,
            nome: input.nome,
            email: input.email,
            senha: input.senha,
            grupoId: input.grupoId,
            profissionalId: input.profissionalId,
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
          profissionalId: z.number().nullable().optional(),
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

  // ─── PERFIL DO USUÁRIO ──────────────────────────────────────────────────────────────────────────────────────
  perfil: router({
    getMe: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.systemUser) {
        const db = await getDb();
        if (!db) return null;
        const { systemUsers: suTable } = await import('../drizzle/schema');
        const [su] = await db.select().from(suTable).where(eq(suTable.id, ctx.systemUser.id)).limit(1);
        return su ? { id: su.id, nome: su.nome, email: su.email, avatarUrl: su.avatarUrl ?? null, isSystemUser: true } : null;
      }
      return { id: ctx.user.id, nome: ctx.user.name ?? '', email: ctx.user.email ?? '', avatarUrl: null, isSystemUser: false };
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
        const key = `avatars/system-user-${ctx.systemUser.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const db = await getDb();
        if (!db) throw new Error('DB not available');
        const { systemUsers: suTable } = await import('../drizzle/schema');
        await db.update(suTable).set({ avatarUrl: url }).where(eq(suTable.id, ctx.systemUser.id));
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
        const { systemUsers: suTable } = await import('../drizzle/schema');
        const [su] = await db.select().from(suTable).where(eq(suTable.id, ctx.systemUser.id)).limit(1);
        if (!su) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        const ok = await bcrypt.compare(input.senhaAtual, su.passwordHash);
        if (!ok) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Senha atual incorreta' });
        const hash = await bcrypt.hash(input.novaSenha, 10);
        await db.update(suTable).set({ passwordHash: hash }).where(eq(suTable.id, ctx.systemUser.id));
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
      };
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
          '✅ *Teste Agendei*\n\nSeu WhatsApp está conectado e funcionando corretamente!'
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
});
export type AppRouter = typeof appRouter;
import type { PlanType } from "./plans";
