import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("carregamento coordenado do painel", () => {
  it("aguarda permissões e dados de navegação antes de renderizar a sidebar", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/AdminLayout.tsx"), "utf8");

    expect(source).toContain("isLoading: permissoesLoading");
    expect(source).toContain("const interfaceReady = isAuthenticated");
    expect(source).toContain("if (isAuthenticated && !interfaceReady)");
    expect(source).toContain("Preparando seu painel");
  });
});
