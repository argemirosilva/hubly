/**
 * Portal de Agendamento Público
 * Procedures sem autenticação para clientes externos agendarem online.
 */
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  empresas, profissionais, servicos, agendamentos, clientes, bloqueiosAgenda, agendamentoItens,
  profissionalServicos,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkAgendamentoLimit, incrementAgendamentosCount } from "../db-plans";
import { checkAndNotifyUsageLimits } from "../usage-alerts";

// ─── Rate limiting simples em memória ────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 20; // máx por janela

function checkRateLimit(key: string, max = RATE_LIMIT_MAX_REQUESTS): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

// Limpar entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(rateLimitMap)) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

// ─── Helpers internos ────────────────────────────────────────────────────────

/** Retorna a empresa pelo id (dados públicos) */
async function getEmpresaPublicaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    id: empresas.id,
    nome: empresas.nome,
    tipo: empresas.tipo,
    telefone: empresas.telefone,
    email: empresas.email,
    endereco: empresas.endereco,
    logoUrl: empresas.logoUrl,
    corPrimaria: empresas.corPrimaria,
    corSecundaria: empresas.corSecundaria,
    portalAtivo: empresas.portalAtivo,
    portalSlug: empresas.portalSlug,
    portalHeaderUrl: empresas.portalHeaderUrl,
    portalMensagemBemVindo: empresas.portalMensagemBemVindo,
    horaAbertura: empresas.horaAbertura,
    horaFechamento: empresas.horaFechamento,
    diasFuncionamento: empresas.diasFuncionamento,
    intervaloMinutos: empresas.intervaloMinutos,
    autoConfirmarPortal: empresas.autoConfirmarPortal,
    reservaPercentual: empresas.reservaPercentual,
    reservaHorasExpiracao: empresas.reservaHorasExpiracao,
    portalPoliticaCancelamento: empresas.portalPoliticaCancelamento,
    portalCobraSinal: empresas.portalCobraSinal,
  }).from(empresas).where(eq(empresas.id, id)).limit(1);
  return result[0] ?? null;
}

/** Retorna a empresa pelo slug (dados públicos) */
async function getEmpresaPublicaBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    id: empresas.id,
    nome: empresas.nome,
    tipo: empresas.tipo,
    telefone: empresas.telefone,
    email: empresas.email,
    endereco: empresas.endereco,
    logoUrl: empresas.logoUrl,
    corPrimaria: empresas.corPrimaria,
    corSecundaria: empresas.corSecundaria,
    portalAtivo: empresas.portalAtivo,
    portalSlug: empresas.portalSlug,
    portalHeaderUrl: empresas.portalHeaderUrl,
    portalMensagemBemVindo: empresas.portalMensagemBemVindo,
    horaAbertura: empresas.horaAbertura,
    horaFechamento: empresas.horaFechamento,
    diasFuncionamento: empresas.diasFuncionamento,
    intervaloMinutos: empresas.intervaloMinutos,
    autoConfirmarPortal: empresas.autoConfirmarPortal,
    reservaPercentual: empresas.reservaPercentual,
    reservaHorasExpiracao: empresas.reservaHorasExpiracao,
    portalPoliticaCancelamento: empresas.portalPoliticaCancelamento,
    portalCobraSinal: empresas.portalCobraSinal,
  }).from(empresas).where(eq(empresas.portalSlug, slug)).limit(1);
  return result[0] ?? null;
}

