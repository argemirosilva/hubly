export function removerSessoesEmConflito<T>(sessoes: T[], indicesEmConflito: number[]) {
  const conflitos = new Set(indicesEmConflito);
  return sessoes.filter((_, indice) => !conflitos.has(indice));
}
