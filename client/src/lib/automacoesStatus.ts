export type StatusListaAutomacao = "ativas" | "desativadas";

export function filtrarAutomacoesPorStatus<T extends { ativo: boolean }>(
  automacoes: T[],
  status: StatusListaAutomacao,
): T[] {
  return automacoes.filter((automacao) => (
    status === "ativas" ? automacao.ativo : !automacao.ativo
  ));
}
