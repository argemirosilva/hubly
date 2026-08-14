export const STATUS_QUE_INTERROMPEM_AUTOMACOES = [
  "cancelado",
  "faltou",
  "remarcado",
] as const;

export function deveInterromperAutomacoesDoAgendamento(status: string | null | undefined): boolean {
  return STATUS_QUE_INTERROMPEM_AUTOMACOES.includes(status as typeof STATUS_QUE_INTERROMPEM_AUTOMACOES[number]);
}
