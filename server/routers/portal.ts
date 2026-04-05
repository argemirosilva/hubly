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
): string[] {
  const slots: string[] = [];
  const [abH, abM] = horaAbertura.split(":").map(Number);
  const [feH, feM] = horaFechamento.split(":").map(Number);
  const aberturaMin = abH * 60 + abM;
  const fechamentoMin = feH * 60 + feM;

  for (let min = aberturaMin; min + duracaoMinutos <= fechamentoMin; min += intervaloMinutos) {
    const fimMin = min + duracaoMinutos;
    const hInicio = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    const hFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;

    // Verificar conflito com agendamentos existentes
    const conflito = ocupados.some(oc => {
      const ocInicio = oc.horaInicio.substring(0, 5);
      const ocFim = oc.horaFim.substring(0, 5);
      return hInicio < ocFim && hFim > ocInicio;
    });

    if (!conflito) slots.push(hInicio);
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
            sql`${agendamentos.data} = ${input.data}`,
            sql`${agendamentos.status} NOT IN ('cancelado', 'faltou')`,
          ));

        // Verificar bloqueios
        const bloqueios = await db.select({ horaInicio: bloqueiosAgenda.horaInicio, horaFim: bloqueiosAgenda.horaFim })
          .from(bloqueiosAgenda)
          .where(and(
            eq(bloqueiosAgenda.profissionalId, input.profissionalId),
            sql`${bloqueiosAgenda.dataInicio} <= ${input.data}`,
            sql`${bloqueiosAgenda.dataFim} >= ${input.data}`,
            sql`${bloqueiosAgenda.status} = 'aprovado'`,
          ));

        const todosOcupados = [...ocupados, ...bloqueios];
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
              sql`${agendamentos.data} = ${input.data}`,
              sql`${agendamentos.status} NOT IN ('cancelado', 'faltou')`,
            ));

          // Verificar bloqueios também no modo "qualquer profissional"
          const bloqueios = await db.select({ horaInicio: bloqueiosAgenda.horaInicio, horaFim: bloqueiosAgenda.horaFim })
            .from(bloqueiosAgenda)
            .where(and(
              eq(bloqueiosAgenda.profissionalId, prof.id),
              sql`${bloqueiosAgenda.dataInicio} <= ${input.data}`,
              sql`${bloqueiosAgenda.dataFim} >= ${input.data}`,
              sql`${bloqueiosAgenda.status} = 'aprovado'`,
            ));

          const todosOcupados = [...ocupados, ...bloqueios];
          const slots = gerarSlots(horaAbertura, horaFechamento, intervalo, duracaoMinutos, todosOcupados);
          return { profissionalId: prof.id, slots };
        }));
        return resultado;
      }
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
      profissionalId: z.number(),
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

      // Verificar conflito de horário
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
        profissionalId: input.profissionalId,
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
        temCpf: sql<number>`CASE WHEN ${clientes.cpf} IS NOT NULL AND ${clientes.cpf} != '' THEN 1 ELSE 0 END`,
      })
        .from(clientes)
        .where(and(
          eq(clientes.empresaId, input.empresaId),
          sql`REPLACE(REPLACE(REPLACE(${clientes.telefone}, '+', ''), '-', ''), ' ', '') LIKE ${`%${telSuffix}`}`,
        )).limit(1);
      if (!result.length) return { encontrado: false, temCpf: false };
      return { encontrado: true, temCpf: result[0].temCpf === 1 };
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
});
