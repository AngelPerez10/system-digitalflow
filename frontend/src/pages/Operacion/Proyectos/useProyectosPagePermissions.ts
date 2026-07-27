import { useAuth } from "@/context/AuthContext";

export function useProyectosPagePermissions() {
  const { permissions, loading: authLoading, isAuthenticated, isAdmin } = useAuth();

  const canProyectosView = isAdmin || permissions?.proyectos?.view === true;
  const canProyectosCreate = isAdmin || permissions?.proyectos?.create === true;
  const canProyectosEdit = isAdmin || permissions?.proyectos?.edit === true;
  const canProyectosDelete = isAdmin || permissions?.proyectos?.delete === true;

  return {
    permissions,
    authLoading,
    isAuthenticated,
    isAdmin,
    canProyectosView,
    canProyectosCreate,
    canProyectosEdit,
    canProyectosDelete,
  };
}
