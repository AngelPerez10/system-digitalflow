import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ModuleAccessLoading } from "./AuthGateStates";

type CuentasAntarixPerm = "view" | "create" | "edit";

/**
 * Distinto de `RequirePermission`: redirige en vez de mostrar "Acceso
 * denegado" (a /signin sin sesión, a /ordenes-tecnico sin el permiso), por
 * eso se queda como guard propio en vez de sumarse a la versión genérica.
 */
export default function RequireCuentasAntarixPermission({
  children,
  required,
}: {
  children: React.ReactNode;
  required: CuentasAntarixPerm;
}) {
  const { permissions, isAdmin, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <ModuleAccessLoading label="Verificando acceso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  const mod = (permissions as Record<string, unknown>)?.cuentas_antarix ?? {};
  const modPerms = mod as { view?: boolean; create?: boolean; edit?: boolean };
  const allowed =
    required === "view"
      ? modPerms.view === true
      : required === "create"
        ? modPerms.create === true
        : modPerms.edit === true;

  if (!allowed) {
    return <Navigate to="/ordenes-tecnico" replace />;
  }

  return <>{children}</>;
}
