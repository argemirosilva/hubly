import {
  boolean,
  bigint,
  date,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  longtext,
  timestamp,
  varchar,
  time,
  json,
} from "drizzle-orm/mysql-core";

// Use varchar(10) for date fields to avoid Date/string type conflicts
const dateField = (name: string) => varchar(name, { length: 10 });

// ─── USERS (auth base) ────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Push notifications
  pushToken: text("pushToken"),
  pushTokenPlatform: mysqlEnum("pushTokenPlatform", ["ios", "android", "web"]),
  pushTokenUpdatedAt: timestamp("pushTokenUpdatedAt"),
  // Preferências de notificação
  notifNovoAgendamento: boolean("notifNovoAgendamento").default(true),
  notifConfirmacao: boolean("notifConfirmacao").default(true),
  notifCancelamento: boolean("notifCancelamento").default(true),
  notifLembrete: boolean("notifLembrete").default(true),
  notifPagamento: boolean("notifPagamento").default(true),
  notifComissao: boolean("notifComissao").default(true),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────
export const empresas = mysqlTable("empresas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["salao", "clinica", "barbearia", "consultorio", "outro"]).default("salao").notNull(),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  endereco: text("endereco"),
  logoUrl: text("logoUrl"),
  corPrimaria: varchar("corPrimaria", { length: 7 }).default("#1a1a2e"),
  corSecundaria: varchar("corSecundaria", { length: 7 }).default("#e8d5c4"),
  whatsappNumero: varchar("whatsappNumero", { length: 20 }),
  whatsappApiKey: text("whatsappApiKey"),
  // Templates de mensagem WhatsApp
  waMsgConfirmacao: text("waMsgConfirmacao"),
  waMsgCancelamento: text("waMsgCancelamento"),
  waMsgLembrete: text("waMsgLembrete"),
  taxaMaquininha: decimal("taxaMaquininha", { precision: 5, scale: 2 }).default("2.99"),
  percentualDona: decimal("percentualDona", { precision: 5, scale: 2 }).default("0.00"),
  reservaPercentual: decimal("reservaPercentual", { precision: 5, scale: 2 }).default("30.00"),
  reservaHorasExpiracao: int("reservaHorasExpiracao").default(24),
  // Portal de agendamento público
  portalSlug: varchar("portalSlug", { length: 100 }),
  portalAtivo: boolean("portalAtivo").default(false),
  autoConfirmarPortal: boolean("autoConfirmarPortal").default(false),
  portalHeaderUrl: text("portalHeaderUrl"),
  portalMensagemBemVindo: text("portalMensagemBemVindo"),
  // Horário de funcionamento
  horaAbertura: varchar("horaAbertura", { length: 5 }).default("08:00"),
  horaFechamento: varchar("horaFechamento", { length: 5 }).default("18:00"),
  diasFuncionamento: json("diasFuncionamento").$type<number[]>().default([1,2,3,4,5]),
  intervaloMinutos: int("intervaloMinutos").default(30),
  ownerId: int("ownerId").notNull(),
  pipelineFavoritaId: int("pipelineFavoritaId"),
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo").notNull(),
  onboardingConcluido: boolean("onboardingConcluido").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Empresa = typeof empresas.$inferSelect;

// ─── PROFISSIONAIS ────────────────────────────────────────────────────────────
export const profissionais = mysqlTable("profissionais", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  userId: int("userId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  especialidade: varchar("especialidade", { length: 255 }),
  corCalendario: varchar("corCalendario", { length: 7 }).default("#7c3aed"),
  avatarUrl: text("avatarUrl"),
  ativo: boolean("ativo").default(true),
  // ─── Campos de acesso ao sistema (fusão com system_users) ─────────────────
  isProfissional: boolean("isProfissional").default(true).notNull(),  // aparece na agenda
  temAcesso: boolean("temAcesso").default(false).notNull(),           // pode fazer login
  passwordHash: varchar("passwordHash", { length: 255 }),             // null = sem acesso
  grupoId: int("grupoId"),                                            // grupo de permissões
  ultimoAcesso: timestamp("ultimoAcesso"),
  criadoPorId: int("criadoPorId"),
  isOwner: boolean("isOwner").default(false).notNull(),
  percentualComissao: decimal("percentualComissao", { precision: 5, scale: 2 }).default("0.00"), // comissão padrão do profissional
  // ─────────────────────────────────────────────────────────────────────────
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profissional = typeof profissionais.$inferSelect;

// ─── PERMISSÕES ───────────────────────────────────────────────────────────────
export const permissoes = mysqlTable("permissoes", {
  id: int("id").autoincrement().primaryKey(),
  profissionalId: int("profissionalId").notNull().unique(),
  podeAgendar: boolean("podeAgendar").default(true),
  podeCancelar: boolean("podeCancelar").default(false),
  podeRemarcar: boolean("podeRemarcar").default(false),
  podeEditarCliente: boolean("podeEditarCliente").default(false),
  podeSolicitarBloqueio: boolean("podeSolicitarBloqueio").default(true),
  podeVerComissoes: boolean("podeVerComissoes").default(false),
  podeVerFinanceiro: boolean("podeVerFinanceiro").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }),
  dataNascimento: dateField("dataNascimento"),
  endereco: text("endereco"),
  observacoes: text("observacoes"),
  tags: json("tags").$type<string[]>().default([]),
  saldoSessoes: int("saldoSessoes").default(0),
  totalGasto: decimal("totalGasto", { precision: 10, scale: 2 }).default("0.00"),
  totalAtendimentos: int("totalAtendimentos").default(0),
  ultimoAtendimento: timestamp("ultimoAtendimento"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────
export const servicos = mysqlTable("servicos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  duracaoMinutos: int("duracaoMinutos").default(60),
  categoria: varchar("categoria", { length: 100 }),
  cor: varchar("cor", { length: 7 }).default("#7c3aed"),
  ativo: boolean("ativo").default(true),
  percentualComissao: decimal("percentualComissao", { precision: 5, scale: 2 }).default("0.00"),
  custoFixo: decimal("custoFixo", { precision: 10, scale: 2 }).default("0.00"), // custo de insumos/produtos do serviço
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Servico = typeof servicos.$inferSelect;

// ─── PROFISSIONAL-SERVIÇO (vínculo N:N) ──────────────────────────────────────
export const profissionalServicos = mysqlTable("profissionalServicos", {
  id: int("id").autoincrement().primaryKey(),
  profissionalId: int("profissionalId").notNull(),
  servicoId: int("servicoId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProfissionalServico = typeof profissionalServicos.$inferSelect;

// ─── AGENDAMENTOS ─────────────────────────────────────────────────────────────
export const agendamentos = mysqlTable("agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  clienteId: int("clienteId").notNull(),
  profissionalId: int("profissionalId"),
  servicoId: int("servicoId").notNull(),
  data: dateField("data").notNull(),
  horaInicio: time("horaInicio").notNull(),
  horaFim: time("horaFim").notNull(),
  status: mysqlEnum("status", [
    "pre_agendado",
    "aguardando_reserva",
    "agendado",
    "confirmado",
    "em_andamento",
    "concluido",
    "cancelado",
    "faltou",
  ]).default("agendado").notNull(),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }).notNull(),
  valorReserva: decimal("valorReserva", { precision: 10, scale: 2 }),
  reservaPaga: boolean("reservaPaga").default(false),
  reservaPagaEm: timestamp("reservaPagaEm"),
  reservaExpiracaoEm: timestamp("reservaExpiracaoEm"),
  tipoPagamento: mysqlEnum("tipoPagamento", ["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]),
  desconto: decimal("desconto", { precision: 10, scale: 2 }).default("0"),
  observacoes: text("observacoes"),
  observacoesInternas: text("observacoesInternas"),
  confirmadoEm: timestamp("confirmadoEm"),
  concluidoEm: timestamp("concluidoEm"),
  notificacaoEnviada: boolean("notificacaoEnviada").default(false),
  notificacaoEnviadaEm: timestamp("notificacaoEnviadaEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agendamento = typeof agendamentos.$inferSelect;

// ─── ITENS DE AGENDAMENTO (múltiplos serviços) ───────────────────────────────
export const agendamentoItens = mysqlTable("agendamento_itens", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull(),
  servicoId: int("servicoId").notNull(),
  profissionalId: int("profissionalId"), // null = usa o profissional principal do agendamento
  horaInicio: varchar("horaInicio", { length: 5 }), // ex: "14:00" — null = usa hora do agendamento
  horaFim: varchar("horaFim", { length: 5 }),       // ex: "15:00" — null = calculado pela duração do serviço
  valorUnitario: decimal("valorUnitario", { precision: 10, scale: 2 }).notNull(),
  pacoteClienteItemId: int("pacoteClienteItemId"), // null = sessão avulsa, preenchido = sessão de pacote
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgendamentoItem = typeof agendamentoItens.$inferSelect;

// ─── PAGAMENTOS DE AGENDAMENTO ────────────────────────────────────────────────
export const agendamentoPagamentos = mysqlTable("agendamento_pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  meioPagamento: varchar("meioPagamento", { length: 100 }),
  numeroParcelas: int("numeroParcelas").default(1), // apenas registro informativo
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgendamentoPagamento = typeof agendamentoPagamentos.$inferSelect;

// ─── BLOQUEIOS DE AGENDA ──────────────────────────────────────────────────────
export const bloqueiosAgenda = mysqlTable("bloqueios_agenda", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  profissionalId: int("profissionalId").notNull(),
  dataInicio: dateField("dataInicio").notNull(),
  horaInicio: time("horaInicio").notNull(),
  dataFim: dateField("dataFim").notNull(),
  horaFim: time("horaFim").notNull(),
  motivo: varchar("motivo", { length: 500 }),
  status: mysqlEnum("status", ["pendente", "aprovado", "recusado"]).default("pendente").notNull(),
  motivoRecusa: varchar("motivoRecusa", { length: 500 }),
  aprovadoPorId: int("aprovadoPorId"),
  recorrencia: mysqlEnum("recorrencia", ["nenhuma", "semanal", "mensal"]).default("nenhuma").notNull(),
  dataFimRecorrencia: dateField("dataFimRecorrencia"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── COMISSÕES ────────────────────────────────────────────────────────────────
export const comissoes = mysqlTable("comissoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  profissionalId: int("profissionalId").notNull(),
  agendamentoId: int("agendamentoId").notNull(),
  valorServico: decimal("valorServico", { precision: 10, scale: 2 }).notNull(),
  percentualComissao: decimal("percentualComissao", { precision: 5, scale: 2 }).notNull(),
  tipoPagamento: mysqlEnum("tipoPagamento", ["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]),
  taxaMaquininha: decimal("taxaMaquininha", { precision: 10, scale: 2 }).default("0.00"),
  custoReposicao: decimal("custoReposicao", { precision: 10, scale: 2 }).default("0.00"),
  valorLiquido: decimal("valorLiquido", { precision: 10, scale: 2 }).notNull(),
  valorComissao: decimal("valorComissao", { precision: 10, scale: 2 }).notNull(),
  receitaDona: decimal("receitaDona", { precision: 10, scale: 2 }).default("0.00"),
  paga: boolean("paga").default(false),
  pagaEm: timestamp("pagaEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────
export const notificacoes = mysqlTable("notificacoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  destinatarioId: int("destinatarioId"),
  tipo: mysqlEnum("tipo", [
    "agendamento_criado",
    "agendamento_confirmado",
    "agendamento_cancelado",
    "agendamento_remarcado",
    "bloqueio_aprovado",
    "bloqueio_recusado",
    "bloqueio_solicitado",
    "bloqueio_cancelado",
    "reserva_expirada",
    "lembrete",
    "sistema",
  ]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  dadosContexto: json("dadosContexto"),
  lida: boolean("lida").default(false),
  lidaEm: timestamp("lidaEm"),
  ocultada: boolean("ocultada").default(false),
  ocultadaEm: timestamp("ocultadaEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── AUTOMAÇÕES ───────────────────────────────────────────────────────────────
export const automacoes = mysqlTable("automacoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoGatilho: mysqlEnum("tipoGatilho", [
    "evento",
    "data_fixa",
    "aniversario_mes",
    "dias_antes_agendamento",
    "horas_antes_agendamento",
    "horas_apos_agendamento",
    "dias_depois_agendamento",
    "manual",
  ]).notNull(),
  // Para tipo 'evento'
  evento: varchar("evento", { length: 100 }),
  delayMinutos: int("delayMinutos"),
  // Para tipo 'data_fixa'
  dataFixaDia: int("dataFixaDia"),
  dataFixaMes: int("dataFixaMes"),
  dataFixaHora: time("dataFixaHora"),
  // Para tipo 'dias_antes_agendamento' ou 'aniversario_mes'
  diasAntesDepois: int("diasAntesDepois"),
  horaDisparo: time("horaDisparo"),
  // Conteúdo
  canalEnvio: mysqlEnum("canalEnvio", ["whatsapp", "email", "sms"]).default("whatsapp").notNull(),
  tituloMensagem: varchar("tituloMensagem", { length: 255 }),
  corpoMensagem: text("corpoMensagem").notNull(),
  // Segmentação
  segmentacaoTipo: mysqlEnum("segmentacaoTipo", ["todas", "por_profissional", "por_tag"]).default("todas"),
  segmentacaoValor: varchar("segmentacaoValor", { length: 255 }),
  ativo: boolean("ativo").default(true),
  isTemplate: boolean("isTemplate").default(false),
  flowJson: text("flowJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
// ─── HISTÓRICO DE ENVIOS DE AUTOMAÇÕES ──────────────────────────────────────
export const historicoEnviosAutomacao = mysqlTable("historico_envios_automacao", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  automacaoId: int("automacaoId"),
  automacaoNome: varchar("automacaoNome", { length: 255 }),
  clienteId: int("clienteId"),
  clienteNome: varchar("clienteNome", { length: 255 }),
  agendamentoId: int("agendamentoId"), // Para deduplicação de lembretes por agendamento
  telefone: varchar("telefone", { length: 30 }),
  canal: mysqlEnum("canal", ["whatsapp", "email", "sms", "lembrete"]).default("whatsapp").notNull(),
  mensagem: text("mensagem"),
  status: mysqlEnum("status", ["enviado", "falhou", "pendente", "agendado"]).default("enviado").notNull(),
  erroDetalhe: text("erroDetalhe"),
  midiaUrl: text("midiaUrl"),
  isTeste: boolean("isTeste").default(false),
  enviarEm: timestamp("enviarEm"), // Data/hora programada para envio (para status pendente)
  servicoNome: varchar("servicoNome", { length: 255 }), // Nome do serviço do agendamento
  zapiMessageId: varchar("zapiMessageId", { length: 255 }), // ID da mensagem retornado pela Z-API
  messageStatus: mysqlEnum("messageStatus", ["sent", "delivered", "read", "failed"]).default("sent"), // Status de entrega Z-API
  messageStatusAt: timestamp("messageStatusAt"), // Quando o status foi atualizado
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

// ─── PRONTUÁRIOSS ──────────────────────────────────────────────────────────────
export const prontuarios = mysqlTable("prontuarios", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  clienteId: int("clienteId").notNull(),
  agendamentoId: int("agendamentoId"),
  profissionalId: int("profissionalId"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo"),
  tipo: mysqlEnum("tipo", ["anamnese", "evolucao", "foto", "documento", "contrato", "outro"]).default("evolucao"),
  arquivoUrl: text("arquivoUrl"),
  arquivoKey: text("arquivoKey"),
  arquivoNome: varchar("arquivoNome", { length: 255 }),
  arquivoTipo: varchar("arquivoTipo", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CONFIGURAÇÕES DE CORES ───────────────────────────────────────────────────
export const coresStatus = mysqlTable("cores_status", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().unique(),
  corAgendado: varchar("corAgendado", { length: 7 }).default("#3b82f6"),
  corConfirmado: varchar("corConfirmado", { length: 7 }).default("#10b981"),
  corConcluido: varchar("corConcluido", { length: 7 }).default("#6b7280"),
  corCancelado: varchar("corCancelado", { length: 7 }).default("#ef4444"),
  corFaltou: varchar("corFaltou", { length: 7 }).default("#f59e0b"),
  corPreAgendado: varchar("corPreAgendado", { length: 7 }).default("#8b5cf6"),
  corAguardandoReserva: varchar("corAguardandoReserva", { length: 7 }).default("#f97316"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── GRUPOS DE PERMISSÕES ─────────────────────────────────────────────────────
export const gruposPermissoes = mysqlTable("grupos_permissoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  cor: varchar("cor", { length: 7 }).default("#6366f1"),
  isDefault: boolean("isDefault").default(false),
  isAdmin: boolean("isAdmin").default(false), // supergrupo: bypass total de permissões, imutável
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrupoPermissoes = typeof gruposPermissoes.$inferSelect;
export type InsertGrupoPermissoes = typeof gruposPermissoes.$inferInsert;

// ─── PERMISSÕES DO GRUPO (granulares) ─────────────────────────────────────────
// Cada linha = 1 permissão específica de um grupo
export const permissoesGrupo = mysqlTable("permissoes_grupo", {
  id: int("id").autoincrement().primaryKey(),
  grupoId: int("grupoId").notNull(),
  // ── Agendamentos ──
  agendamentosVer: boolean("agendamentosVer").default(false),
  agendamentosCriar: boolean("agendamentosCriar").default(false),
  agendamentosEditar: boolean("agendamentosEditar").default(false),
  agendamentosCancelar: boolean("agendamentosCancelar").default(false),
  agendamentosRemarcar: boolean("agendamentosRemarcar").default(false),
  agendamentosConfirmar: boolean("agendamentosConfirmar").default(false),
  agendamentosConcluir: boolean("agendamentosConcluir").default(false),
  agendamentosVerTodos: boolean("agendamentosVerTodos").default(false), // ver de todos os profissionais
  agendaEscopo: mysqlEnum("agendaEscopo", ["proprio", "todos"]).default("proprio"), // escopo da agenda/calendário
  calendarioEscopo: mysqlEnum("calendarioEscopo", ["proprio", "todos"]).default("proprio"), // escopo do calendário
  // ── Clientes ──
  clientesVer: boolean("clientesVer").default(false),
  clientesCriar: boolean("clientesCriar").default(false),
  clientesEditar: boolean("clientesEditar").default(false),
  clientesExcluir: boolean("clientesExcluir").default(false),
  clientesVerHistorico: boolean("clientesVerHistorico").default(false),
  clientesVerProntuario: boolean("clientesVerProntuario").default(false),
  clientesEditarProntuario: boolean("clientesEditarProntuario").default(false),
  clientesVerContato: boolean("clientesVerContato").default(false), // telefone/email
  // ── Profissionais ──
  profissionaisVer: boolean("profissionaisVer").default(false),
  profissionaisCriar: boolean("profissionaisCriar").default(false),
  profissionaisEditar: boolean("profissionaisEditar").default(false),
  profissionaisExcluir: boolean("profissionaisExcluir").default(false),
  profissionaisGerenciarPermissoes: boolean("profissionaisGerenciarPermissoes").default(false),
  // ── Serviços ──
  servicosVer: boolean("servicosVer").default(false),
  servicosCriar: boolean("servicosCriar").default(false),
  servicosEditar: boolean("servicosEditar").default(false),
  servicosExcluir: boolean("servicosExcluir").default(false),
  // ── Financeiro ──
  financeiroVer: boolean("financeiroVer").default(false),
  financeiroVerComissoes: boolean("financeiroVerComissoes").default(false),
  financeiroEditarComissoes: boolean("financeiroEditarComissoes").default(false),
  financeiroVerReceita: boolean("financeiroVerReceita").default(false),
  financeiroVerCustos: boolean("financeiroVerCustos").default(false),
  financeiroMarcarPago: boolean("financeiroMarcarPago").default(false),
  financeiroVerRelatorios: boolean("financeiroVerRelatorios").default(false),
  // ── Agenda / Bloqueios ──
  agendaSolicitarBloqueio: boolean("agendaSolicitarBloqueio").default(false),
  agendaAprovarBloqueio: boolean("agendaAprovarBloqueio").default(false),
  agendaVerBloqueiosTodos: boolean("agendaVerBloqueiosTodos").default(false),
  // ── Automações ──
  automacoesVer: boolean("automacoesVer").default(false),
  automacoesCriar: boolean("automacoesCriar").default(false),
  automacoesEditar: boolean("automacoesEditar").default(false),
  automacoesExcluir: boolean("automacoesExcluir").default(false),
  automacoesAtivar: boolean("automacoesAtivar").default(false),
  // ── Notificações ──
  notificacoesVer: boolean("notificacoesVer").default(true),
  notificacoesEscopo: mysqlEnum("notificacoesEscopo", ["proprio", "todos"]).default("proprio"), // proprio = só as suas, todos = de toda a empresa
  // ── Relatórios ──
  relatoriosVer: boolean("relatoriosVer").default(false),
  relatoriosExportar: boolean("relatoriosExportar").default(false),
  // ── Configurações ──
  configuracoesVer: boolean("configuracoesVer").default(false),
  configuracoesEditar: boolean("configuracoesEditar").default(false),
  // ── Usuários e Grupos ──
  usuariosVer: boolean("usuariosVer").default(false),
  usuariosConvidar: boolean("usuariosConvidar").default(false),
  usuariosEditar: boolean("usuariosEditar").default(false),
  usuariosRemover: boolean("usuariosRemover").default(false),
  gruposVer: boolean("gruposVer").default(false),
  gruposCriar: boolean("gruposCriar").default(false),
  gruposEditar: boolean("gruposEditar").default(false),
  gruposExcluir: boolean("gruposExcluir").default(false),
  // ── Pacotes ──
  pacotesVer: boolean("pacotesVer").default(false),
  pacotesEditar: boolean("pacotesEditar").default(false),
  pacotesExcluir: boolean("pacotesExcluir").default(false),
  // ── Dashboard ──
  dashboardVer: boolean("dashboardVer").default(false),
  dashboardVerMetricas: boolean("dashboardVerMetricas").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PermissoesGrupo = typeof permissoesGrupo.$inferSelect;
export type InsertPermissoesGrupo = typeof permissoesGrupo.$inferInsert;

// ─── MEMBROS DO GRUPO ─────────────────────────────────────────────────────────
export const membrosGrupo = mysqlTable("membros_grupo", {
  id: int("id").autoincrement().primaryKey(),
  grupoId: int("grupoId").notNull(),
  userId: int("userId").notNull(),
  empresaId: int("empresaId").notNull(),
  adicionadoPorId: int("adicionadoPorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MembroGrupo = typeof membrosGrupo.$inferSelect;

// ─── CONVITES DE USUÁRIO ──────────────────────────────────────────────────────
export const convitesUsuario = mysqlTable("convites_usuario", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  grupoId: int("grupoId"),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pendente", "aceito", "expirado"]).default("pendente").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  convidadoPorId: int("convidadoPorId").notNull(),
  aceitoEm: timestamp("aceitoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConviteUsuario = typeof convitesUsuario.$inferSelect;

// ─── USUÁRIOS DO SISTEMA (cadastro por admin, com senha) ──────────────────────
export const systemUsers = mysqlTable("system_users", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  grupoId: int("grupoId"),
  profissionalId: int("profissionalId"), // vínculo com profissional da empresa
  avatarUrl: text("avatarUrl"), // foto de perfil do usuário
  ativo: boolean("ativo").default(true).notNull(),
  ultimoAcesso: timestamp("ultimoAcesso"),
  criadoPorId: int("criadoPorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemUser = typeof systemUsers.$inferSelect;
export type InsertSystemUser = typeof systemUsers.$inferInsert;

// ─── PIPELINE KANBAN ──────────────────────────────────────────────────────────
export const pipelines = mysqlTable("pipelines", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 120 }).notNull(),
  ordem: int("ordem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = typeof pipelines.$inferInsert;

export const pipelineColunas = mysqlTable("pipeline_colunas", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipelineId").notNull(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 120 }).notNull(),
  ordem: int("ordem").default(0).notNull(),
  cor: varchar("cor", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PipelineColuna = typeof pipelineColunas.$inferSelect;
export type InsertPipelineColuna = typeof pipelineColunas.$inferInsert;

export const pipelineCartoes = mysqlTable("pipeline_cartoes", {
  id: int("id").autoincrement().primaryKey(),
  colunaId: int("colunaId").notNull(),
  pipelineId: int("pipelineId").notNull(),
  empresaId: int("empresaId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: mysqlEnum("status", ["em_andamento", "congelado", "cancelado", "concluido"]).default("em_andamento").notNull(),
  clienteId: int("clienteId"),
  clienteNome: varchar("clienteNome", { length: 120 }),
  responsavelId: int("responsavelId"),
  responsavelNome: varchar("responsavelNome", { length: 120 }),
  lembrete: dateField("lembrete"),
  valor: decimal("valor", { precision: 10, scale: 2 }),
  agendamentoId: int("agendamentoId"),
  ordem: int("ordem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PipelineCartao = typeof pipelineCartoes.$inferSelect;
export type InsertPipelineCartao = typeof pipelineCartoes.$inferInsert;

// ─── IA FINANCEIRA — SCORE DE SAÚDE ──────────────────────────────────────────
export const scoreFinanceiro = mysqlTable("score_financeiro", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  score: int("score").notNull(), // 0-100
  status: mysqlEnum("status", ["saudavel", "atencao", "risco"]).notNull(),
  explicacao: text("explicacao").notNull(), // Texto simples para o usuário
  motivos: json("motivos").notNull(), // Array de strings com motivos da nota
  dicas: json("dicas").notNull(), // Array de strings com dicas de melhoria
  detalhes: json("detalhes"), // Objeto com pontuação por fator
  calculadoEm: timestamp("calculadoEm").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScoreFinanceiro = typeof scoreFinanceiro.$inferSelect;

// ─── IA FINANCEIRA — ALERTAS PROATIVOS ───────────────────────────────────────
export const alertasFinanceiros = mysqlTable("alertas_financeiros", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  tipo: mysqlEnum("tipo", [
    "caixa_negativo",
    "contas_vencendo",
    "inadimplencia",
    "gastos_altos",
    "score_caiu",
    "receita_baixa",
    "concentracao_receita",
    "fluxo_negativo",
    "geral",
  ]).notNull(),
  prioridade: mysqlEnum("prioridade", ["alta", "media", "baixa"]).default("media").notNull(),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  mensagem: text("mensagem").notNull(),
  acao: varchar("acao", { length: 300 }), // Sugestão de ação
  lido: boolean("lido").default(false).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});
export type AlertaFinanceiro = typeof alertasFinanceiros.$inferSelect;

// ─── IA CLIENTES — ANÁLISE INTELIGENTE ───────────────────────────────────────
export const analiseClientes = mysqlTable("analise_clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  clienteId: int("clienteId").notNull(),
  classificacao: mysqlEnum("classificacao", [
    "principal",     // 🟢 Maior gerador de receita
    "bom_pagador",   // 💎 Paga em dia e é consistente
    "em_crescimento",// 📈 Aumentando frequência/valor
    "em_queda",      // 📉 Diminuindo frequência/valor
    "inativo",       // 💤 Sumiu (sem movimentação recente)
    "atraso_frequente", // ⚠️ Atrasa com frequência
    "risco",         // 🚨 Pode dar problema
    "novo",          // 🆕 Cliente novo, poucos dados
  ]).notNull(),
  scoreCliente: int("scoreCliente").notNull(), // 0-100
  resumo: text("resumo").notNull(), // Texto simples para o usuário
  detalhes: json("detalhes"), // Métricas brutas: totalReceita, qtdAgendamentos, etc.
  calculadoEm: timestamp("calculadoEm").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AnaliseCliente = typeof analiseClientes.$inferSelect;

// ─── IA CLIENTES — INSIGHTS ───────────────────────────────────────────────────
export const insightsClientes = mysqlTable("insights_clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  tipo: mysqlEnum("tipo", [
    "concentracao_receita",
    "clientes_inativos",
    "inadimplencia_frequente",
    "cliente_em_queda",
    "cliente_importante_atrasou",
    "bons_clientes",
    "geral",
  ]).notNull(),
  prioridade: mysqlEnum("prioridade", ["alta", "media", "baixa"]).default("media").notNull(),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  mensagem: text("mensagem").notNull(),
  acao: varchar("acao", { length: 300 }),
  lido: boolean("lido").default(false).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});
export type InsightCliente = typeof insightsClientes.$inferSelect;

// ─── PACOTES DE SERVIÇOS ──────────────────────────────────────────────────────

/** Modelos reutilizáveis de pacote (templates) */
export const pacotesModelos = mysqlTable("pacotes_modelos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 150 }).notNull(),
  descricao: text("descricao"),
  preco: decimal("preco", { precision: 10, scale: 2 }).notNull().default("0.00"),
  validadeDias: int("validadeDias"), // null = sem validade
  ativo: boolean("ativo").default(true).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});
export type PacoteModelo = typeof pacotesModelos.$inferSelect;

/** Itens de um modelo de pacote (serviço + quantidade) */
export const pacotesModelosItens = mysqlTable("pacotes_modelos_itens", {
  id: int("id").autoincrement().primaryKey(),
  modeloId: int("modeloId").notNull(),
  servicoId: int("servicoId").notNull(),
  quantidade: int("quantidade").notNull().default(1),
});
export type PacoteModeloItem = typeof pacotesModelosItens.$inferSelect;

/** Pacote fechado por uma cliente específica */
export const pacotesClientes = mysqlTable("pacotes_clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  clienteId: int("clienteId").notNull(),
  modeloId: int("modeloId"), // null se pacote avulso
  nome: varchar("nome", { length: 150 }).notNull(), // cópia do nome do modelo
  valorPago: decimal("valorPago", { precision: 10, scale: 2 }).notNull().default("0.00"),
  formaPagamento: varchar("formaPagamento", { length: 60 }),
  numeroParcelas: int("numeroParcelas").default(1).notNull(),
  valorParcela: decimal("valorParcela", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["ativo", "concluido", "vencido", "cancelado"]).default("ativo").notNull(),
  dataAbertura: timestamp("dataAbertura").defaultNow().notNull(),
  dataVencimento: timestamp("dataVencimento"), // null = sem vencimento
  automacaoRenovacao: boolean("automacaoRenovacao").default(false),
  dataValidade: date("dataValidade"),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});
export type PacoteCliente = typeof pacotesClientes.$inferSelect;

/** Itens de um pacote de cliente (serviço + qtd total + qtd usada) */
export const pacotesClientesItens = mysqlTable("pacotes_clientes_itens", {
  id: int("id").autoincrement().primaryKey(),
  pacoteClienteId: int("pacoteClienteId").notNull(),
  servicoId: int("servicoId").notNull(),
  quantidadeTotal: int("quantidadeTotal").notNull().default(1),
  quantidadeUsada: int("quantidadeUsada").notNull().default(0),
});
export type PacoteClienteItem = typeof pacotesClientesItens.$inferSelect;

/** Notificações enviadas sobre pacotes prestes a vencer */
export const notificacoesPacotes = mysqlTable("notificacoes_pacotes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  pacoteClienteId: int("pacoteClienteId").notNull(),
  clienteId: int("clienteId").notNull(),
  tipo: mysqlEnum("tipo", ["vencimento_proximo", "sessoes_restantes", "pacote_vencido"]).notNull(),
  mensagem: text("mensagem").notNull(),
  diasParaVencer: int("diasParaVencer"), // quantos dias faltam para vencer quando a notif foi disparada
  sessoesRestantes: int("sessoesRestantes"), // total de sessões restantes no pacote
  canal: mysqlEnum("canal", ["sistema", "whatsapp", "email"]).default("sistema").notNull(),
  lida: boolean("lida").default(false).notNull(),
  enviadoEm: timestamp("enviadoEm").defaultNow().notNull(),
});
export type NotificacaoPacote = typeof notificacoesPacotes.$inferSelect;

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().unique(),
  planType: mysqlEnum("planType", ["FREE", "SOLO", "PLUS", "PRO"]).default("FREE").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "annual"]).default("monthly").notNull(),
  status: mysqlEnum("status", ["active", "trial", "past_due", "canceled", "paused"]).default("trial").notNull(),
  trialEnd: timestamp("trialEnd"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;

// ─── USAGE TRACKER ────────────────────────────────────────────────────────────
export const usageTracker = mysqlTable("usage_tracker", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  mesAno: varchar("mesAno", { length: 7 }).notNull(),
  agendamentosCount: int("agendamentosCount").default(0).notNull(),
  notificacoesWhatsappCount: int("notificacoesWhatsappCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UsageTracker = typeof usageTracker.$inferSelect;

// ─── USAGE ALERTS ─────────────────────────────────────────────────────────────────────────────
// Rastreia notificações de limite enviadas para evitar duplicatas (cooldown 24h)
export const usageAlerts = mysqlTable("usage_alerts", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  alertType: varchar("alertType", { length: 64 }).notNull(),
  mesAno: varchar("mesAno", { length: 7 }).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type UsageAlert = typeof usageAlerts.$inferSelect;

// ─── TIPOS DE PROFISSIONAL ────────────────────────────────────────────────────
// Categorias como "Manicure", "Cabeleireiro", "Maquiadora", etc.
// Vinculadas à empresa e usadas para agrupar serviços.
export const tiposProfissional = mysqlTable("tipos_profissional", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 7 }).default("#7c3aed"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TipoProfissional = typeof tiposProfissional.$inferSelect;

// Vínculo N:N entre profissional e tipos de profissional
export const profissionalTipos = mysqlTable("profissional_tipos", {
  id: int("id").autoincrement().primaryKey(),
  profissionalId: int("profissionalId").notNull(),
  tipoProfissionalId: int("tipoProfissionalId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProfissionalTipo = typeof profissionalTipos.$inferSelect;

// ─── Módulo Contas a Pagar ────────────────────────────────────────────────────
// Categorias de despesa (ex: Aluguel, Produtos, Fornecedores, Impostos, etc.)
export const categoriasDespesa = mysqlTable("categorias_despesa", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 7 }).default("#6b7280"),
  icone: varchar("icone", { length: 50 }).default("receipt"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CategoriaDespesa = typeof categoriasDespesa.$inferSelect;

// Contas a pagar
export const contasPagar = mysqlTable("contas_pagar", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  descricao: varchar("descricao", { length: 200 }).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: varchar("dataVencimento", { length: 10 }).notNull(),
  dataPagamento: varchar("dataPagamento", { length: 10 }),
  categoriaId: int("categoriaId"),
  status: mysqlEnum("status_conta", ["pendente", "pago", "vencido", "cancelado"]).default("pendente").notNull(),
  recorrente: boolean("recorrente").default(false).notNull(),
  recorrenciaTipo: mysqlEnum("recorrencia_tipo", ["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]),
  observacoes: text("observacoes"),
  fornecedor: varchar("fornecedor", { length: 150 }),
  meioPagamentoId: int("meioPagamentoId"),
  comprovante: varchar("comprovante", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContaPagar = typeof contasPagar.$inferSelect;

// ─── SESSÃO WHATSAPP (Baileys) ────────────────────────────────────────────────
// Persiste credenciais no banco para sobreviver a reinicializações do servidor
export const waSession = mysqlTable("wa_session", {
  id: varchar("id", { length: 200 }).primaryKey(),  // ex: "creds", "app-state-sync-key-xxx"
  data: longtext("data").notNull(),                  // JSON serializado do objeto Baileys
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WaSession = typeof waSession.$inferSelect;

// ─── LOG DE EVENTOS WHATSAPP ──────────────────────────────────────────────────
export const waConnectionLog = mysqlTable("wa_connection_log", {
  id: int("id").autoincrement().primaryKey(),
  event: mysqlEnum("event", ["connected", "disconnected", "qr_ready", "logged_out", "reconnecting", "reconnect_attempt", "error"]).notNull(),
  detail: varchar("detail", { length: 500 }),          // descrição human-readable
  statusCode: int("statusCode"),                       // código HTTP/Baileys da desconexão (ex: 408, 401, 515)
  motivo: varchar("motivo", { length: 100 }),           // classificação: timeout_rede, logout_dispositivo, erro_auth, servidor_reiniciou, etc.
  duracaoSessaoMs: bigint("duracaoSessaoMs", { mode: "number" }),  // ms desde último connected até este evento
  tentativa: int("tentativa"),                         // número da tentativa de reconexão
  detalheTecnico: text("detalheTecnico"),               // stack trace ou mensagem de erro completa
  telefone: varchar("telefone", { length: 30 }),        // número conectado (quando disponível)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WaConnectionLog = typeof waConnectionLog.$inferSelect;

// ─── CONTAS A RECEBER ────────────────────────────────────────────────────────
export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  descricao: varchar("descricao", { length: 200 }).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: varchar("dataVencimento", { length: 10 }).notNull(),
  dataRecebimento: varchar("dataRecebimento", { length: 10 }),
  status: mysqlEnum("status_receber", ["pendente", "recebido", "vencido", "cancelado"]).default("pendente").notNull(),
  origem: mysqlEnum("origem_receber", ["manual", "agendamento", "pacote"]).default("manual").notNull(),
  origemId: int("origemId"),
  clienteId: int("clienteId"),
  profissionalId: int("profissionalId"),
  tipoPagamento: mysqlEnum("tipo_pagamento_receber", ["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]),
  meioPagamentoId: int("meioPagamentoId"),
  observacoes: text("observacoes"),
  recorrente: boolean("recorrente").default(false).notNull(),
  recorrenciaTipo: mysqlEnum("recorrencia_tipo_receber", ["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContaReceber = typeof contasReceber.$inferSelect;

// ─── PUSH SUBSCRIPTIONS (PWA) ─────────────────────────────────────────────────
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  empresaId: int("empresaId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

// ─── TOKENS DE CONFIRMAÇÃO DE AGENDAMENTO ─────────────────────────────────────
export const tokensConfirmacao = mysqlTable("tokens_confirmacao", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull(),
  empresaId: int("empresaId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usadoEm: timestamp("usadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TokenConfirmacao = typeof tokensConfirmacao.$inferSelect;


// ─── PERMISSÕES INDIVIDUAIS (override sobre grupo) ────────────────────────────
// Cada campo pode ser null (herda do grupo), true (permite) ou false (bloqueia)
// Prioridade: individual > grupo > padrão (negar)
export const permissoesIndividuais = mysqlTable("permissoes_individuais", {
  id: int("id").autoincrement().primaryKey(),
  profissionalId: int("profissionalId").notNull().unique(),
  // ── Agendamentos ──
  agendamentosVer: boolean("agendamentosVer"),
  agendamentosCriar: boolean("agendamentosCriar"),
  agendamentosEditar: boolean("agendamentosEditar"),
  agendamentosCancelar: boolean("agendamentosCancelar"),
  agendamentosRemarcar: boolean("agendamentosRemarcar"),
  agendamentosConfirmar: boolean("agendamentosConfirmar"),
  agendamentosConcluir: boolean("agendamentosConcluir"),
  agendamentosVerTodos: boolean("agendamentosVerTodos"),
  // ── Clientes ──
  clientesVer: boolean("clientesVer"),
  clientesCriar: boolean("clientesCriar"),
  clientesEditar: boolean("clientesEditar"),
  clientesExcluir: boolean("clientesExcluir"),
  clientesVerHistorico: boolean("clientesVerHistorico"),
  clientesVerProntuario: boolean("clientesVerProntuario"),
  clientesEditarProntuario: boolean("clientesEditarProntuario"),
  clientesVerContato: boolean("clientesVerContato"),
  // ── Profissionais ──
  profissionaisVer: boolean("profissionaisVer"),
  profissionaisCriar: boolean("profissionaisCriar"),
  profissionaisEditar: boolean("profissionaisEditar"),
  profissionaisExcluir: boolean("profissionaisExcluir"),
  profissionaisGerenciarPermissoes: boolean("profissionaisGerenciarPermissoes"),
  // ── Serviços ──
  servicosVer: boolean("servicosVer"),
  servicosCriar: boolean("servicosCriar"),
  servicosEditar: boolean("servicosEditar"),
  servicosExcluir: boolean("servicosExcluir"),
  // ── Financeiro ──
  financeiroVer: boolean("financeiroVer"),
  financeiroVerComissoes: boolean("financeiroVerComissoes"),
  financeiroEditarComissoes: boolean("financeiroEditarComissoes"),
  financeiroVerReceita: boolean("financeiroVerReceita"),
  financeiroVerCustos: boolean("financeiroVerCustos"),
  financeiroMarcarPago: boolean("financeiroMarcarPago"),
  financeiroVerRelatorios: boolean("financeiroVerRelatorios"),
  // ── Agenda / Bloqueios ──
  agendaSolicitarBloqueio: boolean("agendaSolicitarBloqueio"),
  agendaAprovarBloqueio: boolean("agendaAprovarBloqueio"),
  agendaVerBloqueiosTodos: boolean("agendaVerBloqueiosTodos"),
  // ── Automações ──
  automacoesVer: boolean("automacoesVer"),
  automacoesCriar: boolean("automacoesCriar"),
  automacoesEditar: boolean("automacoesEditar"),
  automacoesExcluir: boolean("automacoesExcluir"),
  automacoesAtivar: boolean("automacoesAtivar"),
  // ── Notificações ──
  notificacoesVer: boolean("notificacoesVer"),
  // ── Relatórios ──
  relatoriosVer: boolean("relatoriosVer"),
  relatoriosExportar: boolean("relatoriosExportar"),
  // ── Configurações ──
  configuracoesVer: boolean("configuracoesVer"),
  configuracoesEditar: boolean("configuracoesEditar"),
  // ── Usuários e Grupos ──
  usuariosVer: boolean("usuariosVer"),
  usuariosConvidar: boolean("usuariosConvidar"),
  usuariosEditar: boolean("usuariosEditar"),
  usuariosRemover: boolean("usuariosRemover"),
  gruposVer: boolean("gruposVer"),
  gruposCriar: boolean("gruposCriar"),
  gruposEditar: boolean("gruposEditar"),
  gruposExcluir: boolean("gruposExcluir"),
  // ── Dashboard ──
  dashboardVer: boolean("dashboardVer"),
  dashboardVerMetricas: boolean("dashboardVerMetricas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PermissoesIndividuais = typeof permissoesIndividuais.$inferSelect;
export type InsertPermissoesIndividuais = typeof permissoesIndividuais.$inferInsert;

// ─── Meios de Pagamento ───────────────────────────────────────────────────────
export const meiosPagamento = mysqlTable("meios_pagamento", {
  id: int("id").primaryKey().autoincrement(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // "pix" | "debito" | "credito" | "dinheiro" | "outro"
  parcelamentoMaximo: int("parcelamentoMaximo").default(1).notNull(),
  taxaFixa: decimal("taxaFixa", { precision: 5, scale: 2 }).default("0.00").notNull(),
  descontarDoVendedor: boolean("descontarDoVendedor").default(false).notNull(),
  descontarDoAtendente: boolean("descontarDoAtendente").default(false).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MeioPagamento = typeof meiosPagamento.$inferSelect;
export type InsertMeioPagamento = typeof meiosPagamento.$inferInsert;

// Taxas por parcela (para cartão de crédito)
export const taxasParcela = mysqlTable("taxas_parcela", {
  id: int("id").primaryKey().autoincrement(),
  meioPagamentoId: int("meioPagamentoId").notNull(),
  parcela: int("parcela").notNull(),
  taxa: decimal("taxa", { precision: 5, scale: 2 }).notNull(),
});
export type TaxaParcela = typeof taxasParcela.$inferSelect;
export type InsertTaxaParcela = typeof taxasParcela.$inferInsert;

// ─── DASHBOARD CONFIG (layout personalizado por usuário) ──────────────────────
export const dashboardConfig = mysqlTable("dashboard_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  empresaId: int("empresaId").notNull(),
  // JSON array de widgets: [{ id, visible, order, size }]
  layout: json("layout").notNull().$type<DashboardWidget[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardWidget = {
  id: string;
  visible: boolean;
  order: number;
  size: "sm" | "md" | "lg" | "full";
};

export type DashboardConfig = typeof dashboardConfig.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfig.$inferInsert;

// ─── PLANOS DE ASSINATURA ─────────────────────────────────────────────────────
export const planos = mysqlTable("planos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  precoMensal: decimal("precoMensal", { precision: 10, scale: 2 }).notNull(),
  precoAnual: decimal("precoAnual", { precision: 10, scale: 2 }).notNull(),
  stripeProductId: varchar("stripeProductId", { length: 128 }),
  stripePriceIdMensal: varchar("stripePriceIdMensal", { length: 128 }),
  stripePriceIdAnual: varchar("stripePriceIdAnual", { length: 128 }),
  // Qual API de WhatsApp usar para empresas neste plano (interno Orizontech)
  apiWhatsapp: mysqlEnum("apiWhatsapp", ["baileys", "zapi"]).default("baileys").notNull(),
  limiteUsuarios: int("limiteUsuarios").default(3).notNull(),
  limiteAgendamentosMes: int("limiteAgendamentosMes").default(200).notNull(),
  temIaFinanceira: boolean("temIaFinanceira").default(false).notNull(),
  temIaClientes: boolean("temIaClientes").default(false).notNull(),
  temPortalPublico: boolean("temPortalPublico").default(true).notNull(),
  temAutomacoes: boolean("temAutomacoes").default(true).notNull(),
  temPipeline: boolean("temPipeline").default(false).notNull(),
  slaSuporteHoras: int("slaSuporteHoras").default(48).notNull(),
  ordem: int("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  recursos: json("recursos").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Plano = typeof planos.$inferSelect;
export type InsertPlano = typeof planos.$inferInsert;

// ─── ASSINATURAS DAS EMPRESAS ─────────────────────────────────────────────────
export const assinaturas = mysqlTable("assinaturas", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  planoId: int("planoId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  status: mysqlEnum("status", ["trial", "ativa", "inadimplente", "cancelada", "suspensa"]).default("trial").notNull(),
  ciclo: mysqlEnum("ciclo", ["mensal", "anual"]).default("mensal").notNull(),
  trialFim: timestamp("trialFim"),
  periodoInicio: timestamp("periodoInicio"),
  periodoFim: timestamp("periodoFim"),
  canceladaEm: timestamp("canceladaEm"),
  // Configurações internas de API WhatsApp (visível apenas para Orizontech)
  zapiInstanceId: varchar("zapiInstanceId", { length: 255 }),
  zapiToken: varchar("zapiToken", { length: 255 }),
  zapiAtivo: boolean("zapiAtivo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Assinatura = typeof assinaturas.$inferSelect;
export type InsertAssinatura = typeof assinaturas.$inferInsert;

// ─── BASE DE CONHECIMENTO (para IA de suporte) ────────────────────────────────
export const baseConhecimento = mysqlTable("base_conhecimento", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  categoria: varchar("categoria", { length: 100 }).default("geral"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BaseConhecimento = typeof baseConhecimento.$inferSelect;
export type InsertBaseConhecimento = typeof baseConhecimento.$inferInsert;

// ─── CHAMADOS DE SUPORTE ──────────────────────────────────────────────────────
export const chamados = mysqlTable("chamados", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["aberto", "em_atendimento", "aguardando_cliente", "resolvido", "fechado"]).default("aberto").notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
  agenteId: int("agenteId"),          // profissional da Orizontech responsável
  slaHoras: int("slaHoras").default(48).notNull(),
  slaVencidoEm: timestamp("slaVencidoEm"),
  primeiraRespostaEm: timestamp("primeiraRespostaEm"),
  resolvidoEm: timestamp("resolvidoEm"),
  fechadoEm: timestamp("fechadoEm"),
  avaliacaoNota: int("avaliacaoNota"),       // 1-5
  avaliacaoComentario: text("avaliacaoComentario"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Chamado = typeof chamados.$inferSelect;
export type InsertChamado = typeof chamados.$inferInsert;

// ─── MENSAGENS DE CHAMADOS ────────────────────────────────────────────────────
export const chamadoMensagens = mysqlTable("chamado_mensagens", {
  id: int("id").autoincrement().primaryKey(),
  chamadoId: int("chamadoId").notNull(),
  autorTipo: mysqlEnum("autorTipo", ["cliente", "agente", "ia"]).notNull(),
  autorId: int("autorId"),             // userId do autor (null para IA)
  autorNome: varchar("autorNome", { length: 255 }),
  conteudo: text("conteudo").notNull(),
  lido: boolean("lido").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChamadoMensagem = typeof chamadoMensagens.$inferSelect;
export type InsertChamadoMensagem = typeof chamadoMensagens.$inferInsert;
