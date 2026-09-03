import { useAuth } from "@/context/AuthContext";

export type CuentasAntarixPermissions = {
  canView: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
};

export function useCuentasAntarixPermissions(): CuentasAntarixPermissions {
  const { isAdmin, isAuthenticated, loading: authLoading, permissions } = useAuth();
  const cuentasPerms = (permissions as Record<string, { view?: boolean; edit?: boolean }>)
    ?.cuentas_antarix;
  const canView = isAdmin || cuentasPerms?.view === true;
  const canEdit = isAdmin || cuentasPerms?.edit === true;
  return { canView, canEdit, isAdmin, isAuthenticated, authLoading };
}
