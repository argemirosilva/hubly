import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { uniqueById } from "../client/src/lib/collections";

describe("Motion Graphics em Calendário e Agendamentos", () => {
  it("remove IDs repetidos antes de renderizar a lista", () => {
    const items = uniqueById([
      { id: 1830001, status: "agendado" },
      { id: 1830001, status: "confirmado" },
      { id: 1830002, status: "agendado" },
    ]);

    expect(items).toEqual([
      { id: 1830001, status: "agendado" },
      { id: 1830002, status: "agendado" },
    ]);
  });

  it("usa animações de entrada e mantém suporte a reduzir movimento", () => {
    const calendario = readFileSync(resolve(process.cwd(), "client/src/pages/Calendario.tsx"), "utf8");
    const agendamentos = readFileSync(resolve(process.cwd(), "client/src/pages/Agendamentos.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(calendario).toContain("hubly-motion-calendar-grid");
    expect(calendario).toContain("hubly-motion-calendar-entry");
    expect(agendamentos).toContain("hubly-motion-agendamento-row");
    expect(agendamentos).toContain("uniqueById");
    expect(app).toContain("hubly-motion-route");
    expect(css).toContain(".hubly-motion-calendar-grid,");
    expect(css).toContain(".hubly-motion-route");
    expect(css).toContain(".hubly-motion-agendamento-row");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
