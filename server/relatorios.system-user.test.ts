import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("relatórios para usuários internos", () => {
  it("resolve a empresa pelo contexto da sessão em todos os relatórios", () => {
    const routerSource = readFileSync(resolve(process.cwd(), "server/routers/relatorios.ts"), "utf8");
    const contextualResolver = "getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId)";

    expect(routerSource.match(new RegExp(contextualResolver.replace(/[?.()]/g, "\\$&"), "g"))).toHaveLength(3);
    expect(routerSource).not.toContain("getEmpresaDoUsuario(ctx.user.id)");
  });
});
