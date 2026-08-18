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
