/**
 * Gestión de tokens de acceso para SPA + API cross-origin.
 *
 * Prioridad de seguridad:
 * 1. Cookies HttpOnly (access_token / refresh_token) — preferidas.
 * 2. Bearer en memoria (solo access, vida del tab) para compatibilidad cross-origin.
 *
 * Nunca persistir access/refresh token en Web Storage: ante XSS, sessionStorage y
 * localStorage son legibles por cualquier script del mismo origen.
 */

let accessTokenMemory: string | null = null;

/** Decodifica `exp` del JWT solo para UX (no sustituye validación del servidor). */
export function jwtExpiresAtMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenUsable(token: string): boolean {
  const t = token.trim();
  if (!t || t.length < 20) return false;
  const exp = jwtExpiresAtMs(t);
  if (exp == null) return true;
  return Date.now() < exp - 30_000;
}

export function setAccessTokenFromLogin(access: unknown) {
  const token = typeof access === "string" ? access.trim() : "";
  if (!token || !isAccessTokenUsable(token)) {
    clearAccessToken();
    return;
  }
  accessTokenMemory = token;
}

export function getAccessToken(): string {
  if (accessTokenMemory && isAccessTokenUsable(accessTokenMemory)) {
    return accessTokenMemory;
  }
  accessTokenMemory = null;
  return "";
}

export function hasBearerFallback(): boolean {
  return getAccessToken().length > 0;
}

export function clearAccessToken() {
  accessTokenMemory = null;
  try {
    // Limpieza de claves legacy (migración hacia cookie-only).
    sessionStorage.removeItem("auth_access_persist");
    sessionStorage.removeItem("auth_access_fallback");
    sessionStorage.removeItem("auth_refresh_fallback");
  } catch {
    /* ignore */
  }
}

export function bearerAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
