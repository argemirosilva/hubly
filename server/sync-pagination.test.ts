import { describe, expect, it } from "vitest";
import { normalizarCursorSync, normalizarLimiteSync, paginaSync } from "./sync-pagination";
import { idsAusentesNoSnapshot } from "./sync-reconciliation";

describe("paginação e reconciliação da sincronização", () => {
  it("limita e retoma páginas por cursor de chave primária", () => {
    expect(normalizarLimiteSync("9999", 500)).toBe(500);
    expect(normalizarLimiteSync("0", 500)).toBe(1);
    expect(normalizarCursorSync("-9")).toBe(0);
    expect(paginaSync([{ id: 21 }, { id: 22 }, { id: 23 }], 2, 20)).toEqual({ records: [{ id: 21 }, { id: 22 }], hasMore: true, nextCursor: 22 });
  });

  it("só marca como ausente o que não reapareceu no snapshot concluído", () => {
    expect(idsAusentesNoSnapshot([1, 2, 3, 4], [1, 3, 4])).toEqual([2]);
  });
});
