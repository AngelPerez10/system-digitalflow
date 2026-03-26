import { Navigate, useLocation } from "react-router-dom";

type ClientePerm = "view";

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

export default function RequireClientePermission({
  children,
  required,
}: {
  children: React.ReactNode;
  required: ClientePerm;
}) {
  const location = useLocation();

  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const role = (localStorage.getItem("role") || sessionStorage.getItem("role") || "").toLowerCase();
  const isSuperuser =
    (localStorage.getItem("is_superuser") || sessionStorage.getItem("is_superuser") || "").toLowerCase() === "true";
  const isAdmin = role === "admin" || isSuperuser;

  if (isAdmin) return <>{children}</>;

  const p = getPermissions();
  const c = (p?.clientes || {}) as Record<string, unknown>;
  const allowed = required === "view" ? asBool(c?.view, true) : false;

  if (!allowed) {
    return <Navigate to="/operador/dashboard" replace />;
  }

  return <>{children}</>;
}
