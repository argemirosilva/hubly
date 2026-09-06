import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dbContent = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const routersContent = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const servicosPage = readFileSync(resolve(process.cwd(), "client/src/pages/Servicos.tsx"), "utf8");

describe("categorias de Serviços", () => {
  it("mantém os grupos de Serviços sincronizados ao renomear um tipo profissional", () => {
    expect(dbContent).toContain("updateTipoProfissionalEGruposServico");
    expect(dbContent).toContain("LOWER(TRIM(${servicos.categoria}))");
    expect(dbContent).toContain("eq(servicos.empresaId, empresaId)");
    expect(routersContent).toContain("updateTipoProfissionalEGruposServico(empresa.id, id, data)");
  });

  it("oferece alteração de tipo em lote apenas para Serviços da empresa da sessão", () => {
    expect(dbContent).toContain("updateCategoriaServicosLote");
    expect(dbContent).toContain("inArray(servicos.id, servicoIds)");
    expect(routersContent).toContain("alterarCategoriaLote");
    expect(routersContent).toContain("requirePermissao(ctx, empresa, 'servicosEditar')");
  });

  it("permite selecionar serviços de grupos diferentes e movê-los para um tipo profissional", () => {
    expect(servicosPage).toContain("Alterar tipo");
    expect(servicosPage).toContain("Alterar tipo profissional");
    expect(servicosPage).toContain("trpc.servicos.alterarCategoriaLote.useMutation");
    expect(servicosPage).toContain("utils.servicos.list.invalidate()");
  });
});
