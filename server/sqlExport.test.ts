import { describe, expect, it } from "vitest";
import { valorSql } from "./sqlExport";

describe("valorSql", () => {
  it("escapa texto e preserva valores nulos com segurança", () => {
    expect(valorSql("D'Ávila\\teste")).toBe("'D\\'Ávila\\\\teste'");
    expect(valorSql(null)).toBe("NULL");
  });

  it("serializa booleanos e objetos em formato SQL importável", () => {
    expect(valorSql(true)).toBe("1");
    expect(valorSql({ tags: ["noiva"] })).toBe("'{\"tags\":[\"noiva\"]}'");
  });
});
