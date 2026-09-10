import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), company: vi.fn() }));
vi.mock("./_core/context", () => ({ createContext: mocks.context }));
vi.mock("./db", () => ({ getEmpresaDoContexto: mocks.company }));
import { canReadPrivate } from "./local-storage";
beforeEach(() => vi.clearAllMocks());
describe("autorizacao real do leitor local", () => {
  it("nega sessao ausente", async () => {
    mocks.context.mockResolvedValue({ user: null });
    expect(await canReadPrivate({} as any, {} as any, 1)).toBe(false);
    expect(mocks.company).not.toHaveBeenCalled();
  });
  it("isola anexos por empresa autenticada", async () => {
    mocks.context.mockResolvedValue({ user: { id: -7, openId: "system_user_7" }, systemUser: { empresaId: 2 } });
    mocks.company.mockResolvedValue({ id: 2 });
    expect(await canReadPrivate({} as any, {} as any, 1)).toBe(false);
    expect(await canReadPrivate({} as any, {} as any, 2)).toBe(true);
    expect(mocks.company).toHaveBeenCalledWith(-7, 2);
  });
  it("preserva acesso do administrador Orizon autenticado", async () => {
    mocks.context.mockResolvedValue({ user: { id: -9999, openId: "orizon_admin" } });
    expect(await canReadPrivate({} as any, {} as any, 1)).toBe(true);
    expect(mocks.company).not.toHaveBeenCalled();
  });
});
