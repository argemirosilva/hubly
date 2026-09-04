import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizarFormaPagamento } from "./routers/analiseFinanceira";
import { appRouter } from "./routers";

describe("análise financeira detalhada", () => {
  it("normaliza as formas de pagamento exibidas para termos consistentes", () => {
    expect(normalizarFormaPagamento("pix")).toBe("Pix");
    expect(normalizarFormaPagamento("cartao_credito")).toBe("Cartão de crédito");
    expect(normalizarFormaPagamento("debito")).toBe("Cartão de débito");
    expect(normalizarFormaPagamento("dinheiro")).toBe("Dinheiro");
    expect(normalizarFormaPagamento("Transferência bancária")).toBe("Transferência bancária");
  });

  it("mantém empresa, permissão financeira e intervalo de recebimento no contrato do endpoint", () => {
    const fonte = readFileSync(new URL("./routers/analiseFinanceira.ts", import.meta.url), "utf8");
    expect(fonte).toContain("getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId)");
    expect(fonte).toContain("isSystemOwner(ctx.systemUser.id, ctx.systemUser.isOwner, empresa.ownerId)");
    expect(fonte).toContain("financeiroVer");
    expect(fonte).toContain("const pacotes = profissionalRestrito");
    expect(fonte).toContain("agendamentoPagamentos.createdAt");
    expect(fonte).toContain("pacotesClientesPagamentos.dataPagamento");
    expect(fonte).toContain("item.formaPagamento ? normalizarFormaPagamento(item.formaPagamento) : null");
    expect(fonte).toContain("dataInicio");
    expect(fonte).toContain("dataFim");
  });

  it("retorna as visões de serviço, pacote, profissional e pagamento no período informado", async () => {
    const caller = appRouter.createCaller({ user: { id: 1 } } as any);
    const resultado = await caller.analiseFinanceira.resumo({ dataInicio: "2020-01-01", dataFim: "2030-12-31" });

    expect(resultado.periodo).toEqual({ dataInicio: "2020-01-01", dataFim: "2030-12-31" });
    expect(resultado.totais).toEqual(expect.objectContaining({
      faturamentoServicos: expect.any(Number),
      valorPacotesVendidos: expect.any(Number),
      entradasRegistradas: expect.any(Number),
      valoresRecebidos: expect.any(Number),
    }));
    expect(Array.isArray(resultado.servicos)).toBe(true);
    expect(Array.isArray(resultado.pacotes)).toBe(true);
    expect(Array.isArray(resultado.profissionais)).toBe(true);
    expect(Array.isArray(resultado.pagamentos)).toBe(true);
    expect(Array.isArray(resultado.recebimentos)).toBe(true);
  });
});
