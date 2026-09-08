/**
 * A ausência de configuração deve ser tratada como bloqueio por segurança.
 * Somente uma empresa explicitamente despausada pode criar novos itens de fila.
 */
export function deveBloquearPreRegistroPorPausa(
  automacoesPausadas: boolean | null | undefined,
): boolean {
  return automacoesPausadas !== false;
}
