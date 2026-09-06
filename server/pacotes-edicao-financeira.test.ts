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
});
