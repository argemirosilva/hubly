import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ajustarHorarioDeLembreteReagendado, alterouMomentoDoAgendamento } from "./reagendamento-lembretes";

describe("reagendamento de lembretes após editar um atendimento", () => {
  const anterior = { data: "2026-08-21", horaInicio: "12:00:00", horaFim: "13:00:00" };

  it("identifica alteração de data", () => {
    expect(alterouMomentoDoAgendamento(anterior, { data: "2026-08-20" })).toBe(true);
  });

  it("identifica alteração de horário de início ou fim", () => {
    expect(alterouMomentoDoAgendamento(anterior, { horaInicio: "11:35" })).toBe(true);
    expect(alterouMomentoDoAgendamento(anterior, { horaFim: "12:35" })).toBe(true);
  });

  it("não reage quando a atualização não muda data nem horário", () => {
    expect(alterouMomentoDoAgendamento(anterior, { observacoes: "Novo texto" } as any)).toBe(false);
  });

  it("cancela lembretes futuros e chama a reconstrução no fluxo de edição", () => {
    const roteador = readFileSync("server/routers.ts", "utf8");
    const banco = readFileSync("server/db.ts", "utf8");
    expect(roteador).toContain("cancelarLembretesFuturosDoAgendamento(id)");
    expect(roteador).toContain("reagendarLembretesAgendamento(id, empresa.id)");
    expect(banco).toContain("export async function cancelarLembretesFuturosDoAgendamento");
  });

  it("não deixa um lembrete já enviado bloquear o novo cálculo", () => {
    const scheduler = readFileSync("server/scheduler.ts", "utf8");
    expect(scheduler).toContain("IN ('pendente', 'agendado', 'processando')");
    expect(scheduler).toContain("Um envio já realizado pertence ao horário antigo");
  });

  it("enfileira imediatamente o lembrete quando a nova janela já começou", () => {
    const agora = new Date("2026-08-19T18:00:00.000Z");
    const horarioPassado = new Date("2026-08-19T15:00:00.000Z");
    const horarioFuturo = new Date("2026-08-20T15:00:00.000Z");

    expect(ajustarHorarioDeLembreteReagendado(horarioPassado, agora)).toEqual(agora);
    expect(ajustarHorarioDeLembreteReagendado(horarioFuturo, agora)).toEqual(horarioFuturo);
    expect(ajustarHorarioDeLembreteReagendado(null, agora)).toBeNull();
  });

  it("mantém disponível o operador usado para localizar lembretes futuros", () => {
    const banco = readFileSync("server/db.ts", "utf8");
    expect(banco).toContain("eq, gt, gte");
    expect(banco).toContain("gt(historicoEnviosAutomacao.enviarEm, agora)");
  });
});
