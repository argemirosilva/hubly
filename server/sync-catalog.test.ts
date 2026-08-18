import { describe, expect, it } from "vitest";
import { getSyncEntity, sanitizeSyncRecord, SYNC_ENTITIES } from "./sync-catalog";

describe("catálogo de sincronização", () => {
  it("aceita somente entidades declaradas no catálogo", () => {
    expect(getSyncEntity("appointments")?.table).toBe("agendamentos");
    expect(getSyncEntity("tabela_injetada")).toBeUndefined();
    expect(SYNC_ENTITIES.length).toBeGreaterThan(50);
  });

  it("remove segredos, tokens e senhas da exportação", () => {
    const result = sanitizeSyncRecord({
      id: 10,
      nome: "Empresa",
      passwordHash: "nunca-exportar",
      senhaHash: "nunca-exportar",
      accessToken: "nunca-exportar",
      whatsappApiKey: "nunca-exportar",
      perfil: { email: "a@b.com", refreshToken: "nunca-exportar" },
    });
    expect(result).toEqual({ id: 10, nome: "Empresa", perfil: { email: "a@b.com" } });
  });
});
