import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getEmpresaByOwnerId: vi.fn().mockResolvedValue({ id: 1, nome: "Studio Test", tipo: "salao", telefone: null, email: null, endereco: null, logoUrl: null, corPrimaria: "#1a1a2e", corSecundaria: "#e8d5c4", whatsappNumero: null, whatsappApiKey: null, taxaMaquininha: "2.99", percentualDona: "0.00", reservaPercentual: "30.00", reservaHorasExpiracao: 24, ownerId: 1, createdAt: new Date(), updatedAt: new Date() }),
  getEmpresaDoUsuario: vi.fn().mockResolvedValue({ id: 1, nome: "Studio Test", tipo: "salao", telefone: null, email: null, endereco: null, logoUrl: null, corPrimaria: "#1a1a2e", corSecundaria: "#e8d5c4", whatsappNumero: null, whatsappApiKey: null, taxaMaquininha: "2.99", percentualDona: "0.00", reservaPercentual: "30.00", reservaHorasExpiracao: 24, ownerId: 1, createdAt: new Date(), updatedAt: new Date() }),
  createEmpresa: vi.fn().mockResolvedValue(1),
  updateEmpresa: vi.fn().mockResolvedValue(undefined),
  getProfissionaisByEmpresa: vi.fn().mockResolvedValue([]),
  getProfissionalById: vi.fn().mockResolvedValue(null),
  createProfissional: vi.fn().mockResolvedValue(1),
  updateProfissional: vi.fn().mockResolvedValue(undefined),
  getPermissoesByProfissional: vi.fn().mockResolvedValue(null),
  updatePermissoes: vi.fn().mockResolvedValue(undefined),
  getServicosByEmpresa: vi.fn().mockResolvedValue([]),
  createServico: vi.fn().mockResolvedValue(1),
  updateServico: vi.fn().mockResolvedValue(undefined),
  getAgendamentosByEmpresa: vi.fn().mockResolvedValue([]),
  getAgendamentoById: vi.fn().mockResolvedValue(null),
  createAgendamento: vi.fn().mockResolvedValue(1),
  updateAgendamento: vi.fn().mockResolvedValue(undefined),
  getAgendamentosExpirados: vi.fn().mockResolvedValue([]),
  getClientesByEmpresa: vi.fn().mockResolvedValue([]),
  getClienteById: vi.fn().mockResolvedValue(null),
  createCliente: vi.fn().mockResolvedValue(1),
  updateCliente: vi.fn().mockResolvedValue(undefined),
  getBloqueiosByEmpresa: vi.fn().mockResolvedValue([]),
  createBloqueio: vi.fn().mockResolvedValue(1),
  updateBloqueio: vi.fn().mockResolvedValue(undefined),
  getComissoesByEmpresa: vi.fn().mockResolvedValue([]),
  createComissao: vi.fn().mockResolvedValue(1),
  updateComissao: vi.fn().mockResolvedValue(undefined),
  getNotificacoesByDestinatario: vi.fn().mockResolvedValue([]),
  createNotificacao: vi.fn().mockResolvedValue(1),
  marcarNotificacaoLida: vi.fn().mockResolvedValue(undefined),
  marcarTodasNotificacoesLidas: vi.fn().mockResolvedValue(undefined),
  getAutomacoesByEmpresa: vi.fn().mockResolvedValue([]),
  createAutomacao: vi.fn().mockResolvedValue(1),
  updateAutomacao: vi.fn().mockResolvedValue(undefined),
  getProntuariosByCliente: vi.fn().mockResolvedValue([]),
  createProntuario: vi.fn().mockResolvedValue(1),
  getCoresStatus: vi.fn().mockResolvedValue(null),
  upsertCoresStatus: vi.fn().mockResolvedValue(undefined),
}));

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-test",
      email: "owner@test.com",
      name: "Owner Test",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-test",
      email: "user@test.com",
      name: "User Test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("retorna o usuário autenticado", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
    expect(result?.role).toBe("admin");
  });

  it("retorna null para usuário não autenticado", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("limpa o cookie de sessão e retorna sucesso", async () => {
    const ctx = createAdminCtx();
    const clearedCookies: string[] = [];
    ctx.res.clearCookie = (name: string) => { clearedCookies.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

describe("empresa.get", () => {
  it("retorna a empresa do usuário autenticado", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.empresa.get();
    expect(result).toBeDefined();
    expect(result?.nome).toBe("Studio Test");
  });
});

describe("profissionais.list", () => {
  it("retorna lista de profissionais da empresa", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profissionais.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("servicos.list", () => {
  it("retorna lista de serviços da empresa", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.servicos.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("agendamentos.list", () => {
  it("retorna lista de agendamentos da empresa", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agendamentos.list({ data: "2026-03-30" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("clientes.list", () => {
  it("retorna lista de clientes da empresa", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clientes.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("automacoes.list", () => {
  it("retorna lista de automações da empresa", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.automacoes.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notificacoes.list", () => {
  it("retorna lista de notificações do profissional", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notificacoes.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("configuracoes.getCores", () => {
  it("retorna cores de status da empresa", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.configuracoes.getCores();
    // pode ser null se não configurado ainda
    expect(result === null || typeof result === "object").toBe(true);
  });
});
