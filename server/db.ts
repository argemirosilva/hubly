import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, empresas, profissionais, permissoes, clientes, servicos, agendamentos, bloqueiosAgenda, comissoes, notificacoes, automacoes, prontuarios, coresStatus, gruposPermissoes, permissoesGrupo, membrosGrupo, convitesUsuario } from "../drizzle/schema";
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
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(agendamentos.empresaId, empresaId)];
  if (dataInicio) conditions.push(sql`${agendamentos.data} >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`${agendamentos.data} <= ${dataFim}`);
  // Filtro por profissional — apenas quando vinculado (não aplica para administradores)
  if (profissionalId) conditions.push(eq(agendamentos.profissionalId, profissionalId));
  return db.select().from(agendamentos).where(and(...conditions)).orderBy(agendamentos.data, agendamentos.horaInicio);
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

export async function updateBloqueio(id: number, data: Partial<typeof bloqueiosAgenda.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(bloqueiosAgenda).set(data).where(eq(bloqueiosAgenda.id, id));
}

// ─── COMISSÕES ────────────────────────────────────────────────────────────────
export async function getComissoesByEmpresa(empresaId: number, profissionalId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(comissoes.empresaId, empresaId)];
  if (profissionalId) conditions.push(eq(comissoes.profissionalId, profissionalId));
  return db.select().from(comissoes).where(and(...conditions)).orderBy(desc(comissoes.createdAt));
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

// ─── AUTOMAÇÕES ───────────────────────────────────────────────────────────────
export async function getAutomacoesByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automacoes).where(eq(automacoes.empresaId, empresaId));
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
  const filtroHoje = profissionalId
    ? and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.profissionalId, profissionalId), sql`${agendamentos.data} = ${hojeStr}`)
    : and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} = ${hojeStr}`);
  const filtroMes = profissionalId
    ? and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.profissionalId, profissionalId), sql`${agendamentos.data} >= ${inicioMes}`, sql`${agendamentos.data} <= ${fimMes}`)
    : and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} >= ${inicioMes}`, sql`${agendamentos.data} <= ${fimMes}`);
  const filtroMesAnterior = profissionalId
    ? and(eq(agendamentos.empresaId, empresaId), eq(agendamentos.profissionalId, profissionalId), sql`${agendamentos.data} >= ${inicioMesAnterior}`, sql`${agendamentos.data} <= ${fimMesAnterior}`)
    : and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} >= ${inicioMesAnterior}`, sql`${agendamentos.data} <= ${fimMesAnterior}`);
  const filtroComissoes = profissionalId
    ? and(eq(comissoes.empresaId, empresaId), eq(comissoes.profissionalId, profissionalId), gte(comissoes.createdAt, new Date(inicioMes)))
    : and(eq(comissoes.empresaId, empresaId), gte(comissoes.createdAt, new Date(inicioMes)));

  const [agendamentosHoje, agendamentosMes, agendamentosMesAnterior, totalClientes, comissoesMes] = await Promise.all([
    db.select().from(agendamentos).where(filtroHoje),
    db.select().from(agendamentos).where(filtroMes),
    db.select().from(agendamentos).where(filtroMesAnterior),
    // Total de clientes sempre da empresa (não filtra por profissional)
    db.select({ count: sql<number>`count(*)` }).from(clientes).where(and(eq(clientes.empresaId, empresaId), eq(clientes.ativo, true))),
    db.select().from(comissoes).where(filtroComissoes),
  ]);

  const receitaMes = agendamentosMes.filter(a => a.status === 'concluido').reduce((sum, a) => sum + parseFloat(String(a.valorTotal)), 0);
  const receitaMesAnterior = agendamentosMesAnterior.filter(a => a.status === 'concluido').reduce((sum, a) => sum + parseFloat(String(a.valorTotal)), 0);
  const ticketMedio = agendamentosMes.filter(a => a.status === 'concluido').length > 0
    ? receitaMes / agendamentosMes.filter(a => a.status === 'concluido').length : 0;

  return {
    agendamentosHoje: agendamentosHoje.length,
    agendamentosMes: agendamentosMes.length,
    receitaMes,
    receitaMesAnterior,
    ticketMedio,
    totalClientes: totalClientes[0]?.count ?? 0,
    comissoesPendentes: comissoesMes.filter(c => !c.paga).length,
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
