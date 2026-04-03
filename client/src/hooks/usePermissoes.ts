/**
 * Hook centralizado de permissões.
 *
 * Regras:
 * - Owner OAuth (permissoes === null): tem TUDO
 * - SystemUser com permissoes === {}: sem nenhuma permissão
 * - SystemUser com permissoes = { financeiroVer: true, ... }: apenas o que está true
 *
 * Uso:
 *   const { pode, isOwner, isAdmin, permissoes } = usePermissoes();
 *   if (!pode('financeiroVer')) return null;
 */

import { trpc } from "@/lib/trpc";

export type PermissoesObj = Record<string, boolean> | null;

export function usePermissoes() {
  const { data: meData, isLoading } = trpc.auth.me.useQuery();

  const permissoes: PermissoesObj = (meData as any)?.permissoes ?? null;
  const isSystemUser: boolean = (meData as any)?.isSystemUser === true;
  const isAdmin: boolean = (meData as any)?.isAdmin === true;
  // Owner = usuário OAuth sem ser systemUser (permissoes === null)
  const isOwner: boolean = !isSystemUser && !!meData;
  // Acesso total = owner ou isAdmin
  const hasFullAccess: boolean = isOwner || isAdmin;

  /**
   * Verifica se o usuário tem uma permissão específica.
   * Owner (permissoes === null) sempre retorna true.
   * SystemUser: verifica o campo no objeto de permissões.
   */
  function pode(campo: string): boolean {
    if (isLoading) return false;
    if (!meData) return false;
    // Owner tem tudo
    if (permissoes === null) return true;
    return permissoes[campo] === true;
  }

  /**
   * Verifica se o usuário tem QUALQUER uma das permissões listadas.
   */
  function podeAlgum(...campos: string[]): boolean {
    return campos.some(c => pode(c));
  }

  /**
   * Verifica se o usuário tem TODAS as permissões listadas.
   */
  function podeTodos(...campos: string[]): boolean {
    return campos.every(c => pode(c));
  }

  const profissionalId: number | null = (meData as any)?.profissionalId ?? null;

  return {
    isLoading,
    meData,
    permissoes,
    isOwner,
    isAdmin,
    isSystemUser,
    hasFullAccess,
    profissionalId,
    pode,
    podeAlgum,
    podeTodos,
  };
}
