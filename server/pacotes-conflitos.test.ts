import { describe, expect, it } from "vitest";
import { removerSessoesEmConflito } from "../shared/pacotes-conflitos";
import { readFileSync } from "node:fs";
import { pacotesRouter } from "./routers/pacotes";

describe("resolução de conflitos de sessões de pacote", () => {
  it("mantém apenas as sessões sem conflito quando a usuária abre o pacote sem as conflitantes", () => {
    const sessoes = ["sessão 1", "sessão 2", "sessão 3"];
    expect(removerSessoesEmConflito(sessoes, [1])).toEqual(["sessão 1", "sessão 3"]);
  });

  it("permite abrir o pacote sem sessões quando todas conflitam", () => {
    expect(removerSessoesEmConflito(["sessão 1"], [0])).toEqual([]);
  });

  it("expõe uma prévia de conflitos no roteador de pacotes", () => {
    expect(pacotesRouter._def.procedures).toHaveProperty("verificarConflitosSessoes");
  });

  it("oferece as três decisões de conflito no formulário de pacote", () => {
    const pagina = readFileSync("client/src/pages/Pacotes.tsx", "utf8");
    expect(pagina).toContain("Ajustar horários");
    expect(pagina).toContain("Abrir sem as sessões em conflito");
    expect(pagina).toContain("Agendar mesmo assim");
  });
});
