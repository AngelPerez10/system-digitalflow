import { useAuth } from "@/context/AuthContext";

export function useOrdenesPagePermissions() {
  const { permissions, loading: authLoading, isAuthenticated } = useAuth();

  const canOrdenesView = permissions?.ordenes?.view === true;
  const canOrdenesCreate = permissions?.ordenes?.create === true;
  const canOrdenesEdit = permissions?.ordenes?.edit === true;
  const canOrdenesDelete = permissions?.ordenes?.delete === true;

  return {
    permissions,
    authLoading,
    isAuthenticated,
    canOrdenesView,
    canOrdenesCreate,
    canOrdenesEdit,
    canOrdenesDelete,
  };
}
