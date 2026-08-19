import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("automação inicial de sessões de pacote", () => {
  it("mantém a abertura de pacote apenas no fluxo normal de agendamento criado", () => {
    const roteador = readFileSync("server/routers/pacotes.ts", "utf8");
    expect(roteador).toContain("getAutomacoesByEvento(empId, 'agendamento_criado')");
    expect(roteador).not.toContain("input.modoNotificacao");
    expect(roteador).not.toContain("'pacote_agendado'");
  });

  it("não oferece escolha de mensagem inicial no formulário de pacote", () => {
    const pagina = readFileSync("client/src/pages/Pacotes.tsx", "utf8");
    expect(pagina).not.toContain("Mensagem inicial para a cliente");
    expect(pagina).not.toContain("modoNotificacao");
  });
});
