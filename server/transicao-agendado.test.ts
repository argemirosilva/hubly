import { describe, expect, it } from "vitest";
import { mudouParaAgendado } from "./transicao-agendado";

describe("mudouParaAgendado", () => {
  it("dispara quando um pré-agendamento se torna agendado", () => {
    expect(mudouParaAgendado("pre_agendado", "agendado")).toBe(true);
  });

  it("dispara quando um cancelado é reativado como agendado", () => {
    expect(mudouParaAgendado("cancelado", "agendado")).toBe(true);
  });

  it("não dispara repetidamente quando já estava agendado", () => {
    expect(mudouParaAgendado("agendado", "agendado")).toBe(false);
  });

  it("não confunde confirmação com a criação do agendamento", () => {
    expect(mudouParaAgendado("agendado", "confirmado")).toBe(false);
  });
});
