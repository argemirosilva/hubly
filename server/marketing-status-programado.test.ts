import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("status Programado no Marketing IA", () => {
  const schema = readFileSync("drizzle/schema.ts", "utf8");
  const router = readFileSync("server/routers/iaMarketing.ts", "utf8");
  const tela = readFileSync("client/src/pages/IAMarketing.tsx", "utf8");

  it("aceita Programado no banco e no contrato de atualização", () => {
    expect(schema).toContain('["planejado", "gravado", "editado", "programado", "postado"]');
    expect(router).toContain('const statusProducaoEnum = ["planejado", "gravado", "editado", "programado", "postado"]');
  });

  it("exibe Programado e o mantém entre Editado e Postado no calendário", () => {
    expect(tela).toContain('value: "programado", label: "Programado"');
    expect(tela).toContain('editado: "programado", programado: "postado"');
    expect(tela).toContain('programado: "editado", postado: "programado"');
    expect(tela).toContain('programado: todos.filter');
  });
});
