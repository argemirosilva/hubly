type AgendaAnterior = {
  data?: string | Date | null;
  horaInicio?: string | null;
  horaFim?: string | null;
};

type AlteracaoAgenda = {
  data?: string;
  horaInicio?: string;
  horaFim?: string;
};

function normalizarData(data: string | Date | null | undefined): string {
  if (!data) return "";
  if (data instanceof Date) return data.toISOString().slice(0, 10);
  return String(data).slice(0, 10);
}

function normalizarHora(hora: string | null | undefined): string {
  return hora ? String(hora).slice(0, 5) : "";
}

export function alterouMomentoDoAgendamento(anterior: AgendaAnterior | null | undefined, alteracao: AlteracaoAgenda): boolean {
  if (!anterior) return false;
  return (alteracao.data !== undefined && normalizarData(alteracao.data) !== normalizarData(anterior.data))
    || (alteracao.horaInicio !== undefined && normalizarHora(alteracao.horaInicio) !== normalizarHora(anterior.horaInicio))
    || (alteracao.horaFim !== undefined && normalizarHora(alteracao.horaFim) !== normalizarHora(anterior.horaFim));
}

/**
 * Ao mover um atendimento para dentro da janela de um lembrete, o horário
 * calculado pode já ter passado. Nesse caso, o aviso precisa entrar na fila
 * imediatamente, e não pode simplesmente ser descartado.
 */
export function ajustarHorarioDeLembreteReagendado(enviarEm: Date | null, agora: Date): Date | null {
  if (!enviarEm) return null;
  return enviarEm.getTime() <= agora.getTime() ? agora : enviarEm;
}
