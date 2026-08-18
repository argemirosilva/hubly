import { describe, expect, it } from "vitest";
import { avaliarExclusaoDefinitivaPacote } from "./pacotes-exclusao";

describe("exclusão definitiva de pacotes", () => {
  it("permite apagar somente pacote cancelado sem uso, agenda ou pagamento", () => {
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", sessoesUsadas: 0, possuiAgendamentos: false, possuiPagamentos: false,
    })).toEqual({ permitido: true });
  });

  it("protege pacotes com movimentação real", () => {
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", sessoesUsadas: 1, possuiAgendamentos: false, possuiPagamentos: false,
    }).permitido).toBe(false);
    expect(avaliarExclusaoDefinitivaPacote({
      status: "cancelado", sessoesUsadas: 0, possuiAgendamentos: false, possuiPagamentos: true,
    }).permitido).toBe(false);
    expect(avaliarExclusaoDefinitivaPacote({
      status: "ativo", sessoesUsadas: 0, possuiAgendamentos: false, possuiPagamentos: false,
    }).permitido).toBe(false);
  });
});
