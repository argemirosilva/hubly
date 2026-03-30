import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, empresas, profissionais, permissoes, clientes, servicos, agendamentos, bloqueiosAgenda, comissoes, notificacoes, automacoes, prontuarios, coresStatus, gruposPermissoes, permissoesGrupo, membrosGrupo, convitesUsuario, systemUsers } from "../drizzle/schema";
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
export async function getProfissionaisByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profissionais).where(eq(profissionais.empresaId, empresaId));
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
export async function getAgendamentosByEmpresa(empresaId: number, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(agendamentos.empresaId, empresaId)];
  if (dataInicio) conditions.push(sql`${agendamentos.data} >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`${agendamentos.data} <= ${dataFim}`);
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

export async function createAutomacao(data: typeof automacoes.$inferInsert) {
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

export async function updateAutomacao(id: number, data: Partial<typeof automacoes.$inferInsert>) {
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
export async function getDashboardMetrics(empresaId: number) {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0];
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0];
  const hojeStr = hoje.toISOString().split('T')[0];

  const [agendamentosHoje, agendamentosMes, agendamentosMesAnterior, totalClientes, comissoesMes] = await Promise.all([
    db.select().from(agendamentos).where(and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} = ${hojeStr}`)),
    db.select().from(agendamentos).where(and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} >= ${inicioMes}`, sql`${agendamentos.data} <= ${fimMes}`)),
    db.select().from(agendamentos).where(and(eq(agendamentos.empresaId, empresaId), sql`${agendamentos.data} >= ${inicioMesAnterior}`, sql`${agendamentos.data} <= ${fimMesAnterior}`)),
    db.select({ count: sql<number>`count(*)` }).from(clientes).where(and(eq(clientes.empresaId, empresaId), eq(clientes.ativo, true))),
    db.select().from(comissoes).where(and(eq(comissoes.empresaId, empresaId), gte(comissoes.createdAt, new Date(inicioMes)))),
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

// ─── SYSTEM USERS (cadastro por admin com senha) ──────────────────────────────
import bcrypt from "bcryptjs";

export async function createSystemUser(data: {
  empresaId: number;
  nome: string;
  email: string;
  senha: string;
  grupoId?: number;
  criadoPorId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select({ id: systemUsers.id }).from(systemUsers)
    .where(and(eq(systemUsers.email, data.email), eq(systemUsers.empresaId, data.empresaId))).limit(1);
  if (existing.length > 0) throw new Error("E-mail já cadastrado nesta empresa");
  const passwordHash = await bcrypt.hash(data.senha, 10);
  const [result] = await db.insert(systemUsers).values({
    empresaId: data.empresaId,
    nome: data.nome,
    email: data.email,
    passwordHash,
    grupoId: data.grupoId ?? null,
    criadoPorId: data.criadoPorId ?? null,
    ativo: true,
  });
  return { id: (result as any).insertId };
}

export async function getSystemUsersByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: systemUsers.id,
    nome: systemUsers.nome,
    email: systemUsers.email,
    grupoId: systemUsers.grupoId,
    ativo: systemUsers.ativo,
    ultimoAcesso: systemUsers.ultimoAcesso,
    createdAt: systemUsers.createdAt,
    grupoNome: gruposPermissoes.nome,
    grupoCor: gruposPermissoes.cor,
  })
    .from(systemUsers)
    .leftJoin(gruposPermissoes, eq(systemUsers.grupoId, gruposPermissoes.id))
    .where(eq(systemUsers.empresaId, empresaId))
    .orderBy(systemUsers.nome);
}

export async function updateSystemUser(id: number, data: {
  nome?: string;
  email?: string;
  senha?: string;
  grupoId?: number | null;
  ativo?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, any> = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.grupoId !== undefined) updateData.grupoId = data.grupoId;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;
  if (data.senha) updateData.passwordHash = await bcrypt.hash(data.senha, 10);
  await db.update(systemUsers).set(updateData).where(eq(systemUsers.id, id));
}

export async function deleteSystemUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(systemUsers).where(eq(systemUsers.id, id));
}

export async function resetSystemUserPassword(id: number, novaSenha: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const passwordHash = await bcrypt.hash(novaSenha, 10);
  await db.update(systemUsers).set({ passwordHash }).where(eq(systemUsers.id, id));
}
