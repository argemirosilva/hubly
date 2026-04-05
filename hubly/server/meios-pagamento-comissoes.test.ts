/**
 * Testes para os módulos de Meios de Pagamento e Comissões a Pagar
 */
import { describe, it, expect } from "vitest";

// ─── Helpers de formatação ────────────────────────────────────────────────────
function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function calcularValorComissao(
  valorServico: number,
  percentualComissao: number,
  taxaMaquininha: number = 0,
  custoReposicao: number = 0
): number {
  const valorLiquido = valorServico - taxaMaquininha - custoReposicao;
  return valorLiquido * (percentualComissao / 100);
}

// ─── Tipos de Meio de Pagamento ───────────────────────────────────────────────
type TipoMeio = "pix" | "debito" | "credito" | "dinheiro" | "outro";

function validarMeioPagamento(meio: {
  nome: string;
  tipo: TipoMeio;
  parcelamentoMaximo: number;
  taxaFixa: string;
}): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  if (!meio.nome || meio.nome.trim().length === 0) erros.push("Nome é obrigatório");
  if (!["pix", "debito", "credito", "dinheiro", "outro"].includes(meio.tipo)) erros.push("Tipo inválido");
  if (meio.parcelamentoMaximo < 1 || meio.parcelamentoMaximo > 24) erros.push("Parcelamento deve ser entre 1 e 24");
  const taxa = parseFloat(meio.taxaFixa);
  if (isNaN(taxa) || taxa < 0) erros.push("Taxa fixa inválida");
  return { valido: erros.length === 0, erros };
}

// ─── Testes: Meios de Pagamento ───────────────────────────────────────────────
describe("Meios de Pagamento", () => {
  it("deve validar um meio de pagamento válido", () => {
    const meio = { nome: "Pix", tipo: "pix" as TipoMeio, parcelamentoMaximo: 1, taxaFixa: "0.00" };
    const resultado = validarMeioPagamento(meio);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it("deve rejeitar meio de pagamento sem nome", () => {
    const meio = { nome: "", tipo: "pix" as TipoMeio, parcelamentoMaximo: 1, taxaFixa: "0.00" };
    const resultado = validarMeioPagamento(meio);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("Nome é obrigatório");
  });

  it("deve rejeitar parcelamento maior que 24", () => {
    const meio = { nome: "Crédito", tipo: "credito" as TipoMeio, parcelamentoMaximo: 25, taxaFixa: "2.50" };
    const resultado = validarMeioPagamento(meio);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("Parcelamento deve ser entre 1 e 24");
  });

  it("deve aceitar parcelamento máximo de 24", () => {
    const meio = { nome: "Crédito 24x", tipo: "credito" as TipoMeio, parcelamentoMaximo: 24, taxaFixa: "3.99" };
    const resultado = validarMeioPagamento(meio);
    expect(resultado.valido).toBe(true);
  });

  it("deve rejeitar taxa fixa negativa", () => {
    const meio = { nome: "Débito", tipo: "debito" as TipoMeio, parcelamentoMaximo: 1, taxaFixa: "-1.00" };
    const resultado = validarMeioPagamento(meio);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("Taxa fixa inválida");
  });

  it("deve aceitar todos os tipos válidos", () => {
    const tipos: TipoMeio[] = ["pix", "debito", "credito", "dinheiro", "outro"];
    tipos.forEach(tipo => {
      const meio = { nome: `Meio ${tipo}`, tipo, parcelamentoMaximo: 1, taxaFixa: "0.00" };
      const resultado = validarMeioPagamento(meio);
      expect(resultado.valido).toBe(true);
    });
  });
});

// ─── Testes: Cálculo de Comissões ─────────────────────────────────────────────
describe("Cálculo de Comissões", () => {
  it("deve calcular comissão simples de 50%", () => {
    const valor = calcularValorComissao(100, 50);
    expect(valor).toBe(50);
  });

  it("deve calcular comissão com desconto de taxa de maquininha", () => {
    // Serviço de R$100, taxa de 2%, comissão de 50%
    const taxaMaquininha = 100 * 0.02; // R$2
    const valor = calcularValorComissao(100, 50, taxaMaquininha);
    expect(valor).toBe(49); // (100 - 2) * 0.5 = 49
  });

  it("deve calcular comissão com custo de reposição", () => {
    // Serviço de R$100, custo de R$10, comissão de 30%
    const valor = calcularValorComissao(100, 30, 0, 10);
    expect(valor).toBe(27); // (100 - 10) * 0.3 = 27
  });

  it("deve retornar 0 para percentual 0", () => {
    const valor = calcularValorComissao(100, 0);
    expect(valor).toBe(0);
  });

  it("deve calcular comissão de 100%", () => {
    const valor = calcularValorComissao(200, 100);
    expect(valor).toBe(200);
  });
});

// ─── Testes: Formatação de Moeda ─────────────────────────────────────────────
describe("Formatação de Moeda", () => {
  it("deve formatar valor numérico corretamente", () => {
    const resultado = formatCurrency(1500.5);
    expect(resultado).toContain("1.500");
    expect(resultado).toContain("50");
  });

  it("deve formatar string numérica corretamente", () => {
    const resultado = formatCurrency("250.00");
    expect(resultado).toContain("250");
  });

  it("deve formatar null como zero", () => {
    const resultado = formatCurrency(null);
    expect(resultado).toContain("0");
  });

  it("deve formatar undefined como zero", () => {
    const resultado = formatCurrency(undefined);
    expect(resultado).toContain("0");
  });
});

// ─── Testes: Agrupamento de Comissões por Profissional ───────────────────────
describe("Agrupamento de Comissões", () => {
  const comissoesExemplo = [
    { id: 1, profissionalId: 1, profissionalNome: "Maria", valor: "100.00", status: "pendente" as const },
    { id: 2, profissionalId: 1, profissionalNome: "Maria", valor: "150.00", status: "pago" as const },
    { id: 3, profissionalId: 2, profissionalNome: "João", valor: "200.00", status: "pendente" as const },
  ];

  function agruparPorProfissional(comissoes: typeof comissoesExemplo) {
    const map = new Map<number, { nome: string; total: number; pago: number; pendente: number; qtd: number }>();
    comissoes.forEach(c => {
      if (!map.has(c.profissionalId)) {
        map.set(c.profissionalId, { nome: c.profissionalNome, total: 0, pago: 0, pendente: 0, qtd: 0 });
      }
      const entry = map.get(c.profissionalId)!;
      const val = parseFloat(c.valor);
      entry.total += val;
      entry.qtd += 1;
      if (c.status === "pago") entry.pago += val;
      else entry.pendente += val;
    });
    return Array.from(map.values());
  }

  it("deve agrupar comissões por profissional", () => {
    const grupos = agruparPorProfissional(comissoesExemplo);
    expect(grupos).toHaveLength(2);
  });

  it("deve calcular total correto por profissional", () => {
    const grupos = agruparPorProfissional(comissoesExemplo);
    const maria = grupos.find(g => g.nome === "Maria");
    expect(maria?.total).toBe(250);
    expect(maria?.pago).toBe(150);
    expect(maria?.pendente).toBe(100);
  });

  it("deve contar quantidade de comissões por profissional", () => {
    const grupos = agruparPorProfissional(comissoesExemplo);
    const maria = grupos.find(g => g.nome === "Maria");
    const joao = grupos.find(g => g.nome === "João");
    expect(maria?.qtd).toBe(2);
    expect(joao?.qtd).toBe(1);
  });
});
