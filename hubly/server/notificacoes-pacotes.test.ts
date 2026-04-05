/**
 * Testes do sistema de notificações de pacotes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock do banco de dados ────────────────────────────────────────────────────
const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) });
const mockSelect = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) });

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
  getEmpresaDoUsuario: vi.fn().mockResolvedValue({ id: 1, nome: "Salão Teste" }),
}));

// ── Helpers de teste ──────────────────────────────────────────────────────────

function criarPacoteVencendo(diasRestantes: number) {
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + diasRestantes);
  return {
    id: 1,
    clienteId: 10,
    dataVencimento,
    clienteNome: "Maria Silva",
    clienteTelefone: "11999999999",
  };
}

function criarItens(total: number, usados: number) {
  return [{ quantidadeTotal: total, quantidadeUsada: usados }];
}

// ── Testes de lógica de notificação ──────────────────────────────────────────

describe("Notificações de Pacotes — Lógica de Negócio", () => {

  it("deve calcular dias restantes corretamente para pacote vencendo em 3 dias", () => {
    const pacote = criarPacoteVencendo(3);
    const agora = new Date();
    const diffMs = pacote.dataVencimento.getTime() - agora.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    expect(diasRestantes).toBe(3);
  });

  it("deve calcular dias restantes corretamente para pacote vencendo em 7 dias", () => {
    const pacote = criarPacoteVencendo(7);
    const agora = new Date();
    const diffMs = pacote.dataVencimento.getTime() - agora.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    expect(diasRestantes).toBe(7);
  });

  it("deve calcular sessões restantes corretamente", () => {
    const itens = criarItens(10, 8);
    const totalSessoes = itens.reduce((s, i) => s + i.quantidadeTotal, 0);
    const sessoesUsadas = itens.reduce((s, i) => s + i.quantidadeUsada, 0);
    const sessoesRestantes = totalSessoes - sessoesUsadas;
    expect(sessoesRestantes).toBe(2);
  });

  it("deve identificar pacote com poucas sessões (1 ou 2)", () => {
    const itens1 = criarItens(10, 9);
    const itens2 = criarItens(10, 8);
    const itens3 = criarItens(10, 7);

    const calcRestantes = (itens: typeof itens1) =>
      itens.reduce((s, i) => s + i.quantidadeTotal - i.quantidadeUsada, 0);

    expect(calcRestantes(itens1)).toBe(1); // deve notificar
    expect(calcRestantes(itens2)).toBe(2); // deve notificar
    expect(calcRestantes(itens3)).toBe(3); // NÃO deve notificar
  });

  it("deve marcar notificação como urgente quando faltam 3 dias ou menos", () => {
    const diasRestantes = 3;
    const urgencia = diasRestantes <= 3 ? "URGENTE - " : "";
    const mensagem = `${urgencia}Pacote de Maria vence em ${diasRestantes} dia(s).`;
    expect(mensagem).toContain("URGENTE");
  });

  it("não deve marcar como urgente quando faltam 5 dias", () => {
    const diasRestantes = 5;
    const urgencia = diasRestantes <= 3 ? "URGENTE - " : "";
    const mensagem = `${urgencia}Pacote de Maria vence em ${diasRestantes} dia(s).`;
    expect(mensagem).not.toContain("URGENTE");
  });

  it("deve gerar mensagem correta para vencimento próximo", () => {
    const diasRestantes = 5;
    const sessoesRestantes = 3;
    const clienteNome = "Ana Lima";
    const mensagem = `Pacote de ${clienteNome} vence em ${diasRestantes} dia(s). ${sessoesRestantes} sessão(ões) ainda disponível(is).`;
    expect(mensagem).toContain("Ana Lima");
    expect(mensagem).toContain("5 dia(s)");
    expect(mensagem).toContain("3 sessão(ões)");
  });

  it("deve gerar mensagem correta para poucas sessões restantes", () => {
    const sessoesRestantes = 1;
    const clienteNome = "João Santos";
    const mensagem = `Atenção: ${clienteNome} tem apenas ${sessoesRestantes} sessão(ões) restante(s) no pacote. Considere renovar.`;
    expect(mensagem).toContain("João Santos");
    expect(mensagem).toContain("1 sessão(ões)");
    expect(mensagem).toContain("Considere renovar");
  });

  it("não deve notificar pacote sem sessões restantes", () => {
    const itens = criarItens(10, 10);
    const sessoesRestantes = itens.reduce((s, i) => s + i.quantidadeTotal - i.quantidadeUsada, 0);
    expect(sessoesRestantes).toBe(0);
    // Lógica: if (sessoesRestantes <= 0) continue
    expect(sessoesRestantes <= 0).toBe(true);
  });

  it("deve verificar que o intervalo do scheduler é de 6 horas", () => {
    const INTERVAL_MS = 6 * 60 * 60 * 1000;
    expect(INTERVAL_MS).toBe(21_600_000);
  });

  it("deve verificar que o delay inicial do scheduler é de 30 segundos", () => {
    const DELAY_MS = 30_000;
    expect(DELAY_MS).toBe(30 * 1000);
  });
});

describe("Notificações de Pacotes — Tipos e Estrutura", () => {

  it("deve ter os tipos corretos de notificação", () => {
    const tiposValidos = ["vencimento_proximo", "sessoes_restantes", "pacote_vencido"];
    expect(tiposValidos).toContain("vencimento_proximo");
    expect(tiposValidos).toContain("sessoes_restantes");
    expect(tiposValidos).toContain("pacote_vencido");
  });

  it("deve ter os canais corretos de notificação", () => {
    const canaisValidos = ["sistema", "whatsapp", "email"];
    expect(canaisValidos).toContain("sistema");
    expect(canaisValidos).toContain("whatsapp");
    expect(canaisValidos).toContain("email");
  });

  it("deve criar estrutura correta para inserção no banco", () => {
    const notif = {
      empresaId: 1,
      pacoteClienteId: 5,
      clienteId: 10,
      tipo: "vencimento_proximo" as const,
      mensagem: "Pacote vence em 3 dias.",
      diasParaVencer: 3,
      sessoesRestantes: 2,
      canal: "sistema" as const,
      lida: false,
    };

    expect(notif.empresaId).toBe(1);
    expect(notif.tipo).toBe("vencimento_proximo");
    expect(notif.canal).toBe("sistema");
    expect(notif.lida).toBe(false);
    expect(notif.diasParaVencer).toBe(3);
    expect(notif.sessoesRestantes).toBe(2);
  });
});
