/**
 * Define se uma sessão de usuário do sistema pertence à proprietária da empresa.
 * A proprietária deve sempre ter acesso administrativo, mesmo que o vínculo com
 * o grupo Administradores esteja ausente ou tenha sido criado de forma incompleta.
 */
export function isSystemOwner(
  systemUserId: number | null | undefined,
  systemUserOwnerFlag: boolean | null | undefined,
  empresaOwnerId?: number | null,
): boolean {
  return systemUserOwnerFlag === true
    || (typeof systemUserId === "number" && typeof empresaOwnerId === "number" && systemUserId === empresaOwnerId);
}
