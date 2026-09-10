import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import capacitorConfig from "../capacitor.config";

describe("cabeçalho mobile", () => {
  const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../client/src/components/AdminLayout.tsx", import.meta.url), "utf8");

  it("limita a fixação ao breakpoint mobile e mantém a área segura", () => {
    const mobile = css.split("@media (max-width: 1023px) {")[1].split("@media (min-width: 1024px)")[0];
    expect(mobile).toMatch(/\.hubly-mobile-header\s*\{\s*position: fixed;\s*top: 0;/);
    expect(mobile).toContain("env(safe-area-inset-top, 0px)");
    expect(layout).toContain('className="hubly-mobile-header lg:hidden');
  });

  it("reserva a mesma altura do cabeçalho antes do conteúdo rolável", () => {
    expect(css).toMatch(/\.hubly-admin-body\s*\{\s*padding-top: var\(--hubly-mobile-header-height\);/);
    expect(css).toContain("height: var(--hubly-mobile-header-height);");
    expect(layout).toContain('className="hubly-admin-body flex-1');
    expect(layout).toContain("hubly-admin-content min-h-0 min-w-0 flex-1 overflow-auto");
  });

  it("não soma recuo nativo à área segura reservada pela página", () => {
    expect(capacitorConfig.ios?.contentInset).toBe("never");
    expect(capacitorConfig.plugins?.StatusBar?.overlaysWebView).toBe(true);
  });

  it("usa ícones escuros na barra superior sobre o fundo claro", () => {
    expect(capacitorConfig.plugins?.StatusBar?.style).toBe("LIGHT");
    const hook = readFileSync(new URL("../client/src/hooks/useMobileApp.ts", import.meta.url), "utf8");
    expect(hook).toContain("StatusBar.setStyle({ style: Style.Light })");
  });
});
