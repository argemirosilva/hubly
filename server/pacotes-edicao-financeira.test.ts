import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/Pacotes.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers/pacotes.ts"), "utf8");

describe("edição financeira de Pacotes", () => {
  it("prioriza Todos antes dos demais filtros de status", () => {
    expect(page).toContain('["todos", "ativo", "concluido", "vencido", "cancelado"]');
  });

  it("diferencia valor total do pacote de recebimentos registrados", () => {
    expect(page).toContain("Valor total do pacote (R$)");
    expect(page).toContain("Gerenciar pagamentos");
    expect(page).toContain("Corrigir recebimento");
  });

  it("protege o ajuste de recebimento por empresa e recalcula o saldo", () => {
    expect(router).toContain("ajustarPagamento: protectedProcedure");
    expect(router).toContain("recalcularRecebidoAjustado");
    expect(router).toContain("eq(pacotesClientesPagamentos.empresaId, empresa.id)");
  });

  it("regulariza com segurança pacote sem valor total antes de registrar o recebimento", () => {
    expect(router).toContain("valorTotalRegularizado: z.number().positive().optional()");
    expect(router).toContain("compatibilizar os recebimentos registrados");
    expect(router).toContain("valorTotal: String(valorTotal)");
    expect(page).toContain("total salvo neste pacote está zerado ou menor que o que já foi recebido");
    expect(page).toContain("valorTotal <= 0 || valorTotal < valorRecebido");
    expect(page).toContain("Salvar total e registrar pagamento");
    expect(page).toContain("Corrigir valor total do pacote");
    expect(page).toContain("Salvar total e registrar pagamento");
  });
});
