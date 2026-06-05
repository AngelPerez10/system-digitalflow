/**
 * Gestión de tokens de acceso para SPA + API cross-origin.
 *
 * Prioridad de seguridad:
 * 1. Cookies HttpOnly (access_token / refresh_token) — preferidas.
 * 2. Bearer en memoria (solo access, vida del tab).
 * 3. sessionStorage del access — solo si API y front son orígenes distintos
 *    (cookies de terceros bloqueadas). Nunca se persiste el refresh token.
 */
import { API_BASE, isViteDevServer, shouldUseDevProxy } from "./apiBase";

const ACCESS_PERSIST_KEY = "auth_access_persist";

let accessTokenMemory: string | null = null;

/** True cuando el front llama al API en otro origen (p. ej. Render estático + backend aparte). */
export function isApiCrossOrigin(): boolean {
  if (typeof window === "undefined") return false;
  if (shouldUseDevProxy() || isViteDevServer()) return false;
  try {
    const apiOrigin = new URL(API_BASE, window.location.href).origin;
    return apiOrigin !== window.location.origin;
  } catch {
    return false;
  }
}

function readPersistedAccess(): string {
  if (!isApiCrossOrigin()) return "";
  try {
    const raw = sessionStorage.getItem(ACCESS_PERSIST_KEY) || "";
    return isAccessTokenUsable(raw) ? raw : "";
  } catch {
    return "";
  }
}

function writePersistedAccess(token: string | null) {
  if (!isApiCrossOrigin()) return;
  try {
    if (token && isAccessTokenUsable(token)) {
      sessionStorage.setItem(ACCESS_PERSIST_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_PERSIST_KEY);
    }
  } catch {
    /* ignore */
  }
}

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
  writePersistedAccess(token);
}

export function getAccessToken(): string {
  if (accessTokenMemory && isAccessTokenUsable(accessTokenMemory)) {
    return accessTokenMemory;
  }
  accessTokenMemory = null;
  const persisted = readPersistedAccess();
  if (persisted) {
    accessTokenMemory = persisted;
    return persisted;
  }
  return "";
}

export function hasBearerFallback(): boolean {
  return getAccessToken().length > 0;
}

export function clearAccessToken() {
  accessTokenMemory = null;
  try {
    sessionStorage.removeItem(ACCESS_PERSIST_KEY);
    // Limpieza de claves legacy (migración)
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
