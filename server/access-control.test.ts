import { describe, expect, it } from "vitest";
import { isSystemOwner } from "./access-control";

describe("isSystemOwner", () => {
  it("concede acesso total à proprietária marcada no profissional", () => {
    expect(isSystemOwner(180002, true, 180002)).toBe(true);
  });

  it("reconhece a proprietária pela correspondência entre usuário do sistema e ownerId da empresa", () => {
    expect(isSystemOwner(180002, false, 180002)).toBe(true);
  });

  it("não concede acesso administrativo a profissional comum", () => {
    expect(isSystemOwner(180003, false, 180002)).toBe(false);
  });
});
