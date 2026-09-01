import { describe, expect, it } from "vitest";
import { removerCartoesDuplicados } from "./routers/pipeline";

describe("cartões duplicados do Pipeline", () => {
  it("mantém somente um card por ID antes de montar uma coluna", () => {
    const cards = removerCartoesDuplicados([
      { id: 1830001, titulo: "Luisa" },
      { id: 1830001, titulo: "Luisa repetida" },
      { id: 1830002, titulo: "Ana" },
    ]);

    expect(cards).toEqual([
      { id: 1830001, titulo: "Luisa" },
      { id: 1830002, titulo: "Ana" },
    ]);
  });
});
