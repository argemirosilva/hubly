export const TEMPO_MAXIMO_PROCESSANDO_MS = 5 * 60 * 1000;

type EnvioEmProcessamento = {
  status: string;
  processandoEm?: Date | null;
  enviarEm?: Date | null;
};

/**
 * Retorna true quando uma mensagem foi assumida por um worker, mas ficou tempo
 * demais sem resultado. Registros antigos não possuíam processandoEm, por isso
 * usam enviarEm como referência de recuperação.
 */
export function deveRecuperarEnvioProcessando(
  envio: EnvioEmProcessamento,
  agora = new Date(),
): boolean {
  if (envio.status !== "processando") return false;
  const referencia = envio.processandoEm ?? envio.enviarEm;
  if (!referencia) return false;
  return referencia.getTime() <= agora.getTime() - TEMPO_MAXIMO_PROCESSANDO_MS;
}

/**
 * O driver MySQL retorna atualizações como ResultSetHeader dentro de um array,
 * enquanto outros adaptadores expõem rowsAffected diretamente. Aceitar os dois
 * formatos mantém a reivindicação atômica correta em todos os ambientes.
 */
export function quantidadeLinhasAtualizadas(resultado: unknown): number {
  const bruto = Array.isArray(resultado) ? resultado[0] : resultado;
  if (!bruto || typeof bruto !== "object") return 0;

  const contagem = (bruto as { affectedRows?: unknown; rowsAffected?: unknown }).affectedRows
    ?? (bruto as { rowsAffected?: unknown }).rowsAffected;
  const numero = Number(contagem);
  return Number.isFinite(numero) ? numero : 0;
}
