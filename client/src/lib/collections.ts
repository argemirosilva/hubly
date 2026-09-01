/**
 * Mantém a primeira ocorrência de cada registro por ID, preservando a ordem.
 * Útil quando uma consulta com vínculos opcionais retorna linhas repetidas.
 */
export function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const ids = new Set<number>();
  return items.filter((item) => {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}
