import { and, desc, eq, gte, lte, sql, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, empresas, profissionais, permissoes, clientes, servicos, agendamentos, agendamentoItens, bloqueiosAgenda, comissoes, notificacoes, automacoes, prontuarios, coresStatus, gruposPermissoes, permissoesGrupo, membrosGrupo, convitesUsuario, tiposProfissional, profissionalTipos, categoriasDespesa, contasPagar, contasReceber, historicoEnviosAutomacao, permissoesIndividuais, meiosPagamento, taxasParcela, dashboardConfig, DashboardWidget } from "../drizzle/schema";
import { agendamentoPagamentos, AgendamentoPagamento } from '../drizzle/schema';
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach((field) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    });
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────
export async function getEmpresaByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(empresas).where(eq(empresas.ownerId, ownerId)).limit(1);
  return result[0] ?? null;
}

export async function createEmpresa(data: typeof empresas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(empresas).values(data);
  return result[0];
}

export async function updateEmpresa(id: number, data: Partial<typeof empresas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(empresas).set(data).where(eq(empresas.id, id));
}

// ─── PROFISSIONAIS ────────────────────────────────────────────────────────────
// Retorna todos os profissionais da empresa (inclui os com temAcesso mas sem isProfissional)
export async function getProfissionaisByEmpresa(empresaId: number, apenasAtivos = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(profissionais.empresaId, empresaId)];
  if (apenasAtivos) conditions.push(eq(profissionais.ativo, true));
  return db.select().from(profissionais).where(and(...conditions));
}

// Retorna apenas profissionais marcados como isProfissional=true (para seletores de agendamento)
export async function getProfissionaisParaAgendamento(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profissionais).where(
    and(
      eq(profissionais.empresaId, empresaId),
      eq(profissionais.isProfissional, true),
      eq(profissionais.ativo, true)
    )
  );
}

export async function getProfissionalById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(profissionais).where(eq(profissionais.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createProfissional(data: typeof profissionais.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(profissionais).values(data);
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  // Create default permissions
  await db.insert(permissoes).values({ profissionalId: id });
  return id;
}

export async function updateProfissional(id: number, data: Partial<typeof profissionais.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(profissionais).set(data).where(eq(profissionais.id, id));
}

export async function getPermissoesByProfissional(profissionalId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(permissoes).where(eq(permissoes.profissionalId, profissionalId)).limit(1);
  return result[0] ?? null;
}

export async function updatePermissoes(profissionalId: number, data: Partial<typeof permissoes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(permissoes).set(data).where(eq(permissoes.profissionalId, profissionalId));
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
export async function getClientesByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientes).where(and(eq(clientes.empresaId, empresaId), eq(clientes.ativo, true))).orderBy(clientes.nome);
}

export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createCliente(data: typeof clientes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clientes).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateCliente(id: number, data: Partial<typeof clientes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clientes).set(data).where(eq(clientes.id, id));
}

export async function deleteCliente(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Soft delete: marca como inativo em vez de remover do banco
  await db.update(clientes).set({ ativo: false }).where(eq(clientes.id, id));
}

export async function getClientesByEmpresaAll(empresaId: number) {
  // Retorna todos incluindo inativos (para admin)
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientes).where(eq(clientes.empresaId, empresaId)).orderBy(clientes.nome);
}

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────
export async function getServicosByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(servicos).where(and(eq(servicos.empresaId, empresaId), eq(servicos.ativo, true)));
}

export async function createServico(data: typeof servicos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(servicos).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateServico(id: number, data: Partial<typeof servicos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(servicos).set(data).where(eq(servicos.id, id));
}

// ─── AGENDAMENTOS ─────────────────────────────────────────────────────────────
export async function getAgendamentosByEmpresa(empresaId: number, dataInicio?: string, dataFim?: string, profissionalId?: number | null) {
  try {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(agendamentos.empresaId, empresaId)];
    // Usar DATE() para garantir comparacao correta com coluna DATE no TiDB/MySQL
    if (dataInicio) conditions.push(sql`DATE(${agendamentos.data}) >= DATE(${dataInicio})`);
    if (dataFim) conditions.push(sql`DATE(${agendamentos.data}) <= DATE(${dataFim})`);
    // Filtro por profissional — busca agendamentos onde o profissional é o principal OU aparece em algum item
    let rows;
    const { inArray, or } = await import('drizzle-orm');
    if (profissionalId) {
      // Buscar IDs de agendamentos onde o profissional aparece em algum item
      const agIdsViaItens = await db
        .select({ agendamentoId: agendamentoItens.agendamentoId })
        .from(agendamentoItens)
        .where(eq(agendamentoItens.profissionalId, profissionalId));
      const idsViaItens = agIdsViaItens.map(r => r.agendamentoId).filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
      // Filtro: profissional principal OU aparece em item
      const filtroProfissional = idsViaItens.length > 0
        ? or(eq(agendamentos.profissionalId, profissionalId), inArray(agendamentos.id, idsViaItens))!
        : eq(agendamentos.profissionalId, profissionalId);
      conditions.push(filtroProfissional);
    }
    // ORDER BY data e horaInicio para ordenar agenda por data e hora
    rows = await db.select().from(agendamentos).where(and(...conditions)).orderBy(agendamentos.data, agendamentos.horaInicio);
    if (rows.length === 0) return rows;

    // Enriquecer com servicoNome e itens (múltiplos serviços)
    const agIds = rows.map(r => r.id);

      // Buscar todos os itens de uma vez (incluindo profissionalId, horaInicio e horaFim por item)
      const itensRows = await db
        .select({ agendamentoId: agendamentoItens.agendamentoId, servicoId: agendamentoItens.servicoId, profissionalId: agendamentoItens.profissionalId, horaInicio: agendamentoItens.horaInicio, horaFim: agendamentoItens.horaFim, valorUnitario: agendamentoItens.valorUnitario, servicoNome: servicos.nome })
        .from(agendamentoItens)
        .leftJoin(servicos, eq(agendamentoItens.servicoId, servicos.id))
        .where(inArray(agendamentoItens.agendamentoId, agIds));

      // Buscar nomes dos serviços principais (servicoId da tabela agendamentos)
      const servicoIds = Array.from(new Set(rows.map(r => r.servicoId).filter(Boolean) as number[]));
      const servicosMap: Record<number, string> = {};
      if (servicoIds.length > 0) {
        const sRows = await db.select({ id: servicos.id, nome: servicos.nome }).from(servicos).where(inArray(servicos.id, servicoIds));
        sRows.forEach(s => { servicosMap[s.id] = s.nome; });
      }

      // Agrupar itens por agendamento
      const itensPorAg: Record<number, typeof itensRows> = {};
      itensRows.forEach(item => {
        if (!itensPorAg[item.agendamentoId]) itensPorAg[item.agendamentoId] = [];
        itensPorAg[item.agendamentoId].push(item);
      });

      // Buscar pagamentos de todos os agendamentos de uma vez
      const pagamentosRows = await db
        .select({ agendamentoId: agendamentoPagamentos.agendamentoId, valor: agendamentoPagamentos.valor })
        .from(agendamentoPagamentos)
        .where(inArray(agendamentoPagamentos.agendamentoId, agIds));

      const pagamentosPorAg: Record<number, number> = {};
      pagamentosRows.forEach(p => {
        pagamentosPorAg[p.agendamentoId] = (pagamentosPorAg[p.agendamentoId] ?? 0) + parseFloat(String(p.valor));
      });

    return rows.map(ag => {
      const itens = itensPorAg[ag.id] ?? [];
      let servicoNome: string;
      if (itens.length > 1) {
        servicoNome = itens.map(i => i.servicoNome ?? `Serviço`).join(', ');
      } else if (itens.length === 1) {
        servicoNome = itens[0].servicoNome ?? servicosMap[ag.servicoId ?? 0] ?? '';
      } else {
        servicoNome = servicosMap[ag.servicoId ?? 0] ?? '';
      }
      const totalPago = pagamentosPorAg[ag.id] ?? 0;
      const desconto = parseFloat(String((ag as any).desconto ?? 0));
      const valorTotal = parseFloat(String(ag.valorTotal ?? 0));
      const emAberto = Math.max(0, valorTotal - desconto - totalPago);
      return { ...ag, servicoNome, itens, totalPago, emAberto };
    });
  } catch (error) {
    console.error('[getAgendamentosByEmpresa] Erro:', error);
    throw error;
  }
}

export async function getAgendamentoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agendamentos).where(eq(agendamentos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createAgendamento(data: typeof agendamentos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(agendamentos).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateAgendamento(id: number, data: Partial<typeof agendamentos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(agendamentos).set(data).where(eq(agendamentos.id, id));
}

// ─── ITENS DE AGENDAMENTO (múltiplos serviços) ───────────────────────────────
export async function createAgendamentoItens(itens: (typeof agendamentoItens.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (itens.length === 0) return;
  await db.insert(agendamentoItens).values(itens);
}

export async function getItensByAgendamento(agendamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agendamentoItens).where(eq(agendamentoItens.agendamentoId, agendamentoId));
}

export async function getItensByAgendamentos(agendamentoIds: number[]) {
  const db = await getDb();
  if (!db || agendamentoIds.length === 0) return [];
  const { inArray } = await import('drizzle-orm');
  return db.select().from(agendamentoItens).where(inArray(agendamentoItens.agendamentoId, agendamentoIds));
}

export async function deleteItensByAgendamento(agendamentoId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(agendamentoItens).where(eq(agendamentoItens.agendamentoId, agendamentoId));
}

export async function getAgendamentosExpirados() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agendamentos).where(
    and(
      eq(agendamentos.status, "aguardando_reserva"),
      lte(agendamentos.reservaExpiracaoEm, new Date())
    )
  );
}

// ─── BLOQUEIOS ────────────────────────────────────────────────────────────────
export async function getBloqueiosByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bloqueiosAgenda).where(eq(bloqueiosAgenda.empresaId, empresaId)).orderBy(desc(bloqueiosAgenda.createdAt));
}

