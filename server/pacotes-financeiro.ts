export type StatusPagamentoPacote = "pendente" | "parcial" | "pago";

export function calcularSituacaoPagamentoPacote(valorTotal: number, valorRecebido: number): {
  valorTotal: number;
  valorRecebido: number;
  saldoDevedor: number;
  statusPagamento: StatusPagamentoPacote;
} {
  const total = Math.max(0, Number(valorTotal) || 0);
  const recebido = Math.max(0, Number(valorRecebido) || 0);
  const saldoDevedor = Math.max(0, Number((total - recebido).toFixed(2)));
  const statusPagamento: StatusPagamentoPacote = recebido <= 0
    ? "pendente"
    : recebido >= total && total > 0 ? "pago" : "parcial";
  return { valorTotal: total, valorRecebido: recebido, saldoDevedor, statusPagamento };
}

export function avaliarConclusaoPacote({
  totalSessoes,
  sessoesConcluidas,
  sessoesAgendadas,
  statusPagamento,
}: {
  totalSessoes: number;
  sessoesConcluidas: number;
  sessoesAgendadas: number;
  statusPagamento: StatusPagamentoPacote;
}): { permitido: boolean; motivo?: string } {
  const total = Math.max(0, Number(totalSessoes) || 0);
  const concluidas = Math.max(0, Number(sessoesConcluidas) || 0);

  if (total <= 0) {
    return { permitido: false, motivo: "O pacote precisa ter sessões cadastradas antes de ser concluído." };
  }
  if (concluidas < total) {
    return { permitido: false, motivo: "Todas as sessões do pacote precisam estar concluídas antes de marcar o pacote como concluído." };
  }
  if (Math.max(0, Number(sessoesAgendadas) || 0) > 0) {
    return { permitido: false, motivo: "Há sessões deste pacote ainda agendadas. Conclua ou cancele esses atendimentos antes de marcar o pacote como concluído." };
  }
  if (statusPagamento !== "pago") {
    return { permitido: false, motivo: "O pagamento do pacote precisa estar 100% quitado antes de marcar o pacote como concluído." };
  }
  return { permitido: true };
}

/** Recalcula o recebido do pacote após a correção de um lançamento individual. */
export function recalcularRecebidoAjustado(
  pagamentos: Array<{ id: number; valor: number | string | null }> ,
  pagamentoId: number,
  valorCorrigido: number,
): number {
  const novoValor = Number(valorCorrigido);
  if (!Number.isFinite(novoValor) || novoValor <= 0) {
    throw new Error("O valor corrigido deve ser maior que zero.");
  }

  let encontrado = false;
  const recebido = pagamentos.reduce((total, pagamento) => {
    if (pagamento.id === pagamentoId) {
      encontrado = true;
      return total + novoValor;
    }
    return total + Math.max(0, Number(pagamento.valor) || 0);
  }, 0);

  if (!encontrado) throw new Error("Lançamento de recebimento não encontrado.");
  return Number(recebido.toFixed(2));
}

export function calcularMargemPrevistaPacote(valorTotal: number, custoTotal: number): {
  valorTotal: number;
  custoTotal: number;
  margemPrevista: number;
  percentualMargem: number;
} {
  const total = Math.max(0, Number(valorTotal) || 0);
  const custo = Math.max(0, Number(custoTotal) || 0);
  const margemPrevista = Number((total - custo).toFixed(2));
  const percentualMargem = total > 0
    ? Number(((margemPrevista / total) * 100).toFixed(2))
    : 0;
  return { valorTotal: total, custoTotal: custo, margemPrevista, percentualMargem };
}
