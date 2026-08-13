import { describe, expect, it } from "vitest";
import { FILTRO_STATUS_PACOTES_PADRAO, FILTROS_STATUS_PACOTES } from "../shared/pacotes";

describe("filtro padrão de pacotes", () => {
  it("exibe o histórico completo em vez de limitar a pacotes ativos", () => {
    expect(FILTRO_STATUS_PACOTES_PADRAO).toBe("todos");
    expect(FILTROS_STATUS_PACOTES).toContain(FILTRO_STATUS_PACOTES_PADRAO);
  });
});
