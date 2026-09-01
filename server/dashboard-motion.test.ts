import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Motion Graphics no Dashboard", () => {
  it("anima indicadores e widgets sem ignorar a preferência de reduzir movimento", () => {
    const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(dashboard).toContain("hubly-motion-dashboard-stat");
    expect(dashboard).toContain("hubly-motion-dashboard-widget");
    expect(dashboard).toContain("statsMotionKey");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".hubly-motion-dashboard-stat,");
    expect(css).toContain(".hubly-motion-dashboard-widget");
  });
});
