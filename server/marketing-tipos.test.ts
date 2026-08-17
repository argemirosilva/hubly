import { describe, expect, it } from "vitest";
import { resolverTipoConteudo } from "./marketing-tipos";

const tiposDaEmpresa = [
  { id: 9, nome: "Carrossel" },
  { id: 10, nome: "Vídeo falado" },
];

describe("resolverTipoConteudo", () => {
  it("preserva um tipo padrão", () => {
    expect(resolverTipoConteudo("dica", tiposDaEmpresa)).toBe("dica");
  });

  it("aceita o nome real de um tipo personalizado no post do calendário", () => {
    expect(resolverTipoConteudo("Carrossel", tiposDaEmpresa)).toBe("Carrossel");
  });

  it("mantém compatibilidade com o identificador legado custom_ID", () => {
    expect(resolverTipoConteudo("custom_9", tiposDaEmpresa)).toBe("Carrossel");
  });

  it("recusa um tipo que não pertence à empresa", () => {
    expect(resolverTipoConteudo("Tipo inexistente", tiposDaEmpresa)).toBeNull();
  });
});
