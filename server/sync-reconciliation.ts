/**
 * Em uma carga completa concluída, somente registros locais que não foram vistos
 * no snapshot remoto podem ser marcados para remoção. Nunca delete no meio de uma
 * entidade paginada: a chamada só deve ocorrer depois de `hasMore=false`.
 */
export function idsAusentesNoSnapshot(idsLocais: Iterable<number>, idsVistosNoSnapshot: Iterable<number>) {
  const vistos = new Set(idsVistosNoSnapshot);
  return [...idsLocais].filter(id => !vistos.has(id));
}
