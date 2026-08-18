/** Quantas sessões usadas podem ser revertidas sem alterar atendimentos concluídos. */
export function calcularSessoesManuaisReversiveis(
  quantidadeUsada: number,
  sessoesConcluidasVinculadas: number,
): number {
  return Math.max(0, quantidadeUsada - sessoesConcluidasVinculadas);
}
