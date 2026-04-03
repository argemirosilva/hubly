import { describe, it, expect, vi, beforeEach } from "vitest";

/// ─── Mocks do DB ──────────────────────────────────────────────────────────────
// Helper para criar um mock de db que suporta db.select().from().where() como Promise
function makeDbChain(resolveWith: any[] = []) {
  const p = Promise.resolve(resolveWith);
  const chain: any = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(resolveWith),
    insert: () => chain,
    values: () => chain,
    onDuplicateKeyUpdate: () => Promise.resolve({}),
    update: () => chain,
    set: () => chain,
    then: (res: any, rej: any) => p.then(res, rej),
    catch: (rej: any) => p.catch(rej),
    finally: (fin: any) => p.finally(fin),
  };
  return chain;
}

vi.mock("./db", () => ({
  getEmpresaDoUsuario: vi.fn(),
  getEmpresaDoContexto: vi.fn(),
  getClientesByEmpresa: vi.fn(),
  saveScoreFinanceiro: vi.fn(),
  getScoreAtual: vi.fn(),
  getHistoricoScore: vi.fn(),
  saveAlertaFinanceiro: vi.fn(),
  getAlertasFinanceiros: vi.fn(),
  marcarAlertaFinanceiroLido: vi.fn(),
  marcarTodosAlertasLidos: vi.fn(),
  saveAnaliseCliente: vi.fn(),
  getAnaliseClientesByEmpresa: vi.fn(),
  getAnaliseByCliente: vi.fn(),
  saveInsightCliente: vi.fn(),
  getInsightsClientes: vi.fn(),
  marcarInsightClienteLido: vi.fn(),
  marcarTodosInsightsLidos: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Resposta de teste da IA" } }],
  }),
}));

import * as db from "./db";
import { appRouter } from "./routers";

const mockEmpresa = { id: 1, nome: "Empresa Teste", ownerId: 1 };
const mockUser = { id: 1, openId: "user1", name: "Teste", role: "admin" as const };

function createCaller() {
  return appRouter.createCaller({ user: mockUser } as any);
}

