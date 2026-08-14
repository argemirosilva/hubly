import { describe, expect, it } from "vitest";
import { deveInterromperAutomacoesDoAgendamento } from "./status-automacoes-agendamento";

describe("interrupção de automações por status do agendamento", () => {
  it.each(["cancelado", "faltou", "remarcado"])("interrompe envios quando o status é %s", (status) => {
    expect(deveInterromperAutomacoesDoAgendamento(status)).toBe(true);
  });

  it.each(["pre_agendado", "agendado", "confirmado", "concluido", undefined])("mantém automações quando o status é %s", (status) => {
    expect(deveInterromperAutomacoesDoAgendamento(status)).toBe(false);
  });
});
