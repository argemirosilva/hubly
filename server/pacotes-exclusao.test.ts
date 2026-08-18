import { describe, expect, it } from "vitest";
import { avaliarExclusaoDefinitivaPacote } from "./pacotes-exclusao";

describe("exclusão definitiva de pacotes", () => {
  it("permite apagar pacote cancelado sem agendamento ou pagamento vinculado", () => {
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", possuiAgendamentos: false, possuiPagamentos: false,
    })).toEqual({ permitido: true });
  });

  it("não considera contador antigo de sessão como vínculo real", () => {
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", possuiAgendamentos: false, possuiPagamentos: false,
    }).permitido).toBe(true);
  });

  it("protege pacotes com movimentação real", () => {
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", possuiAgendamentos: true, possuiPagamentos: false,
    }).permitido).toBe(false);
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", possuiAgendamentos: false, possuiPagamentos: true,
    }).permitido).toBe(false);
    expect(avaliarExclusaoDefinitivaPacote({
      status: "ativo", possuiAgendamentos: false, possuiPagamentos: false,
    }).permitido).toBe(false);
  });
});
