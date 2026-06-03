import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type CuentasAntarixPerm = "view" | "create" | "edit";

export default function RequireCuentasAntarixPermission({
  children,
  required,
}: {
  children: React.ReactNode;
  required: CuentasAntarixPerm;
}) {
  const { permissions, isAdmin, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite" aria-busy="true">
        <span className="text-sm text-[#78716c] dark:text-[#8ea0b8]">Verificando acceso…</span>
      </div>
    );
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
