import {
  type ContextoFiltroAutomacao,
  temSegmentacaoDeServicoOuCategoria,
  verificarFiltroAutomacao,
  verificarFiltroServicoAutomacao,
} from "./filtro-servico-automacao";

export function selecionarAutomacoesPorServicos<T extends { flowJson?: string | null }>(
  automacoes: T[],
  servicoPrincipal: string | null | undefined,
  todosServicos: string[],
): T[] {
  return automacoes.filter((automacao) =>
    verificarFiltroServicoAutomacao(automacao.flowJson, servicoPrincipal, todosServicos),
  );
}

/**
 * Uma regra específica por serviço ou categoria tem precedência sobre a regra
 * geral no mesmo ponto da jornada. Assim, um curso recebe só a mensagem de
 * curso, e não a mensagem geral junto dela.
 */
export function selecionarAutomacoesCompativeis<T extends { flowJson?: string | null }>(
  automacoes: T[],
  contexto: ContextoFiltroAutomacao,
): T[] {
  const compativeis = automacoes.filter((automacao) =>
    verificarFiltroAutomacao(automacao.flowJson, contexto),
  );
  const existeRegraEspecifica = compativeis.some((automacao) =>
    temSegmentacaoDeServicoOuCategoria(automacao.flowJson),
  );

  return existeRegraEspecifica
    ? compativeis.filter((automacao) => temSegmentacaoDeServicoOuCategoria(automacao.flowJson))
    : compativeis;
}
