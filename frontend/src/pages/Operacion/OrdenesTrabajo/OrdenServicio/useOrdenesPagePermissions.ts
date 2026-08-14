import { useAuth } from "@/context/AuthContext";
import type { Permissions } from "@/context/authTypes";

/** Alinea con `user_module_own_only` del backend para el módulo órdenes. */
export function isOrdenesOwnOnly(
  permissions: Permissions | null | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return false;
  const modulePerms = permissions?.ordenes;
  if (modulePerms && Object.prototype.hasOwnProperty.call(modulePerms, "own_only")) {
    return modulePerms.own_only === true;
  }
  return true;
}

export function useOrdenesPagePermissions() {
  const { permissions, loading: authLoading, isAuthenticated, isAdmin } = useAuth();

  const canOrdenesView = permissions?.ordenes?.view === true;
  const canOrdenesCreate = permissions?.ordenes?.create === true;
  const canOrdenesEdit = permissions?.ordenes?.edit === true;
  const canOrdenesDelete = permissions?.ordenes?.delete === true;
  const ordenesOwnOnly = isOrdenesOwnOnly(permissions, isAdmin);
  /** Gestión de usuarios → «Ver todas las órdenes» (`own_only: false`). */
  const canViewAllOrdenes = !ordenesOwnOnly;

  return {
    permissions,
    authLoading,
    isAuthenticated,
    canOrdenesView,
    canOrdenesCreate,
    canOrdenesEdit,
    canOrdenesDelete,
    ordenesOwnOnly,
    canViewAllOrdenes,
  };
}
