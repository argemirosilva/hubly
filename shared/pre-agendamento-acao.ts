export type AcaoRapidaPreAgendamento = "confirmar" | "cancelar";
export type OperacaoPreAgendamento = "confirmar_reserva" | "cancelar_agendamento";

export function obterOperacaoPreAgendamento(acao: AcaoRapidaPreAgendamento): OperacaoPreAgendamento {
  return acao === "confirmar" ? "confirmar_reserva" : "cancelar_agendamento";
}
