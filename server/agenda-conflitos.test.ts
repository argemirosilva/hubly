import { describe, expect, it } from "vitest";
import { statusOcupaHorario } from "./agenda-conflitos";

describe("statusOcupaHorario", () => {
  it.each(["cancelado", "cancelado_pelo_cliente", "faltou", "remarcado"])("libera o horário quando o status é %s", status => {
    expect(statusOcupaHorario(status)).toBe(false);
  });

  it.each(["pre_agendado", "agendado", "confirmado", "atendido", "concluido"])("mantém o horário ocupado quando o status é %s", status => {
    expect(statusOcupaHorario(status)).toBe(true);
  });
});
