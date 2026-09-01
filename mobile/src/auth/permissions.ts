import type { ModulePermissions, PermissionFlags, SessionUser } from '@/types/api';

/**
 * Espejo *de lectura* de `apps/users/permissions.py`. Sirve para ocultar UI;
 * la autorización real siempre la decide el servidor.
 */
export function isAdmin(user: SessionUser | null): boolean {
  return Boolean(user?.is_staff || user?.is_superuser);
}

export function modulePermissions(permissions: ModulePermissions, moduleKey: string): PermissionFlags {
  return permissions[moduleKey.toLowerCase()] ?? {};
}

export function canViewModule(
  permissions: ModulePermissions,
  user: SessionUser | null,
  moduleKey: string,
): boolean {
  if (isAdmin(user)) return true;
  return modulePermissions(permissions, moduleKey).view === true;
}

export function canEditModule(
  permissions: ModulePermissions,
  user: SessionUser | null,
  moduleKey: string,
): boolean {
  if (isAdmin(user)) return true;
  return modulePermissions(permissions, moduleKey).edit === true;
}

/**
 * «Solo mis órdenes». Igual que `user_module_own_only`: si la bandera no está
 * declarada, el default de órdenes es `true` para quien no es admin.
 */
export function isOrdenesOwnOnly(permissions: ModulePermissions, user: SessionUser | null): boolean {
  const flags = modulePermissions(permissions, 'ordenes');
  if (typeof flags.own_only === 'boolean') return flags.own_only;
  return !isAdmin(user);
}

/** Dueño de la orden: técnico asignado o quien la creó (igual que `orden_user_owns`). */
export function ownsOrden(
  user: SessionUser | null,
  orden: { tecnico_asignado: number | null; creado_por: number | null } | null,
): boolean {
  if (!user || !orden) return false;
  return orden.tecnico_asignado === user.id || orden.creado_por === user.id;
}
