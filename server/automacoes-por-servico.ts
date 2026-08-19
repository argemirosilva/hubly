import { verificarFiltroServicoAutomacao } from "./filtro-servico-automacao";

export function selecionarAutomacoesPorServicos<T extends { flowJson?: string | null }>(
  automacoes: T[],
  servicoPrincipal: string | null | undefined,
  todosServicos: string[],
): T[] {
  return automacoes.filter((automacao) =>
    verificarFiltroServicoAutomacao(automacao.flowJson, servicoPrincipal, todosServicos),
  );
}
