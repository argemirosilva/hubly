export type PublicacaoMarketing = {
  plataforma: "instagram" | "tiktok" | "ambos";
  formato: "feed" | "reels" | "stories" | "tiktok" | "outro";
  dataPublicacao: string;
  horarioPublicacao?: string;
  responsavelId?: number;
  responsavelNome?: string;
};

/** Replica os campos do conteúdo-base sem misturar as escolhas de cada publicação. */
export function montarPublicacoesDoConteudo<T extends Record<string, unknown>>(
  conteudo: T,
  publicacoes: PublicacaoMarketing[],
) {
  return publicacoes.map(publicacao => ({
    ...conteudo,
    plataforma: publicacao.plataforma,
    formato: publicacao.formato,
    dataPublicacao: publicacao.dataPublicacao,
    horarioPublicacao: publicacao.horarioPublicacao ?? "18:00",
    responsavelId: publicacao.responsavelId,
    responsavelNome: publicacao.responsavelNome,
  }));
}
