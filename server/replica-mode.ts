import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPLICA_MODE_MARKER = ".hubly-replica-mode";

/**
 * Modo local de réplica somente para leitura/sincronização.
 *
 * O marcador fica fora do Git e não exige remover ou alterar credenciais.
 * Enquanto estiver presente, workers e envios de WhatsApp devem permanecer
 * desativados mesmo que o servidor HTTP seja iniciado para consulta.
 */
export function isReplicaMode(): boolean {
  return existsSync(resolve(process.cwd(), REPLICA_MODE_MARKER));
}
