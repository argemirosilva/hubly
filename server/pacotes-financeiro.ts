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
