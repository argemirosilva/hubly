export function somarMinutosAoHorario(horaInicio: string, minutos: number): string {
  const [hora, minuto] = horaInicio.slice(0, 5).split(":").map(Number);
  const total = (hora * 60) + minuto + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function validarReservasDePacote(
  itens: Array<{ servicoId: number; quantidadeTotal: number; quantidadeUsada: number; quantidadeReservada: number }>,
  sessoes: Array<{ servicoIds: number[] }>,
): string | null {
  const reservasPorServico = new Map<number, number>();
  for (const sessao of sessoes) {
    for (const servicoId of sessao.servicoIds) {
      reservasPorServico.set(servicoId, (reservasPorServico.get(servicoId) ?? 0) + 1);
    }
  }

  for (const item of itens) {
    const novasReservas = reservasPorServico.get(item.servicoId) ?? 0;
    const disponivel = item.quantidadeTotal - item.quantidadeUsada - item.quantidadeReservada;
    if (novasReservas > disponivel) {
      return `O serviço ${item.servicoId} possui apenas ${Math.max(disponivel, 0)} sessão(ões) disponível(is) no pacote.`;
    }
  }
  return null;
}
