import { Navigate, useLocation } from "react-router-dom";

function asBool(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return defaultValue;
}

function getPermissions(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Exige permiso granular `usuarios.view` (además de RequireAdmin en la ruta). */
export default function RequireUsuariosView({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const p = getPermissions();
  const u = (p?.usuarios || {}) as Record<string, unknown>;
  const canView = asBool(u?.view, true);

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