export async function createBloqueio(data: typeof bloqueiosAgenda.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(bloqueiosAgenda).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function createBloqueioRecorrente(data: typeof bloqueiosAgenda.$inferInsert & { recorrencia: string; dataFimRecorrencia?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  if (data.recorrencia === "nenhuma" || !data.dataFimRecorrencia) {
    // Sem recorrência: criar apenas um bloqueio
    return createBloqueio(data);
  }

  const bloqueios = [];
  let currentDate = new Date(data.dataInicio);
  const endDate = new Date(data.dataFimRecorrencia);
  const increment = data.recorrencia === "semanal" ? 7 : 30; // dias

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + (data.recorrencia === "semanal" ? 1 : 1)); // duração do bloqueio
    const nextDateStr = nextDate.toISOString().split("T")[0];

    const bloqueioData = {
      ...data,
      dataInicio: dateStr,
      dataFim: nextDateStr,
      recorrencia: "nenhuma", // Cada instância é armazenada como "nenhuma"
      dataFimRecorrencia: undefined,
    };

    const id = await createBloqueio(bloqueioData as any);
    bloqueios.push(id);

    currentDate.setDate(currentDate.getDate() + increment);
  }

  return bloqueios[0]; // Retorna o ID do primeiro bloqueio criado
}

export async function updateBloqueio(id: number, data: Partial<typeof bloqueiosAgenda.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(bloqueiosAgenda).set(data).where(eq(bloqueiosAgenda.id, id));
}

// ─── COMISSÕES ────────────────────────────────────────────────────────────────
export async function getComissoesByEmpresa(empresaId: number, profissionalId?: number, dataInicio?: Date, dataFim?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(comissoes.empresaId, empresaId)];
  if (profissionalId) conditions.push(eq(comissoes.profissionalId, profissionalId));
  if (dataInicio) conditions.push(gte(comissoes.createdAt, dataInicio));
  if (dataFim) conditions.push(lte(comissoes.createdAt, dataFim));
  const rows = await db.select().from(comissoes).where(and(...conditions)).orderBy(desc(comissoes.createdAt));
  if (rows.length === 0) return rows;

  // Enriquecer com servicoNome (via agendamento_itens) e clienteNome (via agendamentos)
  const { inArray } = await import('drizzle-orm');
  const agIds = Array.from(new Set(rows.map(r => r.agendamentoId)));

  // Buscar agendamentos para obter clienteId e servicoId
  const agsRows = await db
    .select({ id: agendamentos.id, clienteId: agendamentos.clienteId, servicoId: agendamentos.servicoId })
    .from(agendamentos)
    .where(inArray(agendamentos.id, agIds));
  const agMap: Record<number, { clienteId: number; servicoId: number | null }> = {};
  agsRows.forEach(a => { agMap[a.id] = { clienteId: a.clienteId, servicoId: a.servicoId }; });

  // Buscar itens de agendamento para obter servicoNome por profissional
  const itensRows = await db
    .select({ agendamentoId: agendamentoItens.agendamentoId, profissionalId: agendamentoItens.profissionalId, servicoNome: servicos.nome })
    .from(agendamentoItens)
    .leftJoin(servicos, eq(agendamentoItens.servicoId, servicos.id))
    .where(inArray(agendamentoItens.agendamentoId, agIds));

  // Buscar clientes
  const clienteIds = Array.from(new Set(agsRows.map(a => a.clienteId)));
  const clientesRows = clienteIds.length > 0
    ? await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).where(inArray(clientes.id, clienteIds))
    : [];
  const clienteMap: Record<number, string> = {};
  clientesRows.forEach(c => { clienteMap[c.id] = c.nome; });

  // Buscar nomes de serviços principais
  const servicoIds = Array.from(new Set(agsRows.map(a => a.servicoId).filter(Boolean) as number[]));
  const servicosMainMap: Record<number, string> = {};
  if (servicoIds.length > 0) {
    const sRows = await db.select({ id: servicos.id, nome: servicos.nome }).from(servicos).where(inArray(servicos.id, servicoIds));
    sRows.forEach(s => { servicosMainMap[s.id] = s.nome; });
  }

  return rows.map(c => {
    // Tentar encontrar o item do agendamento que pertence a este profissional
    const itemDoProf = itensRows.find(it => it.agendamentoId === c.agendamentoId && it.profissionalId === c.profissionalId);
    const ag = agMap[c.agendamentoId];
    const servicoNome = itemDoProf?.servicoNome ?? (ag?.servicoId ? servicosMainMap[ag.servicoId] : null) ?? null;
    const clienteNome = ag ? (clienteMap[ag.clienteId] ?? null) : null;
    return { ...c, servicoNome, clienteNome };
  });
}

export async function createComissao(data: typeof comissoes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(comissoes).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateComissao(id: number, data: Partial<typeof comissoes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(comissoes).set(data).where(eq(comissoes.id, id));
}

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────
export async function getNotificacoesByDestinatario(destinatarioId: number, empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificacoes)
    .where(and(eq(notificacoes.destinatarioId, destinatarioId), eq(notificacoes.empresaId, empresaId)))
    .orderBy(desc(notificacoes.createdAt))
    .limit(50);
}

/**
 * Busca notificações filtradas por papel:
 * - Admin (profissionalId = null): retorna todas da empresa
 * - Não-admin: retorna onde destinatarioId = profissionalId OU destinatarioId IS NULL
 */
export async function getNotificacoesByEmpresa(empresaId: number, profissionalId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  if (!profissionalId) {
    // Admin: todas da empresa, exceto ocultadas
    return db.select().from(notificacoes)
      .where(and(eq(notificacoes.empresaId, empresaId), eq(notificacoes.ocultada, false)))
      .orderBy(desc(notificacoes.createdAt)).limit(50);
  }
  // Não-admin: apenas as suas ou as sem destinatário específico, exceto ocultadas
  return db.select().from(notificacoes)
    .where(and(
      eq(notificacoes.empresaId, empresaId),
      eq(notificacoes.ocultada, false),
      or(eq(notificacoes.destinatarioId, profissionalId), isNull(notificacoes.destinatarioId))
    ))
    .orderBy(desc(notificacoes.createdAt)).limit(50);
}

export async function createNotificacao(data: typeof notificacoes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(notificacoes).values(data);
}

export async function marcarNotificacaoLida(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notificacoes).set({ lida: true, lidaEm: new Date() }).where(eq(notificacoes.id, id));
}

export async function marcarTodasNotificacoesLidas(destinatarioId: number, empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notificacoes).set({ lida: true, lidaEm: new Date() })
    .where(and(eq(notificacoes.destinatarioId, destinatarioId), eq(notificacoes.empresaId, empresaId), eq(notificacoes.lida, false)));
}

export async function ocultarNotificacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notificacoes).set({ ocultada: true, ocultadaEm: new Date() }).where(eq(notificacoes.id, id));
}

export async function ocultarTodasNotificacoes(empresaId: number, profissionalId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (!profissionalId) {
    // Admin: oculta todas da empresa
    await db.update(notificacoes).set({ ocultada: true, ocultadaEm: new Date() })
      .where(and(eq(notificacoes.empresaId, empresaId), eq(notificacoes.ocultada, false)));
  } else {
    // Não-admin: oculta apenas as suas ou sem destinatário
    await db.update(notificacoes).set({ ocultada: true, ocultadaEm: new Date() })
      .where(and(
        eq(notificacoes.empresaId, empresaId),
        eq(notificacoes.ocultada, false),
        or(eq(notificacoes.destinatarioId, profissionalId), isNull(notificacoes.destinatarioId))
      ));
  }
}

// ─── AUTOMAÇÕES ───────────────────────────────────────────────────────────────
export async function getAutomacoesByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automacoes).where(eq(automacoes.empresaId, empresaId));
}

/**
 * Busca a primeira automação ativa de uma empresa para um evento específico.
 * Usado pelo scheduler e pelos handlers de agendamento para obter o corpoMensagem configurado.
 * @param empresaId ID da empresa
 * @param evento Nome do evento (ex: 'agendamento_criado', 'agendamento_confirmado', 'agendamento_cancelado')
 */
export async function getAutomacaoByEvento(empresaId: number, evento: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(automacoes)
    .where(
      and(
        eq(automacoes.empresaId, empresaId),
        eq(automacoes.tipoGatilho, 'evento'),
        eq(automacoes.evento, evento),
        eq(automacoes.ativo, true),
      )
    )
    .limit(1);
  return result ?? null;
}

/**
 * Bug fix 3c: Busca TODAS as automações ativas de uma empresa para um evento específico.
 * Diferente de getAutomacaoByEvento que retorna apenas a primeira.
 */