/** Gera slots de horário disponíveis para uma data/profissional/serviço */
function gerarSlots(
  horaAbertura: string,
  horaFechamento: string,
  intervaloMinutos: number,
  duracaoMinutos: number,
  ocupados: { horaInicio: string; horaFim: string }[],
): { hora: string; ocupado: boolean }[] {
  const slots: { hora: string; ocupado: boolean }[] = [];
  const [abH, abM] = horaAbertura.split(":").map(Number);
  const [feH, feM] = horaFechamento.split(":").map(Number);
  const aberturaMin = abH * 60 + abM;
  const fechamentoMin = feH * 60 + feM;

  for (let min = aberturaMin; min + duracaoMinutos <= fechamentoMin; min += intervaloMinutos) {
    const fimMin = min + duracaoMinutos;
    const hInicio = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    const hFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;

    const conflito = ocupados.some(oc => {
      const ocInicio = oc.horaInicio.substring(0, 5);
      const ocFim = oc.horaFim.substring(0, 5);
      return hInicio < ocFim && hFim > ocInicio;
    });

    slots.push({ hora: hInicio, ocupado: conflito });
  }
  return slots;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const portalRouter = router({
  /** Dados públicos da empresa para exibir no portal */
  getEmpresa: publicProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      const empresa = await getEmpresaPublicaById(input.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      if (!empresa.portalAtivo) throw new Error("Portal de agendamento não está ativo");
      return empresa;
    }),

  /** Dados públicos da empresa pelo slug (URL amigável) */
  getEmpresaBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const empresa = await getEmpresaPublicaBySlug(input.slug);
      if (!empresa) throw new Error("Empresa não encontrada");
      if (!empresa.portalAtivo) throw new Error("Portal de agendamento não está ativo");
      return empresa;
    }),

  /** Lista de serviços ativos para o portal */
  getServicos: publicProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(servicos)
        .where(and(eq(servicos.empresaId, input.empresaId), eq(servicos.ativo, true)))
        .orderBy(servicos.nome);
    }),

  /** Lista de profissionais ativos para o portal */
  getProfissionais: publicProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: profissionais.id,
        nome: profissionais.nome,
        especialidade: profissionais.especialidade,
        avatarUrl: profissionais.avatarUrl,
      }).from(profissionais)
        .where(and(eq(profissionais.empresaId, input.empresaId), eq(profissionais.ativo, true)))
        .orderBy(profissionais.nome);
    }),

  /** Slots de horário disponíveis para uma data específica */
  getHorariosDisponiveis: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      data: z.string(), // YYYY-MM-DD
      profissionalId: z.number().optional(), // se omitido, retorna por profissional
      servicoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const empresa = await getEmpresaPublicaById(input.empresaId);
      if (!empresa) return [];

      // Verificar se o dia da semana está habilitado (0=Dom, 1=Seg, ..., 6=Sab)
      const [ano, mes, dia] = input.data.split("-").map(Number);
      const diaSemana = new Date(ano, mes - 1, dia).getDay();
      const diasFuncionamento = (empresa.diasFuncionamento as number[]) ?? [1, 2, 3, 4, 5];
      if (!diasFuncionamento.includes(diaSemana)) return [];

      // Buscar duração do serviço
      const servicoResult = await db.select({ duracaoMinutos: servicos.duracaoMinutos })
        .from(servicos).where(eq(servicos.id, input.servicoId)).limit(1);
      const duracaoMinutos = servicoResult[0]?.duracaoMinutos ?? 60;

      const horaAbertura = empresa.horaAbertura ?? "08:00";
      const horaFechamento = empresa.horaFechamento ?? "18:00";
      const intervalo = empresa.intervaloMinutos ?? 30;

      if (input.profissionalId) {
        // Slots para um profissional específico
        const ocupados = await db.select({ horaInicio: agendamentos.horaInicio, horaFim: agendamentos.horaFim })
          .from(agendamentos)
          .where(and(
            eq(agendamentos.empresaId, input.empresaId),
            eq(agendamentos.profissionalId, input.profissionalId),
            sql`DATE(${agendamentos.data}) = ${input.data}`,
            sql`${agendamentos.status} NOT IN ('cancelado', 'faltou')`,
          ));

        // Verificar bloqueios
        const bloqueios = await db.select({ horaInicio: bloqueiosAgenda.horaInicio, horaFim: bloqueiosAgenda.horaFim })
          .from(bloqueiosAgenda)
          .where(and(
            eq(bloqueiosAgenda.profissionalId, input.profissionalId),
            sql`DATE(${bloqueiosAgenda.dataInicio}) <= ${input.data}`,
            sql`DATE(${bloqueiosAgenda.dataFim}) >= ${input.data}`,
            sql`${bloqueiosAgenda.status} = 'aprovado'`,
          ));

        const todosOcupados = [...ocupados, ...bloqueios];
        console.log(`[Portal Slots] profissional=${input.profissionalId} data=${input.data} ocupados=${JSON.stringify(todosOcupados)} slots=${JSON.stringify(gerarSlots(horaAbertura, horaFechamento, intervalo, duracaoMinutos, todosOcupados))}`);
        const slots = gerarSlots(horaAbertura, horaFechamento, intervalo, duracaoMinutos, todosOcupados);
        return [{ profissionalId: input.profissionalId, slots }];
      } else {
        // Slots para todos os profissionais ativos
        const profs = await db.select({ id: profissionais.id })
          .from(profissionais)
          .where(and(eq(profissionais.empresaId, input.empresaId), eq(profissionais.ativo, true)));

        const resultado = await Promise.all(profs.map(async (prof) => {
          const ocupados = await db.select({ horaInicio: agendamentos.horaInicio, horaFim: agendamentos.horaFim })
            .from(agendamentos)
            .where(and(
              eq(agendamentos.empresaId, input.empresaId),
              eq(agendamentos.profissionalId, prof.id),
              sql`DATE(${agendamentos.data}) = ${input.data}`,
              sql`${agendamentos.status} NOT IN ('cancelado', 'faltou')`,
            ));

          // Verificar bloqueios
          const bloqueios = await db.select({ horaInicio: bloqueiosAgenda.horaInicio, horaFim: bloqueiosAgenda.horaFim })
            .from(bloqueiosAgenda)
            .where(and(
              eq(bloqueiosAgenda.profissionalId, prof.id),
              sql`DATE(${bloqueiosAgenda.dataInicio}) <= ${input.data}`,
              sql`DATE(${bloqueiosAgenda.dataFim}) >= ${input.data}`,
              sql`${bloqueiosAgenda.status} = 'aprovado'`,
            ));

          const todosOcupados = [...ocupados, ...bloqueios];
          const slots = gerarSlots(horaAbertura, horaFechamento, intervalo, duracaoMinutos, todosOcupados);
          return { profissionalId: prof.id, slots };
        }));
        return resultado;
      }
    }),

  /**
   * Retorna, para cada data nos próximos 60 dias, se há pelo menos um slot disponível.
   * Usado para desabilitar datas sem disponibilidade no calendário do portal.
   */
  getDatasDisponiveis: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      profissionalId: z.number().optional(),
      servicoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {};

      const empresa = await getEmpresaPublicaById(input.empresaId);
      if (!empresa) return {};

      const diasFuncionamento = (empresa.diasFuncionamento as number[]) ?? [1, 2, 3, 4, 5];
      const horaAbertura = empresa.horaAbertura ?? "08:00";
      const horaFechamento = empresa.horaFechamento ?? "18:00";
      const intervalo = empresa.intervaloMinutos ?? 30;

      // Buscar duração do serviço
      const servicoResult = await db.select({ duracaoMinutos: servicos.duracaoMinutos })
        .from(servicos).where(eq(servicos.id, input.servicoId)).limit(1);
      const duracaoMinutos = servicoResult[0]?.duracaoMinutos ?? 60;

      // Gerar lista de datas dos próximos 60 dias que são dias de funcionamento
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const datas: string[] = [];
      for (let i = 0; i < 60 && datas.length < 45; i++) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() + i);
        if (diasFuncionamento.includes(d.getDay())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          datas.push(`${y}-${m}-${day}`);
        }
      }

      // Para cada data, verificar se há pelo menos 1 slot disponível
      const resultado: Record<string, boolean> = {};

      // Buscar profissionais relevantes
      const profsIds: number[] = [];
      if (input.profissionalId) {
        profsIds.push(input.profissionalId);
      } else {
        const profs = await db.select({ id: profissionais.id })
          .from(profissionais)
          .where(and(eq(profissionais.empresaId, input.empresaId), eq(profissionais.ativo, true)));
        profs.forEach(p => profsIds.push(p.id));
      }

      // Buscar todos os agendamentos e bloqueios de uma vez (otimização)
      const primeiraDt = datas[0];
      const ultimaDt = datas[datas.length - 1];

      const todosAgendamentos = profsIds.length > 0 ? await db.select({
        profissionalId: agendamentos.profissionalId,
        data: agendamentos.data,
        horaInicio: agendamentos.horaInicio,
        horaFim: agendamentos.horaFim,
      }).from(agendamentos).where(and(
        eq(agendamentos.empresaId, input.empresaId),
        sql`${agendamentos.data} >= ${primeiraDt}`,
        sql`${agendamentos.data} <= ${ultimaDt}`,
        sql`${agendamentos.status} NOT IN ('cancelado', 'faltou', 'remarcado')`,
      )) : [];

      const todosBloqueios = profsIds.length > 0 ? await db.select({
        profissionalId: bloqueiosAgenda.profissionalId,
        dataInicio: bloqueiosAgenda.dataInicio,
        dataFim: bloqueiosAgenda.dataFim,
        horaInicio: bloqueiosAgenda.horaInicio,
        horaFim: bloqueiosAgenda.horaFim,
      }).from(bloqueiosAgenda).where(and(
        sql`${bloqueiosAgenda.dataInicio} <= ${ultimaDt}`,
        sql`${bloqueiosAgenda.dataFim} >= ${primeiraDt}`,
        sql`${bloqueiosAgenda.status} = 'aprovado'`,
      )) : [];

      for (const dt of datas) {
        let temSlot = false;
        for (const profId of profsIds) {
          const ocupadosProf = [
            ...todosAgendamentos
              .filter(a => Number(a.profissionalId) === profId && String(a.data).substring(0, 10) === dt)
              .map(a => ({ horaInicio: String(a.horaInicio).substring(0, 5), horaFim: String(a.horaFim).substring(0, 5) })),
            ...todosBloqueios
              .filter(b => Number(b.profissionalId) === profId && String(b.dataInicio).substring(0, 10) <= dt && String(b.dataFim).substring(0, 10) >= dt)
              .map(b => ({ horaInicio: String(b.horaInicio).substring(0, 5), horaFim: String(b.horaFim).substring(0, 5) })),
          ];
          const slots = gerarSlots(horaAbertura, horaFechamento, intervalo, duracaoMinutos, ocupadosProf);
          if (slots.some(s => !s.ocupado)) { temSlot = true; break; }
        }
        resultado[dt] = temSlot;
      }

      return resultado;
    }),

  /** Criar agendamento público (sem autenticação) */
  criarAgendamento: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      servicoId: z.number(),
      servicos: z.array(z.object({
        servicoId: z.number(),
        valorUnitario: z.string(),
      })).optional(),
      profissionalId: z.number().nullable().optional(),
      data: z.string(), // YYYY-MM-DD
      horaInicio: z.string(), // HH:MM
      // Dados do cliente
      clienteNome: z.string().min(2),
      clienteTelefone: z.string().min(8),
      clienteEmail: z.string().email().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limiting por IP
      const ip = ctx.req.headers["x-forwarded-for"] as string || ctx.req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`criar_${ip}`, 10)) {
        throw new Error("Muitas tentativas. Aguarde um momento antes de tentar novamente.");
      }

      const db = await getDb();
      if (!db) throw new Error("Serviço indisponível");

      const empresa = await getEmpresaPublicaById(input.empresaId);
      if (!empresa) throw new Error("Empresa não encontrada");
      if (!empresa.portalAtivo) throw new Error("Portal de agendamento não está ativo");

      // ── Validar que a data não é no passado ────────────────────────────────
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const [ano, mes, dia] = input.data.split("-").map(Number);
      const dataAgendamento = new Date(ano, mes - 1, dia);
      dataAgendamento.setHours(0, 0, 0, 0);
      if (dataAgendamento < hoje) {
        throw new Error("Não é possível agendar em uma data passada.");
      }
      // ── Verificar limite de agendamentos do plano ──────────────────────────
      const limitError = await checkAgendamentoLimit(input.empresaId);
      if (limitError) {
        throw new Error("LIMITE_ATINGIDO: A agenda desta empresa atingiu o limite de agendamentos do mês. Por favor, entre em contato diretamente com o estabelecimento.");
      }
      // Buscar serviço principal para calcular horaFim
      const servicoResult = await db.select().from(servicos)
        .where(and(eq(servicos.id, input.servicoId), eq(servicos.empresaId, input.empresaId))).limit(1);
      const servico = servicoResult[0];
      if (!servico) throw new Error("Serviço não encontrado");

      // Calcular duração total (soma de todos os serviços se múltiplos)
      let duracaoTotal = servico.duracaoMinutos ?? 60;
      let valorTotal = parseFloat(String(servico.valor ?? 0));
      if (input.servicos && input.servicos.length > 1) {
        // Buscar durações de todos os serviços
        const servicosIds = input.servicos.map(s => s.servicoId);
        const servicosData = await db.select({ id: servicos.id, duracaoMinutos: servicos.duracaoMinutos })
          .from(servicos).where(sql`${servicos.id} IN (${sql.join(servicosIds.map(id => sql`${id}`), sql`, `)})`);
        duracaoTotal = servicosData.reduce((acc, s) => acc + (s.duracaoMinutos ?? 60), 0);
        valorTotal = input.servicos.reduce((acc, s) => acc + parseFloat(s.valorUnitario), 0);
      }

      // Calcular horaFim
      const [h, m] = input.horaInicio.split(":").map(Number);
      const fimMin = h * 60 + m + duracaoTotal;
      const horaFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;

      // Verificar conflito de horário (só verifica se profissional foi especificado)
      if (input.profissionalId != null) {
        const conflito = await db.select({ id: agendamentos.id })
          .from(agendamentos)
          .where(and(
            eq(agendamentos.profissionalId, input.profissionalId),
            sql`${agendamentos.data} = ${input.data}`,
            sql`${agendamentos.status} NOT IN ('cancelado', 'faltou')`,
            sql`${agendamentos.horaInicio} < ${horaFim}`,
            sql`${agendamentos.horaFim} > ${input.horaInicio}`,
          )).limit(1);
        if (conflito.length > 0) throw new Error("Horário não disponível. Por favor, escolha outro.");
      }

      // Buscar ou criar cliente pelo telefone
      let clienteId: number;
      const clienteExistente = await db.select({ id: clientes.id })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          eq(clientes.telefone, input.clienteTelefone),
        )).limit(1);

      if (clienteExistente.length > 0) {
        clienteId = clienteExistente[0].id;
      } else {
        const novoCliente = await db.insert(clientes).values({
          empresaId: input.empresaId,
          nome: input.clienteNome,
          telefone: input.clienteTelefone,
          email: input.clienteEmail ?? null,
          ativo: true,
        });
        clienteId = (novoCliente as any)[0]?.insertId ?? (novoCliente as any).insertId;
      }

      // Status: confirmado automaticamente ou pré-agendado
      const status = empresa.autoConfirmarPortal ? "confirmado" : "pre_agendado";

      // Criar agendamento
      const novoAg = await db.insert(agendamentos).values({
        empresaId: input.empresaId,
        clienteId,
        profissionalId: input.profissionalId ?? null,
        servicoId: input.servicoId,
        data: input.data as any,
        horaInicio: input.horaInicio,
        horaFim,
        status,
        valorTotal: String(valorTotal),
        observacoes: input.observacoes ?? null,
      });
      const agendamentoId = (novoAg as any)[0]?.insertId ?? (novoAg as any).insertId;

      // Criar itens de agendamento se múltiplos serviços
      if (input.servicos && input.servicos.length > 0 && agendamentoId) {
        await db.insert(agendamentoItens).values(
          input.servicos.map(s => ({
            agendamentoId,
            servicoId: s.servicoId,
            valorUnitario: s.valorUnitario,
          }))
        );
      }

       // ── Incrementar contador de uso ────────────────────────────────────────
      try {
        await incrementAgendamentosCount(input.empresaId);
        // Verificar e notificar limites de forma assíncrona (não bloqueia a resposta)
        ;(async () => {
          try {
            const { getEmpresaPlan, getOrCreateUsage } = await import('../db-plans');
            const plan = await getEmpresaPlan(input.empresaId);
            const currentUsage = await getOrCreateUsage(input.empresaId);
            await checkAndNotifyUsageLimits({
              empresaId: input.empresaId,
              empresaNome: empresa.nome,
              plan,
              agendamentosCount: currentUsage?.agendamentosCount ?? 0,
              notificacoesWhatsappCount: currentUsage?.notificacoesWhatsappCount ?? 0,
            });
          } catch { /* silencioso */ }
        })();
      } catch {
        // Não bloquear o agendamento por falha no contador
      }
      // ── Notificação push ao dono quando status = pre_agendado ───────────────
      if (status === 'pre_agendado') {
        ;(async () => {
          try {
            const { sendPushToUser } = await import('../pushNotifications');
            const { notifyOwner } = await import('../_core/notification.js');
            // Buscar ownerId da empresa
            const [emp] = await db.select({ ownerId: empresas.ownerId }).from(empresas).where(eq(empresas.id, input.empresaId)).limit(1);
            const dataFormatada = String(input.data).split('-').reverse().join('/');
            const nomeCliente = input.clienteNome;
            const nomeServico = servico.nome ?? 'Serviço';
            const titulo = '📅 Novo pré-agendamento';
            const corpo = `${nomeCliente} agendou ${nomeServico} para ${dataFormatada} às ${input.horaInicio}`;
            if (emp?.ownerId) {
              await sendPushToUser(emp.ownerId, {
                title: titulo,
                body: corpo,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `pre-agendamento-${agendamentoId}`,
                sound: true,
                url: '/admin/pre-agendamentos',
              }).catch(() => {});
            }
            // Notificação in-app (Manus)
            await notifyOwner({ title: titulo, content: corpo }).catch(() => {});
          } catch { /* silencioso — não bloquear resposta */ }
        })();
      }

      return {
        id: agendamentoId,
        status,
        confirmadoAutomaticamente: empresa.autoConfirmarPortal,
        horaFim,
        valorTotal: servico.valor,
      };
    }),
  /** Verifica se a empresa atingiu o limite de agendamentos (para o portal público) */
  getStatusLimite: publicProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      try {
        const limitError = await checkAgendamentoLimit(input.empresaId);
        return {
          bloqueado: !!limitError,
          mensagem: limitError
            ? "Esta agenda atingiu o limite de agendamentos do mês. Por favor, entre em contato diretamente com o estabelecimento."
            : null,
        };
      } catch {
        return { bloqueado: false, mensagem: null };
      }
    }),
  /** Buscar se cliente existe pelo telefone (sem expor dados sensíveis) */
  buscarClientePorTelefone: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      telefone: z.string().min(8),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { encontrado: false, temCpf: false };
      // Normalizar telefone: usar os últimos 8 dígitos para busca flexível
      const telNorm = input.telefone.replace(/[^0-9]/g, "");
      const telSuffix = telNorm.slice(-8); // últimos 8 dígitos
      const result = await db.select({
        id: clientes.id,
        nome: clientes.nome,
        email: clientes.email,
        temCpf: sql<number>`CASE WHEN ${clientes.cpf} IS NOT NULL AND ${clientes.cpf} != '' THEN 1 ELSE 0 END`,
      })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          sql`REPLACE(REPLACE(REPLACE(${clientes.telefone}, '+', ''), '-', ''), ' ', '') LIKE ${`%${telSuffix}`}`,
        )).limit(1);
      if (!result.length) return { encontrado: false, temCpf: false, nome: "", email: "" };
      return {
        encontrado: true,
        temCpf: result[0].temCpf === 1,
        nome: result[0].nome ?? "",
        email: result[0].email ?? "",
      };
    }),

  /** Valida CPF e retorna dados do cliente se correto */
  validarCpfCliente: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      telefone: z.string().min(8),
      cpf: z.string().min(3),
    }))
    .query(async ({ input, ctx }) => {
      // Rate limiting anti brute-force: máx 5 tentativas por minuto por IP
      const ip = ctx.req.headers["x-forwarded-for"] as string || ctx.req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`cpf_${ip}`, 5)) {
        return { valido: false, nome: "", email: "" };
      }
      const db = await getDb();
      if (!db) return { valido: false, nome: "", email: "" };
      const cpfNorm = input.cpf.replace(/[^0-9]/g, "");
      const telNorm = input.telefone.replace(/[^0-9]/g, "");
      const telSuffix = telNorm.slice(-8);
      const result = await db.select({
        id: clientes.id,
        nome: clientes.nome,
        email: clientes.email,
        cpf: clientes.cpf,
      })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          sql`REPLACE(REPLACE(REPLACE(${clientes.telefone}, '+', ''), '-', ''), ' ', '') LIKE ${`%${telSuffix}`}`,
        )).limit(1);
      if (!result.length) return { valido: false, nome: "", email: "" };
      const cliente = result[0];
      const cpfBanco = (cliente.cpf ?? "").replace(/[^0-9]/g, "");
      if (!cpfBanco || cpfNorm !== cpfBanco) {
        return { valido: false, nome: "", email: "" };
      }
      return {
        valido: true,
        nome: cliente.nome ?? "",
        email: cliente.email ?? "",
      };
    }),

  /** Cadastra CPF para cliente que ainda não tem (primeiro acesso) */
  cadastrarCpfCliente: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      telefone: z.string().min(8),
      cpf: z.string().min(3),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false, nome: "", email: "" };
      const cpfNorm = input.cpf.replace(/[^0-9]/g, "");
      const telNorm = input.telefone.replace(/[^0-9]/g, "");
      const telSuffix = telNorm.slice(-8);
      // Buscar cliente pelo telefone
      const result = await db.select({
        id: clientes.id,
        nome: clientes.nome,
        email: clientes.email,
        cpf: clientes.cpf,
      })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          sql`REPLACE(REPLACE(REPLACE(${clientes.telefone}, '+', ''), '-', ''), ' ', '') LIKE ${`%${telSuffix}`}`,
        )).limit(1);
      if (!result.length) return { ok: false, nome: "", email: "" };
      const cliente = result[0];
      // Se já tem CPF, não sobrescrever
      if (cliente.cpf && cliente.cpf.replace(/[^0-9]/g, "")) {
        return { ok: false, nome: "", email: "" };
      }
      // Cadastrar o CPF
      await db.update(clientes)
        .set({ cpf: cpfNorm })
        .where(eq(clientes.id, cliente.id));
      return {
        ok: true,
        nome: cliente.nome ?? "",
        email: cliente.email ?? "",
      };
    }),

  /** Buscar agendamentos de um cliente pelo telefone */
  getMeusAgendamentos: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      telefone: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Busca flexível por telefone (últimos 8 dígitos) — consistente com buscarClientePorTelefone
      const telNorm = input.telefone.replace(/[^0-9]/g, "");
      const telSuffix = telNorm.slice(-8);
      const clienteResult = await db.select({ id: clientes.id })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          sql`REPLACE(REPLACE(REPLACE(${clientes.telefone}, '+', ''), '-', ''), ' ', '') LIKE ${`%${telSuffix}`}`,
        )).limit(1);
      if (!clienteResult.length) return [];

      const clienteId = clienteResult[0].id;
      return db.select({
        id: agendamentos.id,
        data: agendamentos.data,
        horaInicio: agendamentos.horaInicio,
        horaFim: agendamentos.horaFim,
        status: agendamentos.status,
        valorTotal: agendamentos.valorTotal,
        servicoId: agendamentos.servicoId,
        profissionalId: agendamentos.profissionalId,
      }).from(agendamentos)
        .where(and(
          eq(agendamentos.empresaId, input.empresaId),
          eq(agendamentos.clienteId, clienteId),
          sql`${agendamentos.status} NOT IN ('cancelado', 'faltou')`,
        ))
        .orderBy(sql`${agendamentos.data} DESC, ${agendamentos.horaInicio} DESC`)
        .limit(10);
    }),

  /** Lista serviços que um profissional atende (para o novo fluxo profissional→serviço) */
  getServicosPorProfissional: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      profissionalId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Buscar serviços vinculados ao profissional via profissionalServicos
      const vinculados = await db.select({
        id: servicos.id,
        nome: servicos.nome,
        descricao: servicos.descricao,
        valor: servicos.valor,
        duracaoMinutos: servicos.duracaoMinutos,
        cor: servicos.cor,
      })
        .from(servicos)
        .innerJoin(profissionalServicos, eq(profissionalServicos.servicoId, servicos.id))
        .where(and(
          eq(servicos.empresaId, input.empresaId),
          eq(servicos.ativo, true),
          eq(profissionalServicos.profissionalId, input.profissionalId),
        ))
        .orderBy(servicos.nome);

      // Se nenhum vínculo existe, retornar todos os serviços ativos (fallback)
      if (vinculados.length === 0) {
        return db.select({
          id: servicos.id,
          nome: servicos.nome,
          descricao: servicos.descricao,
          valor: servicos.valor,
          duracaoMinutos: servicos.duracaoMinutos,
          cor: servicos.cor,
        }).from(servicos)
          .where(and(eq(servicos.empresaId, input.empresaId), eq(servicos.ativo, true)))
          .orderBy(servicos.nome);
      }
      return vinculados;
    }),

  /** Lista profissionais que atendem um serviço específico */
  getProfissionaisPorServico: publicProcedure
    .input(z.object({
      empresaId: z.number(),
      servicoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Buscar profissionais vinculados ao serviço via profissionalServicos
      const vinculados = await db.select({
        id: profissionais.id,
        nome: profissionais.nome,
        especialidade: profissionais.especialidade,
        avatarUrl: profissionais.avatarUrl,
      })
        .from(profissionais)
        .innerJoin(profissionalServicos, eq(profissionalServicos.profissionalId, profissionais.id))
        .where(and(
          eq(profissionais.empresaId, input.empresaId),
          eq(profissionais.ativo, true),
          eq(profissionalServicos.servicoId, input.servicoId),
        ))
        .orderBy(profissionais.nome);

      // Se nenhum vínculo existe, retornar todos os profissionais ativos (fallback)
      if (vinculados.length === 0) {
        return db.select({
          id: profissionais.id,
          nome: profissionais.nome,
          especialidade: profissionais.especialidade,
          avatarUrl: profissionais.avatarUrl,
        }).from(profissionais)
          .where(and(eq(profissionais.empresaId, input.empresaId), eq(profissionais.ativo, true)))
          .orderBy(profissionais.nome);
      }
      return vinculados;
    }),

  /** Cancelar agendamento pelo cliente (portal público) */
  cancelarAgendamento: publicProcedure
    .input(z.object({
      agendamentoId: z.number(),
      empresaId: z.number(),
      telefone: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Verificar que o agendamento pertence ao cliente
      const telNorm = input.telefone.replace(/[^0-9]/g, "");
      const telSuffix = telNorm.slice(-8);
      const clienteResult = await db.select({ id: clientes.id })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          sql`REPLACE(REPLACE(REPLACE(${clientes.telefone}, '+', ''), '-', ''), ' ', '') LIKE ${`%${telSuffix}`}`,
        )).limit(1);
      if (!clienteResult.length) throw new Error("Cliente não encontrado");

      const clienteId = clienteResult[0].id;

      // Verificar que o agendamento existe, pertence ao cliente e está em status cancelável
      const agResult = await db.select({
        id: agendamentos.id,
        status: agendamentos.status,
        data: agendamentos.data,
      }).from(agendamentos)
        .where(and(
          eq(agendamentos.id, input.agendamentoId),
          eq(agendamentos.empresaId, input.empresaId),
          eq(agendamentos.clienteId, clienteId),
        )).limit(1);

      if (!agResult.length) throw new Error("Agendamento não encontrado");
      const ag = agResult[0];

      // Só pode cancelar se está em status cancelável
      const statusCancelaveis = ['agendado', 'pre_agendado', 'confirmado'];
      if (!statusCancelaveis.includes(ag.status)) {
        throw new Error("Este agendamento não pode ser cancelado");
      }

      // Só pode cancelar agendamentos futuros
      const hoje = new Date().toISOString().split('T')[0];
      if (ag.data < hoje) {
        throw new Error("Não é possível cancelar agendamentos passados");
      }

      // Cancelar
      await db.update(agendamentos)
        .set({ status: 'cancelado' })
        .where(eq(agendamentos.id, input.agendamentoId));

      // ── Notificar admin e profissional via push ──────────────────────────────
      try {
        const { sendPushToUser, sendPushToEmpresa } = await import("../pushNotifications");

        // Buscar dados para a notificação
        const clienteInfo = await db.select({ nome: clientes.nome })
          .from(clientes).where(eq(clientes.id, clienteId)).limit(1);
        const agInfo = await db.select({
          data: agendamentos.data,
          horaInicio: agendamentos.horaInicio,
          profissionalId: agendamentos.profissionalId,
          servicoId: agendamentos.servicoId,
        }).from(agendamentos).where(eq(agendamentos.id, input.agendamentoId)).limit(1);

        const nomeCliente = clienteInfo[0]?.nome ?? "Cliente";
        const dataFormatada = agInfo[0]?.data ? String(agInfo[0].data).substring(0, 10).split('-').reverse().join('/') : "";
        const hora = agInfo[0]?.horaInicio?.substring(0, 5) ?? "";

        // Buscar nome do serviço
        let nomeServico = "Serviço";
        if (agInfo[0]?.servicoId) {
          const servInfo = await db.select({ nome: servicos.nome })
            .from(servicos).where(eq(servicos.id, agInfo[0].servicoId)).limit(1);
          nomeServico = servInfo[0]?.nome ?? "Serviço";
        }

        const pushPayload = {
          title: "❌ Agendamento cancelado",
          body: `${nomeCliente} cancelou ${nomeServico} de ${dataFormatada} às ${hora}`,
          tag: `cancelamento-${input.agendamentoId}`,
          sound: true,
          url: "/admin/agendamentos",
        };

        // Notificar todos os usuários da empresa (admin)
        await sendPushToEmpresa(input.empresaId, pushPayload).catch(() => {});

        // Notificar profissional específico se tiver userId
        if (agInfo[0]?.profissionalId) {
          const profInfo = await db.select({ userId: profissionais.userId })
            .from(profissionais).where(eq(profissionais.id, agInfo[0].profissionalId)).limit(1);
          if (profInfo[0]?.userId) {
            await sendPushToUser(profInfo[0].userId, pushPayload).catch(() => {});
          }
        }
      } catch (e) {
        console.error("[Portal] Erro ao enviar push de cancelamento:", e);
      }

      return { success: true };
    }),
});
