import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Motion Graphics em Calendário e Agendamentos", () => {
  it("usa animações de entrada e mantém suporte a reduzir movimento", () => {
    const calendario = readFileSync(resolve(process.cwd(), "client/src/pages/Calendario.tsx"), "utf8");
    const agendamentos = readFileSync(resolve(process.cwd(), "client/src/pages/Agendamentos.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(calendario).toContain("hubly-motion-calendar-grid");
    expect(calendario).toContain("hubly-motion-calendar-entry");
    expect(agendamentos).toContain("hubly-motion-agendamento-row");
    expect(css).toContain(".hubly-motion-calendar-grid,");
    expect(css).toContain(".hubly-motion-agendamento-row");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
