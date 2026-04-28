/**
 * Router do painel administrativo da Orizontech.
 * Acesso exclusivo para o owner do sistema (OWNER_OPEN_ID).
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { empresas, assinaturas, planos, chamados, chamadoMensagens, baseConhecimento } from "../../drizzle/schema";
import { eq, asc, sql as drizzleSql, ne } from "drizzle-orm";
import { sendPushToEmpresa } from "../pushNotifications";

// ─── Guard: apenas o owner da Orizontech pode acessar ────────────────────────
async function assertOrizontech(userId: number, userOpenId?: string) {
  // Aceitar sessão do Painel Orizontech (cookie orizon_session)
  if (userOpenId === "orizon_admin") return;
  // Aceitar owner do projeto (OWNER_OPEN_ID) ou id=1
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.execute(drizzleSql`SELECT id, openId FROM users WHERE id = ${userId} LIMIT 1`);
  const arr = (rows[0] as unknown as Array<{ id: number; openId: string }>);
  if (!arr?.length) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
  const u = arr[0];
  if (u.openId !== ownerOpenId && u.id !== 1) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à Orizontech" });
  }
}

export const orizontechRouter = router({
  // ─── Métricas gerais ──────────────────────────────────────────────────────
  getMetricas: protectedProcedure.query(async ({ ctx }) => {
    await assertOrizontech(ctx.user.id, ctx.user.openId);
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const totaisRes = await db.execute(drizzleSql`
      SELECT
        COUNT(DISTINCT e.id) as totalEmpresas,
        SUM(CASE WHEN a.status = 'ativa' THEN 1 ELSE 0 END) as ativas,
        SUM(CASE WHEN a.status = 'trial' THEN 1 ELSE 0 END) as trial,
        SUM(CASE WHEN a.status = 'inadimplente' THEN 1 ELSE 0 END) as inadimplentes,
        SUM(CASE WHEN a.status = 'cancelada' THEN 1 ELSE 0 END) as canceladas
      FROM empresas e
      LEFT JOIN assinaturas a ON a.empresaId = e.id
    `);
    const mrrRes = await db.execute(drizzleSql`
      SELECT COALESCE(SUM(p.precoMensal), 0) as mrr
      FROM assinaturas a
      JOIN planos p ON p.id = a.planoId
      WHERE a.status = 'ativa'
    `);
    const chamadosRes = await db.execute(drizzleSql`
      SELECT COUNT(*) as total FROM chamados WHERE status IN ('aberto', 'em_atendimento')
    `);

    const t = ((totaisRes[0] as unknown as unknown[])[0] ?? {}) as Record<string, unknown>;
    const m = ((mrrRes[0] as unknown as unknown[])[0] ?? {}) as Record<string, unknown>;
    const c = ((chamadosRes[0] as unknown as unknown[])[0] ?? {}) as Record<string, unknown>;

    return {
      totalEmpresas: Number(t.totalEmpresas ?? 0),
      ativas: Number(t.ativas ?? 0),
      trial: Number(t.trial ?? 0),
      inadimplentes: Number(t.inadimplentes ?? 0),
      canceladas: Number(t.canceladas ?? 0),
      mrr: Number(m.mrr ?? 0),
      chamadosAbertos: Number(c.total ?? 0),
    };
  }),

  // ─── Empresas / Clientes ──────────────────────────────────────────────────
  listarEmpresas: protectedProcedure
    .input(z.object({
      busca: z.string().optional(),
      status: z.enum(["todas", "trial", "ativa", "inadimplente", "cancelada", "suspensa"]).default("todas"),
      planoId: z.number().optional(),
      pagina: z.number().default(1),
      porPagina: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const offset = (input.pagina - 1) * input.porPagina;

      // Usar Drizzle ORM select com joins
      const allEmpresas = await db.select({
        id: empresas.id,
        nome: empresas.nome,
        email: empresas.email,
        telefone: empresas.telefone,
        tipo: empresas.tipo,
        createdAt: empresas.createdAt,
        assinaturaStatus: assinaturas.status,
        planoNome: planos.nome,
        planoId: planos.id,
        apiWhatsapp: planos.apiWhatsapp,
        zapiAtivo: assinaturas.zapiAtivo,
        zapiInstanceId: assinaturas.zapiInstanceId,
        ciclo: assinaturas.ciclo,
        trialFim: assinaturas.trialFim,
        periodoInicio: assinaturas.periodoInicio,
        periodoFim: assinaturas.periodoFim,
      })
        .from(empresas)
        .leftJoin(assinaturas, eq(assinaturas.empresaId, empresas.id))
        .leftJoin(planos, eq(planos.id, assinaturas.planoId))
        .orderBy(drizzleSql`${empresas.createdAt} DESC`)
        .limit(input.porPagina)
        .offset(offset);

      const countRes = await db.execute(drizzleSql`SELECT COUNT(*) as total FROM empresas`);
      const total = Number(((countRes[0] as unknown as unknown[])[0] as Record<string, unknown>)?.total ?? 0);

      // Filtrar em memória para simplicidade (dataset pequeno de empresas)
      let filtered = allEmpresas;
      if (input.busca) {
        const b = input.busca.toLowerCase();
        filtered = filtered.filter(e =>
          e.nome?.toLowerCase().includes(b) ||
          e.email?.toLowerCase().includes(b) ||
          e.telefone?.includes(b)
        );
      }
      if (input.status !== "todas") filtered = filtered.filter(e => e.assinaturaStatus === input.status);
      if (input.planoId) filtered = filtered.filter(e => e.planoId === input.planoId);

      return { empresas: filtered, total, paginas: Math.ceil(total / input.porPagina) };
    }),

  getEmpresa: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [empresa] = await db.select().from(empresas).where(eq(empresas.id, input.empresaId)).limit(1);
      if (!empresa) return null;
      const [assinatura] = await db.select().from(assinaturas).where(eq(assinaturas.empresaId, input.empresaId)).limit(1);
      const plano = assinatura?.planoId
        ? (await db.select().from(planos).where(eq(planos.id, assinatura.planoId)).limit(1))[0]
        : null;
      return { empresa, assinatura: assinatura ?? null, plano: plano ?? null };
    }),

  // ─── Planos ───────────────────────────────────────────────────────────────
  listarPlanos: protectedProcedure.query(async ({ ctx }) => {
    await assertOrizontech(ctx.user.id, ctx.user.openId);
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(planos).where(eq(planos.ativo, true)).orderBy(asc(planos.ordem));
  }),

  atualizarAssinatura: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      planoId: z.number(),
      status: z.enum(["trial", "ativa", "inadimplente", "cancelada", "suspensa"]),
      ciclo: z.enum(["mensal", "anual"]).optional(),
      trialFim: z.date().optional(),
      periodoFim: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [existing] = await db.select().from(assinaturas).where(eq(assinaturas.empresaId, input.empresaId)).limit(1);
      if (existing) {
        await db.update(assinaturas).set({
          planoId: input.planoId,
          status: input.status,
          ...(input.ciclo ? { ciclo: input.ciclo } : {}),
          ...(input.trialFim ? { trialFim: input.trialFim } : {}),
          ...(input.periodoFim ? { periodoFim: input.periodoFim } : {}),
        }).where(eq(assinaturas.empresaId, input.empresaId));
      } else {
        await db.insert(assinaturas).values({
          empresaId: input.empresaId,
          planoId: input.planoId,
          status: input.status,
          ciclo: input.ciclo ?? "mensal",
          ...(input.trialFim ? { trialFim: input.trialFim } : {}),
          ...(input.periodoFim ? { periodoFim: input.periodoFim } : {}),
        });
      }
      return { ok: true };
    }),

  // ─── Controle de API WhatsApp (interno) ───────────────────────────────────
  atualizarApiWhatsapp: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      zapiInstanceId: z.string().optional(),
      zapiToken: z.string().optional(),
      zapiAtivo: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Se zapiToken vier vazio, preserva o token existente no banco
      const updateData: Record<string, unknown> = {
        zapiInstanceId: input.zapiInstanceId ?? null,
        zapiAtivo: input.zapiAtivo,
      };
      if (input.zapiToken && input.zapiToken.trim() !== '') {
        updateData.zapiToken = input.zapiToken;
      }
      await db.update(assinaturas).set(updateData).where(eq(assinaturas.empresaId, input.empresaId));
      return { ok: true };
    }),

  // ─── Status e Reconexão Z-API por empresa ──────────────────────────────────
  verificarStatusZapi: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select({
        zapiInstanceId: assinaturas.zapiInstanceId,
        zapiToken: assinaturas.zapiToken,
        zapiAtivo: assinaturas.zapiAtivo,
      }).from(assinaturas).where(eq(assinaturas.empresaId, input.empresaId)).limit(1);

      const row = rows[0];
      if (!row?.zapiAtivo || !row?.zapiInstanceId || !row?.zapiToken) {
        return { connected: false, status: 'not_configured', phone: null };
      }

      // Usar o Client-Token global da plataforma
      const clientToken = process.env.ZAPI_CLIENT_TOKEN ?? '';
      const BASE_URL = 'https://api.z-api.io';
      const url = `${BASE_URL}/instances/${row.zapiInstanceId}/token/${row.zapiToken}/status`;
      try {
        const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
        });
        const data = await res.json() as Record<string, unknown>;
        const connected = data?.connected === true;
        const phone = (data?.phone as string) ?? null;
        const status = connected ? 'connected' : ((data?.status as string) ?? 'disconnected');
        return { connected, status, phone };
      } catch {
        return { connected: false, status: 'error', phone: null };
      }
    }),

  reconectarZapi: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select({
        zapiInstanceId: assinaturas.zapiInstanceId,
        zapiToken: assinaturas.zapiToken,
        zapiAtivo: assinaturas.zapiAtivo,
      }).from(assinaturas).where(eq(assinaturas.empresaId, input.empresaId)).limit(1);

      const row = rows[0];
      if (!row?.zapiAtivo || !row?.zapiInstanceId || !row?.zapiToken) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Z-API não configurada para esta empresa' });
      }

      const clientToken = process.env.ZAPI_CLIENT_TOKEN ?? '';
      const BASE_URL = 'https://api.z-api.io';
      const url = `${BASE_URL}/instances/${row.zapiInstanceId}/token/${row.zapiToken}/restart`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
        });
        const data = await res.json() as Record<string, unknown>;
        return { ok: res.ok, message: (data?.message as string) ?? 'Reconexão solicitada' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao reconectar';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
      }
    }),

  // ─── Chamados de Suporte ──────────────────────────────────────────────────
  listarChamados: protectedProcedure
    .input(z.object({
      status: z.enum(["todos", "aberto", "em_atendimento", "aguardando_cliente", "resolvido", "fechado"]).default("todos"),
      prioridade: z.enum(["todas", "baixa", "media", "alta", "critica"]).default("todas"),
      empresaId: z.number().optional(),
      pagina: z.number().default(1),
      porPagina: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const allChamados = await db.select({
        id: chamados.id,
        titulo: chamados.titulo,
        status: chamados.status,
        prioridade: chamados.prioridade,
        empresaId: chamados.empresaId,
        createdAt: chamados.createdAt,
        updatedAt: chamados.updatedAt,
        slaVencidoEm: chamados.slaVencidoEm,
        primeiraRespostaEm: chamados.primeiraRespostaEm,
        resolvidoEm: chamados.resolvidoEm,
        slaHoras: chamados.slaHoras,
        empresaNome: empresas.nome,
      })
        .from(chamados)
        .leftJoin(empresas, eq(empresas.id, chamados.empresaId))
        .orderBy(drizzleSql`CASE ${chamados.prioridade} WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, ${chamados.createdAt} DESC`)
        .limit(input.porPagina)
        .offset((input.pagina - 1) * input.porPagina);

      let filtered = allChamados;
      if (input.status !== "todos") filtered = filtered.filter(c => c.status === input.status);
      if (input.prioridade !== "todas") filtered = filtered.filter(c => c.prioridade === input.prioridade);
      if (input.empresaId) filtered = filtered.filter(c => c.empresaId === input.empresaId);

      return filtered;
    }),

  getChamado: protectedProcedure
    .input(z.object({ chamadoId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [chamado] = await db.select().from(chamados).where(eq(chamados.id, input.chamadoId)).limit(1);
      if (!chamado) throw new TRPCError({ code: "NOT_FOUND" });
      const mensagens = await db.select().from(chamadoMensagens)
        .where(eq(chamadoMensagens.chamadoId, input.chamadoId))
        .orderBy(asc(chamadoMensagens.createdAt));
      const [empresa] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, chamado.empresaId)).limit(1);
      return { chamado, mensagens, empresaNome: empresa?.nome ?? "" };
    }),

  responderChamado: protectedProcedure
    .input(z.object({
      chamadoId: z.number(),
      conteudo: z.string().min(1),
      novoStatus: z.enum(["em_atendimento", "aguardando_cliente", "resolvido", "fechado"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [chamado] = await db.select().from(chamados).where(eq(chamados.id, input.chamadoId)).limit(1);
      if (!chamado) throw new TRPCError({ code: "NOT_FOUND" });

      const agora = new Date();
      const updates: {
        updatedAt: Date;
        primeiraRespostaEm?: Date;
        status?: typeof chamado.status;
        resolvidoEm?: Date;
        fechadoEm?: Date;
      } = { updatedAt: agora };
      if (!chamado.primeiraRespostaEm) updates.primeiraRespostaEm = agora;
      if (input.novoStatus) updates.status = input.novoStatus as typeof chamado.status;
      if (input.novoStatus === "resolvido") updates.resolvidoEm = agora;
      if (input.novoStatus === "fechado") updates.fechadoEm = agora;

      await db.update(chamados).set(updates).where(eq(chamados.id, input.chamadoId));
      await db.insert(chamadoMensagens).values({
        chamadoId: input.chamadoId,
        autorTipo: "agente",
        autorId: ctx.user.id,
        autorNome: ctx.user.name ?? "Suporte Hubly",
        conteudo: input.conteudo,
        lido: false,
      });
      // Disparar push notification para os usuários da empresa
      const statusLabel: Record<string, string> = {
        em_atendimento: "Em atendimento",
        aguardando_cliente: "Aguardando sua resposta",
        resolvido: "Resolvido ✅",
        fechado: "Fechado",
      };
      const statusSuffix = input.novoStatus ? ` · ${statusLabel[input.novoStatus]}` : "";
      sendPushToEmpresa(chamado.empresaId, {
        title: `💬 Suporte: ${chamado.titulo}`,
        body: `${ctx.user.name ?? "Suporte Hubly"}: ${input.conteudo.slice(0, 100)}${input.conteudo.length > 100 ? "..." : ""}${statusSuffix}`,
        tag: `chamado-${input.chamadoId}`,
        url: "/admin/suporte",
        sound: true,
      }).catch(err => console.error("[Push] Erro ao enviar push de chamado:", err));
      return { ok: true };
    }),

  // ─── Base de Conhecimento ─────────────────────────────────────────────────
  listarBaseConhecimento: protectedProcedure.query(async ({ ctx }) => {
    await assertOrizontech(ctx.user.id, ctx.user.openId);
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(baseConhecimento).where(eq(baseConhecimento.ativo, true)).orderBy(asc(baseConhecimento.categoria));
  }),

  criarBaseConhecimento: protectedProcedure
    .input(z.object({
      titulo: z.string().min(1),
      conteudo: z.string().min(1),
      categoria: z.string().default("geral"),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [result] = await db.insert(baseConhecimento).values({
        titulo: input.titulo,
        conteudo: input.conteudo,
        categoria: input.categoria,
        ativo: true,
      });
      return { id: (result as unknown as { insertId: number }).insertId };
    }),

  editarBaseConhecimento: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1),
      conteudo: z.string().min(1),
      categoria: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(baseConhecimento).set({
        titulo: input.titulo,
        conteudo: input.conteudo,
        categoria: input.categoria,
      }).where(eq(baseConhecimento.id, input.id));
      return { ok: true };
    }),

  excluirBaseConhecimento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(baseConhecimento).set({ ativo: false }).where(eq(baseConhecimento.id, input.id));
      return { ok: true };
    }),

  // ─── Excluir Empresa ─────────────────────────────────────────────────────
  excluirEmpresa: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Remover assinatura primeiro (FK)
      await db.execute(drizzleSql`DELETE FROM assinaturas WHERE empresaId = ${input.empresaId}`);
      // Remover a empresa
      await db.execute(drizzleSql`DELETE FROM empresas WHERE id = ${input.empresaId}`);
      return { ok: true };
    }),

  // ─── CRUD Planos ─────────────────────────────────────────────────────────
  listarPlanosCompleto: protectedProcedure.query(async ({ ctx }) => {
    await assertOrizontech(ctx.user.id, ctx.user.openId);
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(planos).orderBy(asc(planos.ordem));
  }),

  criarPlano: protectedProcedure
    .input(z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
      precoMensal: z.number().min(0),
      precoAnual: z.number().min(0),
      limiteUsuarios: z.number().default(3),
      limiteAgendamentosMes: z.number().default(200),
      temAutomacoes: z.boolean().default(true),
      temPipeline: z.boolean().default(false),
      temIaFinanceira: z.boolean().default(false),
      temIaClientes: z.boolean().default(false),
      slaSuporteHoras: z.number().default(48),
      ordem: z.number().default(0),
      stripeProductId: z.string().optional(),
      stripePriceIdMensal: z.string().optional(),
      stripePriceIdAnual: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [result] = await db.insert(planos).values({
        nome: input.nome,
        descricao: input.descricao ?? null,
        precoMensal: String(input.precoMensal),
        precoAnual: String(input.precoAnual),
        limiteUsuarios: input.limiteUsuarios,
        limiteAgendamentosMes: input.limiteAgendamentosMes,
        temAutomacoes: input.temAutomacoes,
        temPipeline: input.temPipeline,
        temIaFinanceira: input.temIaFinanceira,
        temIaClientes: input.temIaClientes,
        slaSuporteHoras: input.slaSuporteHoras,
        ordem: input.ordem,
        ativo: true,
        stripeProductId: input.stripeProductId ?? null,
        stripePriceIdMensal: input.stripePriceIdMensal ?? null,
        stripePriceIdAnual: input.stripePriceIdAnual ?? null,
      });
      return { id: (result as unknown as { insertId: number }).insertId };
    }),

  editarPlano: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1),
      descricao: z.string().optional(),
      precoMensal: z.number().min(0),
      precoAnual: z.number().min(0),
      limiteUsuarios: z.number(),
      limiteAgendamentosMes: z.number(),
      temAutomacoes: z.boolean(),
      temPipeline: z.boolean(),
      temIaFinanceira: z.boolean(),
      temIaClientes: z.boolean(),
      slaSuporteHoras: z.number(),
      ordem: z.number(),
      ativo: z.boolean(),
      stripeProductId: z.string().optional(),
      stripePriceIdMensal: z.string().optional(),
      stripePriceIdAnual: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...rest } = input;
      await db.update(planos).set({
        ...rest,
        precoMensal: String(rest.precoMensal),
        precoAnual: String(rest.precoAnual),
        descricao: rest.descricao ?? null,
        stripeProductId: rest.stripeProductId ?? null,
        stripePriceIdMensal: rest.stripePriceIdMensal ?? null,
        stripePriceIdAnual: rest.stripePriceIdAnual ?? null,
      }).where(eq(planos.id, id));
      return { ok: true };
    }),

  excluirPlano: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertOrizontech(ctx.user.id, ctx.user.openId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(planos).set({ ativo: false }).where(eq(planos.id, input.id));
      return { ok: true };
    }),
});