export async function getAutomacoesByEvento(empresaId: number, evento: string) {
  const db = await getDb();
  if (!db) return [];
  const results = await db
    .select()
    .from(automacoes)
    .where(
      and(
        eq(automacoes.empresaId, empresaId),
        eq(automacoes.tipoGatilho, 'evento'),
        eq(automacoes.evento, evento),
        eq(automacoes.ativo, true),
      )
    );
  return results;
}

/**
 * Busca a primeira automação ativa de uma empresa por tipo de gatilho.
 * Usado pelo scheduler para gatilhos como 'dias_antes_agendamento'.
 * @param empresaId ID da empresa
 * @param tipoGatilho Tipo do gatilho (ex: 'dias_antes_agendamento', 'aniversario_mes')
 */
export async function getAutomacaoByTipoGatilho(empresaId: number, tipoGatilho: string, evento?: string) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [
    eq(automacoes.empresaId, empresaId),
    eq(automacoes.tipoGatilho, tipoGatilho as any),
    eq(automacoes.ativo, true),
  ];
  if (evento) conditions.push(eq(automacoes.evento, evento));
  const [result] = await db
    .select()
    .from(automacoes)
    .where(and(...conditions))
    .limit(1);
  return result ?? null;
}

export async function createAutomacao(data: typeof automacoes.$inferInsert & { flowJson?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(automacoes).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function deleteAutomacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  await db.delete(automacoes).where(eq(automacoes.id, id));
}

export async function updateAutomacao(id: number, data: Partial<typeof automacoes.$inferInsert> & { flowJson?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(automacoes).set(data).where(eq(automacoes.id, id));
}

// ─── PRONTUÁRIOS ──────────────────────────────────────────────────────────────
export async function getProntuariosByCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(prontuarios).where(eq(prontuarios.clienteId, clienteId)).orderBy(desc(prontuarios.createdAt));
}

export async function createProntuario(data: typeof prontuarios.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(prontuarios).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

// ─── CORES STATUS ─────────────────────────────────────────────────────────────
export async function getCoresStatus(empresaId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(coresStatus).where(eq(coresStatus.empresaId, empresaId)).limit(1);
  return result[0] ?? null;
}

export async function upsertCoresStatus(empresaId: number, data: Partial<typeof coresStatus.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(coresStatus).values({ empresaId, ...data } as any)
    .onDuplicateKeyUpdate({ set: data });
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export async function getDashboardMetrics(empresaId: number, profissionalId?: number | null) {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0];
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0];
  const hojeStr = hoje.toISOString().split('T')[0];

  // Filtros base — quando profissionalId fornecido, restringe ao profissional
  // Status financeiramente válidos (excluir cancelados, bloqueios e excluídos)
  const statusFinanceiroValido = sql`${agendamentos.status} NOT IN ('cancelado', 'ocupado', 'excluido')`;

  const filtroHoje = profissionalId
    ? and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.profissionalId, profissionalId), sql`${agendamentos.data} = ${hojeStr}`, statusFinanceiroValido)
    : and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} = ${hojeStr}`, statusFinanceiroValido);
  const filtroMes = profissionalId
    ? and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.profissionalId, profissionalId), sql`${agendamentos.data} >= ${inicioMes}`, sql`${agendamentos.data} <= ${fimMes}`, statusFinanceiroValido)
    : and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} >= ${inicioMes}`, sql`${agendamentos.data} <= ${fimMes}`, statusFinanceiroValido);
  const filtroMesAnterior = profissionalId
    ? and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.profissionalId, profissionalId), sql`${agendamentos.data} >= ${inicioMesAnterior}`, sql`${agendamentos.data} <= ${fimMesAnterior}`, statusFinanceiroValido)
    : and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} >= ${inicioMesAnterior}`, sql`${agendamentos.data} <= ${fimMesAnterior}`, statusFinanceiroValido);
  const filtroComissoes = profissionalId
    ? and(eq(comissoes.empresaId, empresaId), eq(comissoes.profissionalId, profissionalId), gte(comissoes.createdAt, new Date(inicioMes)))
    : and(eq(comissoes.empresaId, empresaId), gte(comissoes.createdAt, new Date(inicioMes)));

  const [agendamentosHoje, agendamentosMes, agendamentosMesAnterior, totalClientesEmpresa, comissoesMes] = await Promise.all([
    db.select().from(agendamentos).where(filtroHoje),
    db.select().from(agendamentos).where(filtroMes),
    db.select().from(agendamentos).where(filtroMesAnterior),
    // Total de clientes da empresa (para admin); profissional calcula clientes únicos a partir dos agendamentos
    db.select({ count: sql<number>`count(*)` }).from(clientes).where(and(eq(clientes.empresaId, empresaId), eq(clientes.ativo, true))),
    db.select().from(comissoes).where(filtroComissoes),
  ]);

  const receitaMes = agendamentosMes.filter(a => a.status === 'concluido').reduce((sum, a) => sum + parseFloat(String(a.valorTotal)), 0);
  const receitaMesAnterior = agendamentosMesAnterior.filter(a => a.status === 'concluido').reduce((sum, a) => sum + parseFloat(String(a.valorTotal)), 0);
  const ticketMedio = agendamentosMes.filter(a => a.status === 'concluido').length > 0
    ? receitaMes / agendamentosMes.filter(a => a.status === 'concluido').length : 0;

  // Clientes únicos atendidos no mês pelo profissional (ou total da empresa para admin)
  const clientesUnicosMes = profissionalId
    ? new Set(agendamentosMes.map(a => a.clienteId)).size
    : (totalClientesEmpresa[0]?.count ?? 0);

  // Comissões pendentes em valor monetário (não quantidade)
  const comissoesPendentesValor = comissoesMes
    .filter(c => !c.paga)
    .reduce((sum, c) => sum + parseFloat(String(c.valorComissao ?? 0)), 0);

  return {
    agendamentosHoje: agendamentosHoje.length,
    agendamentosMes: agendamentosMes.length,
    receitaMes,
    receitaMesAnterior,
    ticketMedio,
    totalClientes: clientesUnicosMes,
    comissoesPendentes: comissoesPendentesValor,
    taxaConversao: agendamentosMes.length > 0
      ? Math.round((agendamentosMes.filter(a => a.status === 'concluido').length / agendamentosMes.length) * 100) : 0,
    // Indica se os dados estão filtrados por profissional
    filtradoPorProfissional: !!profissionalId,
  };
}

// ─── GRUPOS DE PERMISSÕES ─────────────────────────────────────────────────────
export async function getGruposByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gruposPermissoes).where(eq(gruposPermissoes.empresaId, empresaId));
}

export async function getGrupoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gruposPermissoes).where(eq(gruposPermissoes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createGrupo(data: typeof gruposPermissoes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(gruposPermissoes).values(data);
  const grupoId = (result as any).insertId as number;
  // Criar permissões padrão (todas false)
  await db.insert(permissoesGrupo).values({ grupoId });
  return grupoId;
}

export async function updateGrupo(id: number, data: Partial<typeof gruposPermissoes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gruposPermissoes).set(data).where(eq(gruposPermissoes.id, id));
}

export async function deleteGrupo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(membrosGrupo).where(eq(membrosGrupo.grupoId, id));
  await db.delete(permissoesGrupo).where(eq(permissoesGrupo.grupoId, id));
  await db.delete(gruposPermissoes).where(eq(gruposPermissoes.id, id));
}

// ─── PERMISSÕES DO GRUPO ──────────────────────────────────────────────────────
/**
 * Busca as permissões do grupo ao qual o profissional pertence.
 * Retorna permissoes_grupo se o profissional tem grupoId, null caso contrário.
 */
export async function getPermissoesGrupoByProfissional(profissionalId: number) {
  const db = await getDb();
  if (!db) return null;
  // Buscar o grupoId do profissional
  const [prof] = await db.select({ grupoId: profissionais.grupoId })
    .from(profissionais).where(eq(profissionais.id, profissionalId)).limit(1);
  if (!prof || !prof.grupoId) return null;
  // Verificar se o grupo é isAdmin (supergrupo) — bypass total de permissões
  const [grupoInfo] = await db.select({ isAdmin: gruposPermissoes.isAdmin })
    .from(gruposPermissoes).where(eq(gruposPermissoes.id, prof.grupoId)).limit(1);
  if (grupoInfo?.isAdmin) {
    // Retornar objeto com todas as permissões como true (bypass total)
    const allTrue: Record<string, boolean | number | string> = {};
    const cols = await db.select().from(permissoesGrupo).limit(1);
    const sample = cols[0];
    if (sample) {
      const escopoFields = ['notificacoesEscopo', 'agendaEscopo', 'calendarioEscopo'];
      for (const key of Object.keys(sample)) {
        if (key === 'id' || key === 'grupoId' || key === 'createdAt' || key === 'updatedAt') continue;
        allTrue[key] = escopoFields.includes(key) ? 'todos' : true;
      }
    }
    allTrue.__grupoIsAdmin = true;
    return allTrue as any;
  }
  // Buscar as permissões do grupo
  const grupoResult = await db.select().from(permissoesGrupo).where(eq(permissoesGrupo.grupoId, prof.grupoId)).limit(1);
  const grupoPerms = grupoResult[0] ?? null;
  // Buscar permissões individuais (override)
  const indivResult = await db.select().from(permissoesIndividuais).where(eq(permissoesIndividuais.profissionalId, profissionalId)).limit(1);
  const indivPerms = indivResult[0] ?? null;
  // Se não há permissões de grupo, retornar individuais ou null
  if (!grupoPerms) return indivPerms;
  // Se não há permissões individuais, retornar grupo
  if (!indivPerms) return grupoPerms;
  // Merge: individual tem prioridade sobre grupo (null = herda do grupo)
  const merged = { ...grupoPerms };
  for (const key of Object.keys(indivPerms) as (keyof typeof indivPerms)[]) {
    if (key === 'id' || key === 'profissionalId' || key === 'createdAt' || key === 'updatedAt') continue;
    const val = indivPerms[key];
    if (val !== null && val !== undefined) {
      (merged as any)[key] = val;
    }
  }
  return merged;
}

export async function getPermissoesGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(permissoesGrupo).where(eq(permissoesGrupo.grupoId, grupoId)).limit(1);
  return result[0] ?? null;
}

export async function updatePermissoesGrupo(grupoId: number, data: Partial<typeof permissoesGrupo.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const exists = await db.select({ id: permissoesGrupo.id }).from(permissoesGrupo).where(eq(permissoesGrupo.grupoId, grupoId)).limit(1);
  if (exists.length === 0) {
    await db.insert(permissoesGrupo).values({ grupoId, ...data });
  } else {
    await db.update(permissoesGrupo).set(data).where(eq(permissoesGrupo.grupoId, grupoId));
  }
}

// ─── PERMISSÕES INDIVIDUAIS ──────────────────────────────────────────────────
export async function getPermissoesIndividuais(profissionalId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(permissoesIndividuais).where(eq(permissoesIndividuais.profissionalId, profissionalId)).limit(1);
  return result[0] ?? null;
}

export async function updatePermissoesIndividuais(profissionalId: number, data: Partial<typeof permissoesIndividuais.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const exists = await db.select({ id: permissoesIndividuais.id }).from(permissoesIndividuais).where(eq(permissoesIndividuais.profissionalId, profissionalId)).limit(1);
  if (exists.length === 0) {
    await db.insert(permissoesIndividuais).values({ profissionalId, ...data });
  } else {
    await db.update(permissoesIndividuais).set(data).where(eq(permissoesIndividuais.profissionalId, profissionalId));
  }
}

export async function deletePermissoesIndividuais(profissionalId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(permissoesIndividuais).where(eq(permissoesIndividuais.profissionalId, profissionalId));
}

// ─── MEMBROS DO GRUPO ─────────────────────────────────────────────────────────
export async function getMembrosGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: membrosGrupo.id,
    userId: membrosGrupo.userId,
    grupoId: membrosGrupo.grupoId,
    createdAt: membrosGrupo.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(membrosGrupo)
    .leftJoin(users, eq(membrosGrupo.userId, users.id))
    .where(eq(membrosGrupo.grupoId, grupoId));
}

export async function getMembrosEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: membrosGrupo.id,
    userId: membrosGrupo.userId,
    grupoId: membrosGrupo.grupoId,
    grupoNome: gruposPermissoes.nome,
    grupoCor: gruposPermissoes.cor,
    createdAt: membrosGrupo.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(membrosGrupo)
    .leftJoin(users, eq(membrosGrupo.userId, users.id))
    .leftJoin(gruposPermissoes, eq(membrosGrupo.grupoId, gruposPermissoes.id))
    .where(eq(membrosGrupo.empresaId, empresaId));
}

export async function addMembroGrupo(grupoId: number, userId: number, empresaId: number, adicionadoPorId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Verificar se já é membro
  const exists = await db.select({ id: membrosGrupo.id }).from(membrosGrupo)
    .where(and(eq(membrosGrupo.grupoId, grupoId), eq(membrosGrupo.userId, userId))).limit(1);
  if (exists.length > 0) return exists[0]!.id;
  const [result] = await db.insert(membrosGrupo).values({ grupoId, userId, empresaId, adicionadoPorId });
  return (result as any).insertId as number;
}

export async function removeMembroGrupo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(membrosGrupo).where(eq(membrosGrupo.id, id));
}

export async function getPermissoesUsuario(userId: number, empresaId: number) {
  const db = await getDb();
  if (!db) return null;
  // Buscar grupo do usuário nessa empresa
  const membro = await db.select({ grupoId: membrosGrupo.grupoId })
    .from(membrosGrupo)
    .where(and(eq(membrosGrupo.userId, userId), eq(membrosGrupo.empresaId, empresaId)))
    .limit(1);
  if (membro.length === 0) return null;
  const perms = await db.select().from(permissoesGrupo)
    .where(eq(permissoesGrupo.grupoId, membro[0]!.grupoId)).limit(1);
  return perms[0] ?? null;
}

// ─── CONVITES ─────────────────────────────────────────────────────────────────
export async function getConvitesByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(convitesUsuario).where(eq(convitesUsuario.empresaId, empresaId));
}

export async function createConvite(data: typeof convitesUsuario.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(convitesUsuario).values(data);
  return (result as any).insertId as number;
}

export async function getConviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(convitesUsuario).where(eq(convitesUsuario.token, token)).limit(1);
  return result[0] ?? null;
}

export async function updateConvite(id: number, data: Partial<typeof convitesUsuario.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(convitesUsuario).set(data).where(eq(convitesUsuario.id, id));
}

export async function getUsersByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  // Retorna todos os usuários que têm vínculo com a empresa (owner + membros)
  const membros = await db.select({
    userId: membrosGrupo.userId,
    grupoId: membrosGrupo.grupoId,
    membroId: membrosGrupo.id,
    grupoNome: gruposPermissoes.nome,
    grupoCor: gruposPermissoes.cor,
    userName: users.name,
    userEmail: users.email,
    userRole: users.role,
    createdAt: membrosGrupo.createdAt,
  })
    .from(membrosGrupo)
    .leftJoin(users, eq(membrosGrupo.userId, users.id))
    .leftJoin(gruposPermissoes, eq(membrosGrupo.grupoId, gruposPermissoes.id))
    .where(eq(membrosGrupo.empresaId, empresaId));
  return membros;
}

// ─── SYSTEM USERS / PESSOAS COM ACESSO (tabela unificada: profissionais) ────────
import bcrypt from "bcryptjs";

// Cria um registro na tabela profissionais com temAcesso=true
export async function createSystemUser(data: {
  empresaId: number;
  nome: string;
  email: string;
  senha: string;
  grupoId?: number;
  isProfissional?: boolean;
  criadoPorId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select({ id: profissionais.id }).from(profissionais)
    .where(and(eq(profissionais.email, data.email), eq(profissionais.empresaId, data.empresaId))).limit(1);
  if (existing.length > 0) throw new Error("E-mail já cadastrado nesta empresa");
  const passwordHash = await bcrypt.hash(data.senha, 10);
  const [result] = await db.insert(profissionais).values({
    empresaId: data.empresaId,
    nome: data.nome,
    email: data.email,
    passwordHash,
    grupoId: data.grupoId ?? null,
    isProfissional: data.isProfissional ?? false,
    temAcesso: true,
    criadoPorId: data.criadoPorId ?? null,
    corCalendario: "#6b7280",
    ativo: true,
  });
  return { id: (result as any).insertId };
}

export async function getSystemUsersByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: profissionais.id,
    nome: profissionais.nome,
    email: profissionais.email,
    grupoId: profissionais.grupoId,
    profissionalId: profissionais.id,
    isProfissional: profissionais.isProfissional,
    temAcesso: profissionais.temAcesso,
    avatarUrl: profissionais.avatarUrl,
    ativo: profissionais.ativo,
    ultimoAcesso: profissionais.ultimoAcesso,
    createdAt: profissionais.createdAt,
    grupoNome: gruposPermissoes.nome,
    grupoCor: gruposPermissoes.cor,
  })
    .from(profissionais)
    .leftJoin(gruposPermissoes, eq(profissionais.grupoId, gruposPermissoes.id))
    .where(and(eq(profissionais.empresaId, empresaId), eq(profissionais.temAcesso, true)))
    .orderBy(profissionais.nome);
}

export async function updateSystemUser(id: number, data: {
  nome?: string;
  email?: string;
  senha?: string;
  grupoId?: number | null;
  isProfissional?: boolean;
  ativo?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, any> = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.grupoId !== undefined) updateData.grupoId = data.grupoId;
  if (data.isProfissional !== undefined) updateData.isProfissional = data.isProfissional;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;
  if (data.senha) updateData.passwordHash = await bcrypt.hash(data.senha, 10);
  await db.update(profissionais).set(updateData).where(eq(profissionais.id, id));
}

export async function deleteSystemUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(profissionais).set({ temAcesso: false, passwordHash: null }).where(eq(profissionais.id, id));
}

export async function resetSystemUserPassword(id: number, novaSenha: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const passwordHash = await bcrypt.hash(novaSenha, 10);
  await db.update(profissionais).set({ passwordHash }).where(eq(profissionais.id, id));
}

// ─── PIPELINE KANBAN ──────────────────────────────────────────────────────────
import { pipelines, pipelineColunas, pipelineCartoes, InsertPipeline, InsertPipelineColuna, InsertPipelineCartao } from "../drizzle/schema";

export async function getPipelinesByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelines).where(eq(pipelines.empresaId, empresaId));
}

export async function createPipeline(data: InsertPipeline) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(pipelines).values(data);
  return { id: (result as any).insertId };
}

export async function updatePipeline(id: number, data: { nome?: string; ordem?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pipelines).set(data).where(eq(pipelines.id, id));
}

export async function deletePipeline(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pipelineCartoes).where(eq(pipelineCartoes.pipelineId, id));
  await db.delete(pipelineColunas).where(eq(pipelineColunas.pipelineId, id));
  await db.delete(pipelines).where(eq(pipelines.id, id));
}

export async function getColunasByPipeline(pipelineId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineColunas).where(eq(pipelineColunas.pipelineId, pipelineId));
}

export async function createColuna(data: InsertPipelineColuna) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(pipelineColunas).values(data);
  return { id: (result as any).insertId };
}

export async function updateColuna(id: number, data: { nome?: string; cor?: string; ordem?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pipelineColunas).set(data).where(eq(pipelineColunas.id, id));
}

export async function deleteColuna(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pipelineCartoes).where(eq(pipelineCartoes.colunaId, id));
  await db.delete(pipelineColunas).where(eq(pipelineColunas.id, id));
}

export async function getCartoesByPipeline(pipelineId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineCartoes).where(eq(pipelineCartoes.pipelineId, pipelineId));
}

export async function createCartao(data: InsertPipelineCartao) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(pipelineCartoes).values(data);
  return { id: (result as any).insertId };
}

export async function updateCartao(id: number, data: Partial<InsertPipelineCartao>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pipelineCartoes).set(data).where(eq(pipelineCartoes.id, id));
}

export async function deleteCartao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pipelineCartoes).where(eq(pipelineCartoes.id, id));
}

// ─── HELPER: EMPRESA DO USUÁRIO (owner OU membro) ────────────────────────────
// Usado pelos routers de sub-módulos (zandu, pipeline, etc.) para garantir que
// tanto o dono quanto membros da empresa possam operar normalmente.
export async function getEmpresaDoUsuario(userId: number) {
  // 1. Tenta como owner direto
  const comoOwner = await getEmpresaByOwnerId(userId);
  if (comoOwner) return comoOwner;

  const db = await getDb();
  if (!db) return null;

  // 2. Tenta como membro de grupo
  const membro = await db
    .select({ empresaId: membrosGrupo.empresaId })
    .from(membrosGrupo)
    .where(eq(membrosGrupo.userId, userId))
    .limit(1);
  if (membro.length > 0) {
    const result = await db
      .select()
      .from(empresas)
      .where(eq(empresas.id, membro[0]!.empresaId))
      .limit(1);
    if (result[0]) return result[0];
  }

  // 3. Fallback: se o usuário é admin do sistema, retorna a primeira empresa
  //    (cobre o caso de login com conta diferente da que criou a empresa)
  const userRow = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userRow[0]?.role === 'admin') {
    const anyEmpresa = await db.select().from(empresas).limit(1);
    return anyEmpresa[0] ?? null;
  }

  return null;
}

// ─── HELPER PARA OBTER EMPRESA DO CONTEXTO (OAuth ou system_user) ──────────────
// Usa o empresaId diretamente quando disponível (system_users), evitando
// a busca por ownerId que falha para usuários com ID negativo.
export async function getEmpresaDoContexto(
  userId: number,
  systemUserEmpresaId?: number | null
) {
  // Se é um system_user (ID negativo), usa o empresaId diretamente
  if (userId < 0 && systemUserEmpresaId) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(empresas).where(eq(empresas.id, systemUserEmpresaId)).limit(1);
    return result[0] ?? null;
  }
  // Para usuários OAuth, usa a lógica existente
  return getEmpresaDoUsuario(userId);
}

// ─── IA FINANCEIRA — SCORE & ALERTAS ─────────────────────────────────────────
import { scoreFinanceiro, alertasFinanceiros, analiseClientes, insightsClientes } from "../drizzle/schema";

export async function saveScoreFinanceiro(data: typeof scoreFinanceiro.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(scoreFinanceiro).values(data);
  return result;
}

export async function getScoreAtual(empresaId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scoreFinanceiro)
    .where(eq(scoreFinanceiro.empresaId, empresaId))
    .orderBy(desc(scoreFinanceiro.calculadoEm))
    .limit(1);
  return result[0] ?? null;
}

export async function getHistoricoScore(empresaId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scoreFinanceiro)
    .where(eq(scoreFinanceiro.empresaId, empresaId))
    .orderBy(desc(scoreFinanceiro.calculadoEm))
    .limit(limit);
}

export async function saveAlertaFinanceiro(data: typeof alertasFinanceiros.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(alertasFinanceiros).values(data);
}

export async function getAlertasFinanceiros(empresaId: number, apenasNaoLidos = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(alertasFinanceiros.empresaId, empresaId)];
  if (apenasNaoLidos) conditions.push(eq(alertasFinanceiros.lido, false));
  return db.select().from(alertasFinanceiros)
    .where(and(...conditions))
    .orderBy(desc(alertasFinanceiros.criadoEm))
    .limit(50);
}

export async function marcarAlertaFinanceiroLido(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(alertasFinanceiros).set({ lido: true }).where(eq(alertasFinanceiros.id, id));
}

export async function marcarTodosAlertasLidos(empresaId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(alertasFinanceiros).set({ lido: true }).where(eq(alertasFinanceiros.empresaId, empresaId));
}

// ─── IA CLIENTES — ANÁLISE & INSIGHTS ────────────────────────────────────────
export async function saveAnaliseCliente(data: typeof analiseClientes.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  // Upsert por empresaId + clienteId
  return db.insert(analiseClientes).values(data)
    .onDuplicateKeyUpdate({ set: {
      classificacao: data.classificacao,
      scoreCliente: data.scoreCliente,
      resumo: data.resumo,
      detalhes: data.detalhes,
      calculadoEm: new Date(),
    }});
}

export async function getAnaliseClientesByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analiseClientes)
    .where(eq(analiseClientes.empresaId, empresaId))
    .orderBy(desc(analiseClientes.scoreCliente));
}

export async function getAnaliseByCliente(empresaId: number, clienteId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(analiseClientes)
    .where(and(eq(analiseClientes.empresaId, empresaId), eq(analiseClientes.clienteId, clienteId)))
    .orderBy(desc(analiseClientes.calculadoEm))
    .limit(1);
  return result[0] ?? null;
}

export async function saveInsightCliente(data: typeof insightsClientes.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(insightsClientes).values(data);
}

export async function getInsightsClientes(empresaId: number, apenasNaoLidos = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(insightsClientes.empresaId, empresaId)];
  if (apenasNaoLidos) conditions.push(eq(insightsClientes.lido, false));
  return db.select().from(insightsClientes)
    .where(and(...conditions))
    .orderBy(desc(insightsClientes.criadoEm))
    .limit(50);
}

export async function marcarInsightClienteLido(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(insightsClientes).set({ lido: true }).where(eq(insightsClientes.id, id));
}

export async function marcarTodosInsightsLidos(empresaId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(insightsClientes).set({ lido: true }).where(eq(insightsClientes.empresaId, empresaId));
}

// ─── VÍNCULO PROFISSIONAL-SERVIÇO ─────────────────────────────────────────────
import { profissionalServicos } from "../drizzle/schema";

export async function getServicosByProfissional(profissionalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: profissionalServicos.id, servicoId: profissionalServicos.servicoId })
    .from(profissionalServicos)
    .where(eq(profissionalServicos.profissionalId, profissionalId));
}

export async function getEquipeByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: profissionais.id,
    nome: profissionais.nome,
    email: profissionais.email,
    telefone: profissionais.telefone,
    especialidade: profissionais.especialidade,
    corCalendario: profissionais.corCalendario,
    avatarUrl: profissionais.avatarUrl,
    ativo: profissionais.ativo,
    isProfissional: profissionais.isProfissional,
    temAcesso: profissionais.temAcesso,
    grupoId: profissionais.grupoId,
    ultimoAcesso: profissionais.ultimoAcesso,
    createdAt: profissionais.createdAt,
    grupoNome: gruposPermissoes.nome,
    grupoCor: gruposPermissoes.cor,
    percentualComissao: profissionais.percentualComissao,
  })
    .from(profissionais)
    .leftJoin(gruposPermissoes, eq(profissionais.grupoId, gruposPermissoes.id))
    .where(eq(profissionais.empresaId, empresaId))
    .orderBy(profissionais.nome);
}

export async function vincularServicoProfissional(profissionalId: number, servicoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select({ id: profissionalServicos.id })
    .from(profissionalServicos)
    .where(and(
      eq(profissionalServicos.profissionalId, profissionalId),
      eq(profissionalServicos.servicoId, servicoId)
    ))
    .limit(1);
  if (existing.length > 0) return { id: existing[0].id, alreadyExists: true };
  const [result] = await db.insert(profissionalServicos).values({ profissionalId, servicoId });
  return { id: (result as any).insertId, alreadyExists: false };
}

export async function desvincularServicoProfissional(profissionalId: number, servicoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(profissionalServicos).where(and(
    eq(profissionalServicos.profissionalId, profissionalId),
    eq(profissionalServicos.servicoId, servicoId)
  ));
}

export async function setServicosProfissional(profissionalId: number, servicoIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(profissionalServicos).where(eq(profissionalServicos.profissionalId, profissionalId));
  if (servicoIds.length > 0) {
    await db.insert(profissionalServicos).values(
      servicoIds.map(servicoId => ({ profissionalId, servicoId }))
    );
  }
}

// ─── TIPOS DE PROFISSIONAL ────────────────────────────────────────────────────
export async function getTiposProfissionalByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tiposProfissional)
    .where(and(eq(tiposProfissional.empresaId, empresaId), eq(tiposProfissional.ativo, true)))
    .orderBy(tiposProfissional.nome);
}

export async function createTipoProfissional(empresaId: number, nome: string, cor?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tiposProfissional).values({ empresaId, nome, cor: cor ?? "#7c3aed" });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id, empresaId, nome, cor: cor ?? "#7c3aed", ativo: true };
}

export async function updateTipoProfissional(id: number, data: { nome?: string; cor?: string; ativo?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tiposProfissional).set(data).where(eq(tiposProfissional.id, id));
}

export async function deleteTipoProfissional(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(profissionalTipos).where(eq(profissionalTipos.tipoProfissionalId, id));
  await db.delete(tiposProfissional).where(eq(tiposProfissional.id, id));
}

export async function getTiposByProfissional(profissionalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: tiposProfissional.id,
    nome: tiposProfissional.nome,
    cor: tiposProfissional.cor,
  })
    .from(profissionalTipos)
    .innerJoin(tiposProfissional, eq(profissionalTipos.tipoProfissionalId, tiposProfissional.id))
    .where(eq(profissionalTipos.profissionalId, profissionalId));
}

export async function setTiposProfissional(profissionalId: number, tipoIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(profissionalTipos).where(eq(profissionalTipos.profissionalId, profissionalId));
  if (tipoIds.length > 0) {
    await db.insert(profissionalTipos).values(
      tipoIds.map(tipoProfissionalId => ({ profissionalId, tipoProfissionalId }))
    );
  }
}

// ─── CATEGORIAS DE DESPESA ────────────────────────────────────────────────────
export async function getCategoriasDespesaByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categoriasDespesa)
    .where(and(eq(categoriasDespesa.empresaId, empresaId), eq(categoriasDespesa.ativo, true)))
    .orderBy(categoriasDespesa.nome);
}

export async function createCategoriaDespesa(data: typeof categoriasDespesa.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(categoriasDespesa).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateCategoriaDespesa(id: number, data: Partial<typeof categoriasDespesa.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categoriasDespesa).set(data).where(eq(categoriasDespesa.id, id));
}

export async function deleteCategoriaDespesa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categoriasDespesa).set({ ativo: false }).where(eq(categoriasDespesa.id, id));
}

// ─── CONTAS A PAGAR ───────────────────────────────────────────────────────────
export async function getContasPagarByEmpresa(empresaId: number, filtros?: {
  status?: string;
  categoriaId?: number;
  dataInicio?: string;
  dataFim?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contasPagar.empresaId, empresaId)];
  if (filtros?.status && filtros.status !== "todos") {
    conditions.push(eq(contasPagar.status, filtros.status as any));
  }
  if (filtros?.categoriaId) {
    conditions.push(eq(contasPagar.categoriaId, filtros.categoriaId));
  }
  if (filtros?.dataInicio) {
    conditions.push(sql`${contasPagar.dataVencimento} >= ${filtros.dataInicio}`);
  }
  if (filtros?.dataFim) {
    conditions.push(sql`${contasPagar.dataVencimento} <= ${filtros.dataFim}`);
  }
  const contas = await db.select({
    id: contasPagar.id,
    empresaId: contasPagar.empresaId,
    descricao: contasPagar.descricao,
    valor: contasPagar.valor,
    dataVencimento: contasPagar.dataVencimento,
    dataPagamento: contasPagar.dataPagamento,
    categoriaId: contasPagar.categoriaId,
    status: contasPagar.status,
    recorrente: contasPagar.recorrente,
    recorrenciaTipo: contasPagar.recorrenciaTipo,
    observacoes: contasPagar.observacoes,
    fornecedor: contasPagar.fornecedor,
    comprovante: contasPagar.comprovante,
    createdAt: contasPagar.createdAt,
    updatedAt: contasPagar.updatedAt,
    categoriaNome: categoriasDespesa.nome,
    categoriaCor: categoriasDespesa.cor,
    categoriaIcone: categoriasDespesa.icone,
  })
    .from(contasPagar)
    .leftJoin(categoriasDespesa, eq(contasPagar.categoriaId, categoriasDespesa.id))
    .where(and(...conditions))
    .orderBy(contasPagar.dataVencimento);
  return contas;
}

export async function createContaPagar(data: typeof contasPagar.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contasPagar).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateContaPagar(id: number, data: Partial<typeof contasPagar.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contasPagar).set(data).where(eq(contasPagar.id, id));
}

export async function deleteContaPagar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contasPagar).where(eq(contasPagar.id, id));
}

export async function getMetricasContasPagar(empresaId: number) {
  const db = await getDb();
  if (!db) return { totalPendente: 0, totalVencido: 0, totalPagoMes: 0, totalMes: 0, contasVencidas: 0, contasPendentes: 0 };
  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];
  const todasContas = await db.select().from(contasPagar).where(eq(contasPagar.empresaId, empresaId));
  // Atualizar status de vencidas automaticamente
  const vencidas = todasContas.filter(c => c.status === "pendente" && c.dataVencimento < hoje);
  for (const conta of vencidas) {
    await db.update(contasPagar).set({ status: "vencido" }).where(eq(contasPagar.id, conta.id));
  }
  const pendentes = todasContas.filter(c => c.status === "pendente" && c.dataVencimento >= hoje);
  const vencidasAtual = todasContas.filter(c => c.status === "vencido" || (c.status === "pendente" && c.dataVencimento < hoje));
  const pagosMes = todasContas.filter(c => c.status === "pago" && c.dataPagamento && c.dataPagamento >= inicioMes && c.dataPagamento <= fimMes);
  const doMes = todasContas.filter(c => c.dataVencimento >= inicioMes && c.dataVencimento <= fimMes && c.status !== "cancelado");
  return {
    totalPendente: pendentes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalVencido: vencidasAtual.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalPagoMes: pagosMes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalMes: doMes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    contasVencidas: vencidasAtual.length,
    contasPendentes: pendentes.length,
  };
}

export async function getResumoContasPagarParaIA(empresaId: number) {
  const db = await getDb();
  if (!db) return null;
  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];
  const todasContas = await db.select({
    id: contasPagar.id,
    descricao: contasPagar.descricao,
    valor: contasPagar.valor,
    dataVencimento: contasPagar.dataVencimento,
    dataPagamento: contasPagar.dataPagamento,
    status: contasPagar.status,
    fornecedor: contasPagar.fornecedor,
    categoriaNome: categoriasDespesa.nome,
  })
    .from(contasPagar)
    .leftJoin(categoriasDespesa, eq(contasPagar.categoriaId, categoriasDespesa.id))
    .where(eq(contasPagar.empresaId, empresaId));
  const vencidas = todasContas.filter(c => (c.status === "vencido" || (c.status === "pendente" && c.dataVencimento < hoje)));
  const pendentes = todasContas.filter(c => c.status === "pendente" && c.dataVencimento >= hoje);
  const pagosMes = todasContas.filter(c => c.status === "pago" && c.dataPagamento && c.dataPagamento >= inicioMes && c.dataPagamento <= fimMes);
  const proximas7Dias = pendentes.filter(c => {
    const diff = (new Date(c.dataVencimento).getTime() - new Date(hoje).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  return {
    totalVencido: vencidas.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalPendente: pendentes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalPagoMes: pagosMes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    quantidadeVencidas: vencidas.length,
    quantidadePendentes: pendentes.length,
    contasVencidas: vencidas.slice(0, 5).map(c => ({ descricao: c.descricao, valor: parseFloat(String(c.valor)), vencimento: c.dataVencimento, categoria: c.categoriaNome })),
    proximasAVencer: proximas7Dias.slice(0, 5).map(c => ({ descricao: c.descricao, valor: parseFloat(String(c.valor)), vencimento: c.dataVencimento, categoria: c.categoriaNome })),
    maiorDespesaMes: pagosMes.sort((a, b) => parseFloat(String(b.valor)) - parseFloat(String(a.valor))).slice(0, 3).map(c => ({ descricao: c.descricao, valor: parseFloat(String(c.valor)), categoria: c.categoriaNome })),
  };
}

// ─── CONTAS A RECEBER ─────────────────────────────────────────────────────────
export async function getContasReceberByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: contasReceber.id,
    descricao: contasReceber.descricao,
    valor: contasReceber.valor,
    dataVencimento: contasReceber.dataVencimento,
    dataRecebimento: contasReceber.dataRecebimento,
    status: contasReceber.status,
    origem: contasReceber.origem,
    origemId: contasReceber.origemId,
    clienteId: contasReceber.clienteId,
    profissionalId: contasReceber.profissionalId,
    tipoPagamento: contasReceber.tipoPagamento,
    observacoes: contasReceber.observacoes,
    recorrente: contasReceber.recorrente,
    recorrenciaTipo: contasReceber.recorrenciaTipo,
    createdAt: contasReceber.createdAt,
    clienteNome: clientes.nome,
    profissionalNome: profissionais.nome,
  })
    .from(contasReceber)
    .leftJoin(clientes, eq(contasReceber.clienteId, clientes.id))
    .leftJoin(profissionais, eq(contasReceber.profissionalId, profissionais.id))
    .where(eq(contasReceber.empresaId, empresaId))
    .orderBy(desc(contasReceber.dataVencimento));
}

export async function createContaReceber(data: typeof contasReceber.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contasReceber).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateContaReceber(id: number, data: Partial<typeof contasReceber.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contasReceber).set(data).where(eq(contasReceber.id, id));
}

export async function deleteContaReceber(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contasReceber).where(eq(contasReceber.id, id));
}

export async function getMetricasContasReceber(empresaId: number) {
  const db = await getDb();
  if (!db) return { totalPendente: 0, totalRecebidoMes: 0, totalVencido: 0, quantidadePendentes: 0, quantidadeVencidas: 0 };
  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = hoje.substring(0, 7) + "-01";
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];
  const todas = await db.select({
    id: contasReceber.id,
    valor: contasReceber.valor,
    dataVencimento: contasReceber.dataVencimento,
    dataRecebimento: contasReceber.dataRecebimento,
    status: contasReceber.status,
  }).from(contasReceber).where(eq(contasReceber.empresaId, empresaId));
  const vencidas = todas.filter(c => c.status === "vencido" || (c.status === "pendente" && c.dataVencimento < hoje));
  const pendentes = todas.filter(c => c.status === "pendente" && c.dataVencimento >= hoje);
  const recebidosMes = todas.filter(c => c.status === "recebido" && c.dataRecebimento && c.dataRecebimento >= inicioMes && c.dataRecebimento <= fimMes);
  const proximas7 = pendentes.filter(c => {
    const diff = (new Date(c.dataVencimento).getTime() - new Date(hoje).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  return {
    totalPendente: pendentes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalRecebidoMes: recebidosMes.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    totalVencido: vencidas.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
    quantidadePendentes: pendentes.length,
    quantidadeVencidas: vencidas.length,
    quantidadeProximas7: proximas7.length,
    totalProximas7: proximas7.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0),
  };
}

// Importa agendamentos concluídos que ainda não têm conta a receber
export async function importarAgendamentosParaContasReceber(empresaId: number) {
  const db = await getDb();
  if (!db) return 0;
  // Busca agendamentos concluídos
  const agendsConcluidos = await db.select({
    id: agendamentos.id,
    clienteId: agendamentos.clienteId,
    profissionalId: agendamentos.profissionalId,
    valorTotal: agendamentos.valorTotal,
    data: agendamentos.data,
    tipoPagamento: agendamentos.tipoPagamento,
    concluidoEm: agendamentos.concluidoEm,
  }).from(agendamentos).where(
    and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.status, "concluido"))
  );
  // Busca origemIds já importados
  const jaImportados = await db.select({ origemId: contasReceber.origemId })
    .from(contasReceber)
    .where(and(eq(contasReceber.empresaId, empresaId), eq(contasReceber.origem, "agendamento")));
  const idsImportados = new Set(jaImportados.map(r => r.origemId));
  const novos = agendsConcluidos.filter(a => !idsImportados.has(a.id));
  if (novos.length === 0) return 0;
  const clientesList = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).where(eq(clientes.empresaId, empresaId));
  const clientesMap = new Map(clientesList.map(c => [c.id, c.nome]));
  for (const ag of novos) {
    const nomeCliente = clientesMap.get(ag.clienteId) ?? "Cliente";
    await db.insert(contasReceber).values({
      empresaId,
      descricao: `Atendimento - ${nomeCliente}`,
      valor: ag.valorTotal,
      dataVencimento: ag.data,
      dataRecebimento: ag.data,
      status: "recebido",
      origem: "agendamento",
      origemId: ag.id,
      clienteId: ag.clienteId,
      profissionalId: ag.profissionalId,
      tipoPagamento: ag.tipoPagamento ?? undefined,
    });
  }
  return novos.length;
}

// ─── HISTÓRICO DE ENVIOS DE AUTOMAÇÕES ────────────────────────────────────────

export async function registrarEnvioAutomacao(data: {
  empresaId: number;
  automacaoId?: number;
  automacaoNome?: string;
  clienteId?: number;
  clienteNome?: string;
  agendamentoId?: number;
  telefone?: string;
  canal?: "whatsapp" | "email" | "sms" | "lembrete";
  mensagem?: string;
  status?: "enviado" | "falhou" | "pendente" | "agendado";
  erroDetalhe?: string;
  enviarEm?: Date; // Data/hora programada para envio (para status pendente)
  midiaUrl?: string; // URL da mídia para envio (imagem/documento)
  isTeste?: boolean; // Flag de envio de teste
  servicoNome?: string; // Nome do serviço do agendamento
}) {
  const db = await getDb();
  if (!db) return;

  // Determinar status automaticamente: se enviarEm for > 60s no futuro → 'agendado'; caso contrário manter o status informado
  const agora = Date.now();
  const limiarFuturo = 60 * 1000; // 60 segundos
  let statusFinal = data.status ?? "enviado";
  if (statusFinal === 'pendente' && data.enviarEm && (data.enviarEm.getTime() - agora) > limiarFuturo) {
    statusFinal = 'agendado';
  }

  // Se há automacaoId + agendamentoId, verificar se já existe registro pendente/agendado para atualizar
  if (data.automacaoId && data.agendamentoId && statusFinal !== 'pendente' && statusFinal !== 'agendado') {
    const existente = await db.select({ id: historicoEnviosAutomacao.id })
      .from(historicoEnviosAutomacao)
      .where(and(
        eq(historicoEnviosAutomacao.empresaId, data.empresaId),
        eq(historicoEnviosAutomacao.automacaoId, data.automacaoId),
        eq(historicoEnviosAutomacao.agendamentoId, data.agendamentoId),
        or(
          eq(historicoEnviosAutomacao.status, 'pendente'),
          eq(historicoEnviosAutomacao.status, 'agendado'),
        ),
      ))
      .limit(1);

    if (existente.length > 0) {
      // Atualizar o registro pendente/agendado existente
      await db.update(historicoEnviosAutomacao)
        .set({
          status: statusFinal as any,
          mensagem: data.mensagem ?? null,
          erroDetalhe: data.erroDetalhe ?? null,
        })
        .where(eq(historicoEnviosAutomacao.id, existente[0].id));
      return;
    }
  }

  // Criar novo registro
  await db.insert(historicoEnviosAutomacao).values({
    empresaId: data.empresaId,
    automacaoId: data.automacaoId ?? null,
    automacaoNome: data.automacaoNome ?? null,
    clienteId: data.clienteId ?? null,
    clienteNome: data.clienteNome ?? null,
    agendamentoId: data.agendamentoId ?? null,
    telefone: data.telefone ?? null,
    canal: data.canal ?? "whatsapp",
    mensagem: data.mensagem ?? null,
    status: statusFinal as any,
    erroDetalhe: data.erroDetalhe ?? null,
    enviarEm: data.enviarEm ?? null,
    midiaUrl: data.midiaUrl ?? null,
    isTeste: data.isTeste ?? false,
    servicoNome: data.servicoNome ?? null,
  });
}

// Verificar se já foi enviado lembrete para este agendamento+automação (deduplicação)
export async function jaEnviouLembrete(empresaId: number, automacaoId: number, agendamentoId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: historicoEnviosAutomacao.id })
    .from(historicoEnviosAutomacao)
    .where(and(
      eq(historicoEnviosAutomacao.empresaId, empresaId),
      eq(historicoEnviosAutomacao.automacaoId, automacaoId),
      eq(historicoEnviosAutomacao.agendamentoId, agendamentoId),
      sql`${historicoEnviosAutomacao.status} IN ('enviado', 'pendente', 'agendado')`,
    ))
    .limit(1);
  return result.length > 0;
}

// Verificar se já foi enviado para este cliente+automação na data atual (deduplicação para triggers sem agendamento)
export async function jaEnviouParaCliente(empresaId: number, automacaoId: number, clienteId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const result = await db.select({ id: historicoEnviosAutomacao.id })
    .from(historicoEnviosAutomacao)
    .where(and(
      eq(historicoEnviosAutomacao.empresaId, empresaId),
      eq(historicoEnviosAutomacao.automacaoId, automacaoId),
      eq(historicoEnviosAutomacao.clienteId, clienteId),
      sql`${historicoEnviosAutomacao.status} IN ('enviado', 'pendente', 'agendado')`,
      gte(historicoEnviosAutomacao.criadoEm, hoje),
    ))
    .limit(1);
  return result.length > 0;
}

// Buscar todas as automações ativas de uma empresa por tipo de gatilho
export async function getAutomacoesAtivasByTipo(empresaId: number, tipoGatilho: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automacoes).where(and(
    eq(automacoes.empresaId, empresaId),
    eq(automacoes.tipoGatilho, tipoGatilho as any),
    eq(automacoes.ativo, true),
  ));
}

// Buscar todas as empresas com automações ativas do tipo especificado
export async function getEmpresasComAutomacoes(tipoGatilho: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ empresaId: automacoes.empresaId })
    .from(automacoes)
    .where(and(
      eq(automacoes.tipoGatilho, tipoGatilho as any),
      eq(automacoes.ativo, true),
    ));
  return Array.from(new Set(rows.map(r => r.empresaId)));
}

export async function getHistoricoEnvios(empresaId: number, opts?: {
  limit?: number;
  offset?: number;
  canal?: string;
  status?: string;
  desde?: Date;
  apenasTestes?: boolean;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions = [eq(historicoEnviosAutomacao.empresaId, empresaId)];
  if (opts?.canal) conditions.push(eq(historicoEnviosAutomacao.canal, opts.canal as any));
  if (opts?.status) conditions.push(eq(historicoEnviosAutomacao.status, opts.status as any));
  if (opts?.desde) conditions.push(gte(historicoEnviosAutomacao.criadoEm, opts.desde));
  if (opts?.apenasTestes) conditions.push(eq(historicoEnviosAutomacao.isTeste, true));

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [rows, countResult] = await Promise.all([
    db.select().from(historicoEnviosAutomacao)
      .where(where)
      .orderBy(desc(historicoEnviosAutomacao.criadoEm))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(historicoEnviosAutomacao).where(where),
  ]);

  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function contarFalhasRecentes(empresaId: number, horas = 24): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(historicoEnviosAutomacao)
    .where(and(
      eq(historicoEnviosAutomacao.empresaId, empresaId),
      eq(historicoEnviosAutomacao.status, "falhou"),
      gte(historicoEnviosAutomacao.criadoEm, desde),
    ));
  return Number(result[0]?.count ?? 0);
}

export async function getEnvioById(id: number, empresaId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(historicoEnviosAutomacao)
    .where(and(
      eq(historicoEnviosAutomacao.id, id),
      eq(historicoEnviosAutomacao.empresaId, empresaId),
    ))
    .limit(1);
  return rows[0] ?? null;
}

// ─── MEIOS DE PAGAMENTO ───────────────────────────────────────────────────────
export async function getMeiosPagamentoByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meiosPagamento)
    .where(eq(meiosPagamento.empresaId, empresaId))
    .orderBy(meiosPagamento.nome);
}

export async function getMeioPagamentoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(meiosPagamento).where(eq(meiosPagamento.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createMeioPagamento(data: typeof meiosPagamento.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(meiosPagamento).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

export async function updateMeioPagamento(id: number, data: Partial<typeof meiosPagamento.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(meiosPagamento).set(data).where(eq(meiosPagamento.id, id));
}

export async function deleteMeioPagamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Remover taxas por parcela primeiro
  await db.delete(taxasParcela).where(eq(taxasParcela.meioPagamentoId, id));
  await db.delete(meiosPagamento).where(eq(meiosPagamento.id, id));
}

export async function getTaxasParcelaByMeio(meioPagamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taxasParcela)
    .where(eq(taxasParcela.meioPagamentoId, meioPagamentoId))
    .orderBy(taxasParcela.parcela);
}

export async function upsertTaxasParcela(meioPagamentoId: number, taxas: { parcela: number; taxa: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Remover taxas existentes e reinserir
  await db.delete(taxasParcela).where(eq(taxasParcela.meioPagamentoId, meioPagamentoId));
  if (taxas.length > 0) {
    await db.insert(taxasParcela).values(
      taxas.map((t) => ({ meioPagamentoId, parcela: t.parcela, taxa: t.taxa }))
    );
  }
}

export async function getMeiosPagamentoComTaxas(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  const meios = await db.select().from(meiosPagamento)
    .where(and(eq(meiosPagamento.empresaId, empresaId), eq(meiosPagamento.ativo, true)))
    .orderBy(meiosPagamento.nome);
  const result = await Promise.all(
    meios.map(async (meio) => {
      const taxas = await db.select().from(taxasParcela)
        .where(eq(taxasParcela.meioPagamentoId, meio.id))
        .orderBy(taxasParcela.parcela);
      return { ...meio, taxas };
    })
  );
  return result;
}

// ─── COMISSÕES A PAGAR (com detalhes) ────────────────────────────────────────
export async function getComissoesPagarDetalhadas(
  empresaId: number,
  profissionalId?: number,
  dataInicio?: Date,
  dataFim?: Date
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(comissoes.empresaId, empresaId)];
  if (profissionalId) conditions.push(eq(comissoes.profissionalId, profissionalId));
  if (dataInicio) conditions.push(gte(comissoes.createdAt, dataInicio));
  if (dataFim) conditions.push(lte(comissoes.createdAt, dataFim));
  const rows = await db.select().from(comissoes).where(and(...conditions)).orderBy(desc(comissoes.createdAt));
  const enriched = await Promise.all(rows.map(async (c) => {
    const prof = await db.select({ nome: profissionais.nome }).from(profissionais).where(eq(profissionais.id, c.profissionalId)).limit(1);
    const ag = await db.select({ clienteId: agendamentos.clienteId, servicoId: agendamentos.servicoId, data: agendamentos.data }).from(agendamentos).where(eq(agendamentos.id, c.agendamentoId)).limit(1);
    let clienteNome: string | null = null;
    let servicoNome: string | null = null;
    if (ag[0]) {
      const cl = await db.select({ nome: clientes.nome }).from(clientes).where(eq(clientes.id, ag[0].clienteId)).limit(1);
      const sv = await db.select({ nome: servicos.nome }).from(servicos).where(eq(servicos.id, ag[0].servicoId)).limit(1);
      clienteNome = cl[0]?.nome ?? null;
      servicoNome = sv[0]?.nome ?? null;
    }
    return {
      ...c,
      profissionalNome: prof[0]?.nome ?? null,
      clienteNome,
      servicoNome,
      dataAgendamento: ag[0]?.data ?? null,
      status: c.paga ? "pago" as const : "pendente" as const,
      valor: c.valorComissao,
      dataPagamento: c.pagaEm,
    };
  }));
  return enriched;
}

export async function marcarComissoesPagas(ids: number[], dataPagamento: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const id of ids) {
    await db.update(comissoes).set({ paga: true, pagaEm: dataPagamento }).where(eq(comissoes.id, id));
  }
}

// ─── PAGAMENTOS DE AGENDAMENTO ────────────────────────────────────────────────
export async function getPagamentosByAgendamento(agendamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agendamentoPagamentos)
    .where(eq(agendamentoPagamentos.agendamentoId, agendamentoId))
    .orderBy(agendamentoPagamentos.createdAt);
}

export async function addPagamentoAgendamento(data: {
  agendamentoId: number;
  valor: string;
  meioPagamento?: string;
  numeroParcelas?: number;
  observacao?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(agendamentoPagamentos).values({
    agendamentoId: data.agendamentoId,
    valor: data.valor,
    meioPagamento: data.meioPagamento ?? null,
    numeroParcelas: data.numeroParcelas ?? 1,
    observacao: data.observacao ?? null,
  });
}

export async function removePagamentoAgendamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(agendamentoPagamentos).where(eq(agendamentoPagamentos.id, id));
}

export async function updateDescontoAgendamento(agendamentoId: number, desconto: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(agendamentos).set({ desconto }).where(eq(agendamentos.id, agendamentoId));
}

// ─── DASHBOARD CONFIG ─────────────────────────────────────────────────────────
export async function getDashboardConfig(userId: number, empresaId: number): Promise<DashboardWidget[] | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(dashboardConfig)
    .where(and(eq(dashboardConfig.userId, userId), eq(dashboardConfig.empresaId, empresaId)))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0].layout as DashboardWidget[];
}

export async function saveDashboardConfig(userId: number, empresaId: number, layout: DashboardWidget[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select({ id: dashboardConfig.id })
    .from(dashboardConfig)
    .where(and(eq(dashboardConfig.userId, userId), eq(dashboardConfig.empresaId, empresaId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(dashboardConfig)
      .set({ layout: layout as any })
      .where(eq(dashboardConfig.id, existing[0].id));
  } else {
    await db.insert(dashboardConfig).values({ userId, empresaId, layout: layout as any });
  }
}

// ─── DELETE AGENDAMENTO (cascade completo) ────────────────────────────────────
export async function deleteAgendamentoCompleto(agendamentoId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { tokensConfirmacao } = await import("../drizzle/schema");
  // 1. Remover itens do agendamento
  await db.delete(agendamentoItens).where(eq(agendamentoItens.agendamentoId, agendamentoId));
  // 2. Remover pagamentos
  await db.delete(agendamentoPagamentos).where(eq(agendamentoPagamentos.agendamentoId, agendamentoId));
  // 3. Remover comissões vinculadas
  await db.delete(comissoes).where(eq(comissoes.agendamentoId, agendamentoId));
  // 4. Remover prontuários vinculados
  await db.delete(prontuarios).where(eq(prontuarios.agendamentoId, agendamentoId));
  // 5. Remover cartões de pipeline vinculados ao agendamento (evitar registros fantasma)
  await db.delete(pipelineCartoes).where(eq(pipelineCartoes.agendamentoId, agendamentoId));
  // 6. Remover tokens de confirmação
  await db.delete(tokensConfirmacao).where(eq(tokensConfirmacao.agendamentoId, agendamentoId));
  // 7. Remover o agendamento em si
  await db.delete(agendamentos).where(eq(agendamentos.id, agendamentoId));
}
