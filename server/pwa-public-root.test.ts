import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("cache PWA da raiz pública", () => {
  it("usa uma versão de cache nova e desabilita cache ao buscar atualizações", () => {
    const serviceWorker = readFileSync(resolve(projectRoot, "client/public/sw.js"), "utf8");
    const indexHtml = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");

    expect(serviceWorker).toContain("hubly-v4-public-root");
    expect(indexHtml).toContain("updateViaCache: 'none'");
    expect(indexHtml).toContain("reg.update()");
  });
});
