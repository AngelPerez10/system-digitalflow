/** Mensajes de error de login sin filtrar detalles internos del servidor. */

export interface LoginSuccessPayload {
  access?: string;
  refresh?: string;
  username?: string;
  email?: string;
  id?: number;
  is_staff?: boolean;
  is_superuser?: boolean;
  first_name?: string;
  last_name?: string;
  permissions?: Record<string, unknown>;
  csrfToken?: string;
}

export function parseLoginError(res: Response, data: unknown): string {
  const status = res.status;
  let detail = "";
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail?: unknown }).detail;
    detail =
      typeof d === "string" ? d : Array.isArray(d) ? d.map(String).join(" ") : "";
  }
  if (status === 429 || /throttl/i.test(detail)) {
    return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
  }
  if (status === 403 && /csrf|token de seguridad/i.test(detail)) {
    return "Error de seguridad (CSRF). Recarga la página e intenta de nuevo.";
  }
  if (status === 403 && /desactivada/i.test(detail)) {
    return detail;
  }
  if (detail && status < 500) return detail;
  if (status === 401) return "Usuario o contraseña incorrectos.";
  if (status === 403) {
    return "No se pudo iniciar sesión. Recarga la página e intenta de nuevo.";
  }
  return "No se pudo iniciar sesión. Verifica tu conexión e intenta de nuevo.";
}

import type { AuthUser } from "@/context/authTypes";

export function userFromLoginPayload(data: LoginSuccessPayload): AuthUser | null {
  const username = String(data.username ?? "").trim();
  if (!username) return null;
  return {
    id: Number(data.id) || 0,
    username,
    email: String(data.email ?? ""),
    is_staff: Boolean(data.is_staff),
    is_superuser: Boolean(data.is_superuser),
    first_name: String(data.first_name ?? ""),
    last_name: String(data.last_name ?? ""),
  };
}
