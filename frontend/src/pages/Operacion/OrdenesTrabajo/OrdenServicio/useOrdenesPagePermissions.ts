import { useAuth } from "@/context/AuthContext";
import type { Permissions } from "@/context/authTypes";
import { moduleAllowsStatusChange } from "@/pages/Configuracion/usuarios/usuariosModel";

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

/** Ruta de listado: vista completa si puede ver todas; vista técnico si solo las propias. */
export function getOrdenesListPath(
  permissions: Permissions | null | undefined,
  isAdmin: boolean,
): "/ordenes" | "/ordenes-tecnico" {
  if (permissions?.ordenes?.view !== true) return "/ordenes-tecnico";
  return isOrdenesOwnOnly(permissions, isAdmin) ? "/ordenes-tecnico" : "/ordenes";
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
  /**
   * Puede marcar/desmarcar "Liquidado". A propósito NO mira `isAdmin`: es
   * exclusivo de quien tenga esta casilla activa en Gestión de usuarios,
   * incluso administradores necesitan el permiso explícito.
   */
  const canLiquidarOrdenes = permissions?.ordenes?.liquidar === true;
  /**
   * Puede mover el status operativo. Quien solo liquida queda bloqueado
   * aunque tenga `edit`; con `cambiar_status` puede (via form o ruta dedicada).
   */
  const canChangeStatusOrdenes = moduleAllowsStatusChange(permissions?.ordenes, canOrdenesEdit);
  /** Solo status (sin edición completa): abre el form en modo lectura + status. */
  const canStatusOnlyOrdenes = !canOrdenesEdit && permissions?.ordenes?.cambiar_status === true;

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
    canLiquidarOrdenes,
    canChangeStatusOrdenes,
    canStatusOnlyOrdenes,
  };
}
