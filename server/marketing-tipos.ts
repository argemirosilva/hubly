export const TIPOS_CONTEUDO_PADRAO = [
  "promocao", "servico", "dica", "depoimento", "novidade", "sazonal", "outro",
] as const;

type TipoPersonalizado = { id: number; nome: string };

/** Resolve um valor de formulário para o valor persistido no post. */
export function resolverTipoConteudo(
  tipo: string,
  tiposPersonalizados: TipoPersonalizado[],
): string | null {
  const valor = tipo.trim();
  if ((TIPOS_CONTEUDO_PADRAO as readonly string[]).includes(valor)) return valor;

  const tipoPersonalizado = tiposPersonalizados.find(item =>
    item.nome.toLocaleLowerCase("pt-BR") === valor.toLocaleLowerCase("pt-BR") ||
    `custom_${item.id}` === valor,
  );
  return tipoPersonalizado?.nome ?? null;
}
