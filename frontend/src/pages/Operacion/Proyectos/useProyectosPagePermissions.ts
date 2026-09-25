import { useAuth } from "@/context/AuthContext";
import { moduleAllowsStatusChange } from "@/pages/Configuracion/usuarios/usuariosModel";

export function useProyectosPagePermissions() {
  const { permissions, loading: authLoading, isAuthenticated, isAdmin } = useAuth();

  const canProyectosView = isAdmin || permissions?.proyectos?.view === true;
  const canProyectosCreate = isAdmin || permissions?.proyectos?.create === true;
  const canProyectosEdit = isAdmin || permissions?.proyectos?.edit === true;
  const canProyectosDelete = isAdmin || permissions?.proyectos?.delete === true;
  /**
   * Puede marcar/desmarcar "Liquidado". A propósito SIN bypass de `isAdmin`:
   * es exclusivo de quien tenga esta casilla activa en Gestión de usuarios.
   */
  const canLiquidarProyectos = permissions?.proyectos?.liquidar === true;
  /**
   * Puede mover el status operativo. Quien solo liquida queda bloqueado
   * aunque tenga `edit` (o sea admin); con `cambiar_status` puede.
   */
  const canChangeStatusProyectos = moduleAllowsStatusChange(
    permissions?.proyectos,
    canProyectosEdit,
  );
  /** Solo status (sin edición completa): abre el form en modo lectura + status. */
  const canStatusOnlyProyectos =
    !canProyectosEdit && permissions?.proyectos?.cambiar_status === true;

  return {
    permissions,
    authLoading,
    isAuthenticated,
    isAdmin,
    canProyectosView,
    canProyectosCreate,
    canProyectosEdit,
    canProyectosDelete,
    canLiquidarProyectos,
    canChangeStatusProyectos,
    canStatusOnlyProyectos,
  };
}
