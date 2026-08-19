import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("roteiro em posts do calendário editorial", () => {
  const router = readFileSync("server/routers/iaMarketing.ts", "utf8");
  const tela = readFileSync("client/src/pages/IAMarketing.tsx", "utf8");

  it("aceita roteiro no contrato de atualização do post", () => {
    const blocoAtualizacao = router.slice(router.indexOf("atualizarPostCalendario:"), router.indexOf("atualizarPost:", router.indexOf("atualizarPostCalendario:")));
    expect(blocoAtualizacao).toContain("roteiro: z.string().optional()");
    expect(blocoAtualizacao).toContain("updates.roteiro = input.roteiro");
  });

  it("envia o roteiro digitado pelo formulário ao salvar", () => {
    expect(tela).toContain("roteiro: roteiro.trim() || undefined");
    expect(tela).toContain("atualizarPostMut.mutate({ id: modalPost.post.id, ...data })");
  });
});
