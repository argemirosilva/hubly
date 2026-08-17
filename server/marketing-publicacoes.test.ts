import { describe, expect, it } from "vitest";
import { montarPublicacoesDoConteudo } from "./marketing-publicacoes";

describe("montarPublicacoesDoConteudo", () => {
  it("replica o conteúdo-base em publicações com rede, formato e horário próprios", () => {
    const publicacoes = montarPublicacoesDoConteudo(
      { empresaId: 1, tema: "Maquiando modelo", tipo: "Carrossel", roteiro: "Mesmo vídeo" },
      [
        { plataforma: "tiktok", formato: "tiktok", dataPublicacao: "2026-08-17", horarioPublicacao: "18:00", responsavelId: 2, responsavelNome: "Ana" },
        { plataforma: "instagram", formato: "reels", dataPublicacao: "2026-08-19", horarioPublicacao: "13:00", responsavelId: 3, responsavelNome: "Bia" },
      ],
    );

    expect(publicacoes).toHaveLength(2);
    expect(publicacoes[0]).toMatchObject({ tema: "Maquiando modelo", roteiro: "Mesmo vídeo", plataforma: "tiktok", formato: "tiktok", horarioPublicacao: "18:00", responsavelNome: "Ana" });
    expect(publicacoes[1]).toMatchObject({ tema: "Maquiando modelo", roteiro: "Mesmo vídeo", plataforma: "instagram", formato: "reels", horarioPublicacao: "13:00", responsavelNome: "Bia" });
  });

  it("usa o horário padrão somente quando uma publicação não informa horário", () => {
    const [publicacao] = montarPublicacoesDoConteudo(
      { empresaId: 1, tema: "Teste", tipo: "dica" },
      [{ plataforma: "instagram", formato: "feed", dataPublicacao: "2026-08-17" }],
    );
    expect(publicacao.horarioPublicacao).toBe("18:00");
  });
});