// ─── TESTES: IA Financeira ────────────────────────────────────────────────────
describe("iaFinanceiro", () => {
  beforeEach(() => {
    vi.mocked(db.getEmpresaDoUsuario).mockResolvedValue(mockEmpresa as any);
    vi.mocked(db.getEmpresaDoContexto).mockResolvedValue(mockEmpresa as any);
    vi.mocked(db.getScoreAtual).mockResolvedValue(null);
    vi.mocked(db.getHistoricoScore).mockResolvedValue([]);
    vi.mocked(db.saveScoreFinanceiro).mockResolvedValue(null as any);
    vi.mocked(db.saveAlertaFinanceiro).mockResolvedValue(null as any);
    vi.mocked(db.getAlertasFinanceiros).mockResolvedValue([]);
    vi.mocked(db.marcarAlertaFinanceiroLido).mockResolvedValue(undefined);
    vi.mocked(db.marcarTodosAlertasLidos).mockResolvedValue(undefined);
    vi.mocked(db.getClientesByEmpresa).mockResolvedValue([]);
    vi.mocked(db.getDb).mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    } as any);
  });

  it("getScore retorna null quando não há score calculado", async () => {
    const caller = createCaller();
    const result = await caller.iaFinanceiro.getScore();
    expect(result).toBeNull();
  });

  it("getScore retorna score quando existe", async () => {
    const mockScore = {
      id: 1, empresaId: 1, score: 75, status: "saudavel" as const,
      explicacao: "Financeiro saudável", motivos: [], dicas: [],
      detalhes: null, calculadoEm: new Date(), createdAt: new Date(),
    };
    vi.mocked(db.getScoreAtual).mockResolvedValue(mockScore);
    const caller = createCaller();
    const result = await caller.iaFinanceiro.getScore();
    expect(result).not.toBeNull();
    expect(result?.score).toBe(75);
    expect(result?.status).toBe("saudavel");
  });

  it("getHistorico retorna lista vazia quando não há histórico", async () => {
    const caller = createCaller();
    const result = await caller.iaFinanceiro.getHistorico();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("getAlertas retorna lista vazia quando não há alertas", async () => {
    const caller = createCaller();
    const result = await caller.iaFinanceiro.getAlertas({ apenasNaoLidos: false });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("getAlertas com apenasNaoLidos=true chama DB com parâmetro correto", async () => {
    const caller = createCaller();
    await caller.iaFinanceiro.getAlertas({ apenasNaoLidos: true });
    expect(db.getAlertasFinanceiros).toHaveBeenCalledWith(1, true);
  });

  it("marcarAlertaLido chama DB com id correto", async () => {
    const caller = createCaller();
    const result = await caller.iaFinanceiro.marcarAlertaLido({ id: 42 });
    expect(result).toEqual({ ok: true });
    expect(db.marcarAlertaFinanceiroLido).toHaveBeenCalledWith(42);
  });

  it("marcarTodosLidos chama DB com empresaId correto", async () => {
    const caller = createCaller();
    await caller.iaFinanceiro.marcarTodosLidos();
    expect(db.marcarTodosAlertasLidos).toHaveBeenCalledWith(1);
  });

  it("chat retorna resposta da IA", async () => {
    const mockScore = {
      id: 1, empresaId: 1, score: 65, status: "atencao" as const,
      explicacao: "Atenção necessária", motivos: ["Comissões pendentes"], dicas: ["Quite as comissões"],
      detalhes: null, calculadoEm: new Date(), createdAt: new Date(),
    };
    vi.mocked(db.getScoreAtual).mockResolvedValue(mockScore);
    const caller = createCaller();
    const result = await caller.iaFinanceiro.chat({ mensagem: "Como está meu financeiro?" });
    expect(result.resposta).toBe("Resposta de teste da IA");
  });

  it("getScore retorna null quando empresa não existe", async () => {
    vi.mocked(db.getEmpresaDoUsuario).mockResolvedValue(null as any);
    const caller = createCaller();
    const result = await caller.iaFinanceiro.getScore();
    expect(result).toBeNull();
  });
});

// ─── TESTES: IA Clientes ──────────────────────────────────────────────────────
describe("iaClientes", () => {
  beforeEach(() => {
    vi.mocked(db.getEmpresaDoUsuario).mockResolvedValue(mockEmpresa as any);
    vi.mocked(db.getEmpresaDoContexto).mockResolvedValue(mockEmpresa as any);
    vi.mocked(db.getClientesByEmpresa).mockResolvedValue([]);
    vi.mocked(db.saveAnaliseCliente).mockResolvedValue(null as any);
    vi.mocked(db.getAnaliseClientesByEmpresa).mockResolvedValue([]);
    vi.mocked(db.getAnaliseByCliente).mockResolvedValue(null);
    vi.mocked(db.saveInsightCliente).mockResolvedValue(null as any);
    vi.mocked(db.getInsightsClientes).mockResolvedValue([]);
    vi.mocked(db.marcarInsightClienteLido).mockResolvedValue(undefined);
    vi.mocked(db.marcarTodosInsightsLidos).mockResolvedValue(undefined);
    // getDb retorna null por padrão: o router trata null com early return
    vi.mocked(db.getDb).mockResolvedValue(null as any);
  });

  it("getAnalise retorna null quando não há análise", async () => {
    const caller = createCaller();
    const result = await caller.iaClientes.getAnalise();
    expect(result).toBeNull();
  });

  it("getClienteAnalise retorna null quando não há análise do cliente", async () => {
    const caller = createCaller();
    const result = await caller.iaClientes.getClienteAnalise({ clienteId: 1 });
    expect(result).toBeNull();
  });

  it("getClienteAnalise retorna análise quando existe", async () => {
    const mockAnalise = {
      id: 1, empresaId: 1, clienteId: 5,
      classificacao: "principal" as const, scoreCliente: 85,
      resumo: "Cliente principal", detalhes: null,
      calculadoEm: new Date(), createdAt: new Date(),
    };
    vi.mocked(db.getAnaliseByCliente).mockResolvedValue(mockAnalise);
    const caller = createCaller();
    const result = await caller.iaClientes.getClienteAnalise({ clienteId: 5 });
    expect(result).not.toBeNull();
    expect(result?.classificacao).toBe("principal");
    expect(result?.scoreCliente).toBe(85);
  });

  it("getInsights retorna lista vazia quando não há insights", async () => {
    const caller = createCaller();
    const result = await caller.iaClientes.getInsights({ apenasNaoLidos: false });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("marcarInsightLido chama DB com id correto", async () => {
    const caller = createCaller();
    const result = await caller.iaClientes.marcarInsightLido({ id: 7 });
    expect(result).toEqual({ ok: true });
    expect(db.marcarInsightClienteLido).toHaveBeenCalledWith(7);
  });

  it("marcarTodosLidos chama DB com empresaId correto", async () => {
    const caller = createCaller();
    await caller.iaClientes.marcarTodosLidos();
    expect(db.marcarTodosInsightsLidos).toHaveBeenCalledWith(1);
  });

  it("analisar retorna suficiente=false quando não há clientes", async () => {
    // getDb já está mockado com makeDbChain([]) no beforeEach
    const caller = createCaller();
    const result = await caller.iaClientes.analisar();
    expect(result.suficiente).toBe(false);
    expect(result.mensagem).toContain("dados suficientes");
  });

  it("chat retorna mensagem de análise pendente quando não há análise", async () => {
    const caller = createCaller();
    const result = await caller.iaClientes.chat({ mensagem: "Quem são meus melhores clientes?" });
    expect(result.resposta).toContain("análise de clientes");
  });

  it("chat retorna resposta da IA quando há análise", async () => {
    const mockAnalises = [
      { id: 1, empresaId: 1, clienteId: 1, classificacao: "principal" as const, scoreCliente: 90, resumo: "Top cliente", detalhes: { totalReceita: 1000 }, calculadoEm: new Date(), createdAt: new Date() },
    ];
    vi.mocked(db.getAnaliseClientesByEmpresa).mockResolvedValue(mockAnalises);
    const caller = createCaller();
    const result = await caller.iaClientes.chat({ mensagem: "Quem são meus melhores clientes?" });
    expect(result.resposta).toBe("Resposta de teste da IA");
  });
});
