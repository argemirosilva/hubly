/**
 * A automação de “Agendamento criado” pertence à transição efetiva de estado,
 * não à tela ou ao botão que a acionou. A regra é compartilhada pelos fluxos
 * interno, de confirmação rápida e do link público.
 */
export function mudouParaAgendado(
  statusAnterior: string | null | undefined,
  novoStatus: string | null | undefined,
): boolean {
  return novoStatus === "agendado" && statusAnterior !== "agendado";
}
