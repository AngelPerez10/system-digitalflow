import {
  bearerAuthHeader,
  clearAccessToken,
  hasBearerFallback,
  setAccessTokenFromLogin,
} from "./authSession";
import {
  clearCsrfTokenCache,
  ensureCsrfCookie,
  getCsrfRequestHeaders,
  getCsrfToken,
  storeCsrfTokenFromPayload,
} from "./csrf";
import { apiUrl, resolveApiFetchUrl, API_BASE, PUBLIC_ORIGIN, publicUrl } from "./apiBase";

export {
  bearerAuthHeader,
  clearAccessToken,
  getAccessToken,
  hasBearerFallback,
  isApiCrossOrigin,
  setAccessTokenFromLogin,
} from "./authSession";
export { parseLoginError, userFromLoginPayload } from "./loginErrors";
export type { LoginSuccessPayload } from "./loginErrors";

export { API_BASE, apiUrl, PUBLIC_ORIGIN, publicUrl };
export {
  clearCsrfTokenCache,
  ensureCsrfCookie,
  getCsrfToken,
  storeCsrfTokenFromPayload,
};

/** Cabeceras CSRF para métodos no seguros (alias histórico). */
export function getAuthHeaders(method: string = "GET"): Record<string, string> {
  return getCsrfRequestHeaders(method);
}

/** Indica que hubo login exitoso (cookies HttpOnly no son legibles desde JS). */
export const AUTH_SESSION_FLAG = "auth_has_session";
export const AUTH_CACHE_KEY = "auth_state";

/** @deprecated Use setAccessTokenFromLogin */
export function setAuthTokensFromLogin(data: unknown) {
  if (!data || typeof data !== "object") return;
  const access = (data as { access?: unknown }).access;
  setAccessTokenFromLogin(access);
}

/** @deprecated Use hasBearerFallback */
export function hasAccessTokenFallback(): boolean {
  return hasBearerFallback();
}

export function hasAuthSessionFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

let authRequestsBlocked = false;
let inFlightAbort = new AbortController();

function isAuthExemptPath(path: string): boolean {
  const p = path.startsWith("/") ? path : `/${path}`;
  return (
    p.startsWith("/api/login") ||
    p.startsWith("/api/auth/csrf") ||
    p.startsWith("/api/logout") ||
    p.startsWith("/api/token/refresh")
  );
}

function unauthenticatedResponse(): Response {
  return new Response(JSON.stringify({ detail: "Not authenticated" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function csrfUnavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      detail:
        "No se pudo obtener el token de seguridad (CSRF). Recarga la página o vuelve a iniciar sesión.",
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

export function markAuthSession() {
  if (typeof window === "undefined") return;
  authRequestsBlocked = false;
  try {
    sessionStorage.setItem(AUTH_SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function revokeAuthSession() {
  authRequestsBlocked = true;
  inFlightAbort.abort();
  inFlightAbort = new AbortController();
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  revokeAuthSession();
  clearCsrfTokenCache();
  try {
    sessionStorage.removeItem(AUTH_SESSION_FLAG);
    sessionStorage.removeItem(AUTH_CACHE_KEY);
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("permissions");
  } catch {
    /* ignore */
  }
  clearAccessToken();
  resetRefreshState();
}

type FetchApiOptions = RequestInit;

let refreshPromise: Promise<boolean> | null = null;
let refreshFailed = false;

export function resetRefreshState() {
  refreshFailed = false;
  refreshPromise = null;
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const hasCsrf = await ensureCsrfCookie();
      if (!hasCsrf) return false;
      const csrfHeaders = getCsrfRequestHeaders("POST");
      const res = await fetch(resolveApiFetchUrl("/api/token/refresh/"), {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders,
      });
      const ok = res.ok;
      if (ok) {
        const data = await res.json().catch(() => null);
        if (data && typeof data === "object") {
          setAccessTokenFromLogin((data as { access?: unknown }).access);
        }
      } else {
        refreshFailed = true;
        clearAuthSession();
      }
      return ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function responseDetailLooksLikeCsrf(res: Response): Promise<boolean> {
  try {
    const data = await res.clone().json();
    const detail = String((data as { detail?: unknown })?.detail ?? "");
    return /csrf/i.test(detail);
  } catch {
    return false;
  }
}

function buildRequestHeaders(
  options: FetchApiOptions,
  method: string
): Record<string, string> | null {
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  const withBearer = { ...headers, ...bearerAuthHeader() };
  if (!unsafe) return withBearer;

  const csrfHeaders = getCsrfRequestHeaders(method);
  if (!csrfHeaders["X-CSRFToken"]) return null;
  return { ...withBearer, ...csrfHeaders };
}

export async function fetchApi(path: string, options: FetchApiOptions = {}): Promise<Response> {
  const exempt = isAuthExemptPath(path);
  if (path.includes("/api/login/")) {
    authRequestsBlocked = false;
  }
  if (authRequestsBlocked && !exempt) {
    return unauthenticatedResponse();
  }
  if (!exempt && !hasAuthSessionFlag()) {
    return unauthenticatedResponse();
  }

  const url = resolveApiFetchUrl(path);
  const method = (options.method || "GET").toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (unsafe) {
    const ok = await ensureCsrfCookie();
    if (!ok) return csrfUnavailableResponse();
  }

  const signal = options.signal ?? inFlightAbort.signal;

  const doFetch = (hdrs: Record<string, string>) =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: hdrs,
      signal,
    });

  let headers = buildRequestHeaders(options, method);
  if (unsafe && !headers) return csrfUnavailableResponse();

  let res: Response;
  try {
    res = await doFetch(headers!);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return unauthenticatedResponse();
    }
    throw err;
  }

  if (res.status === 403 && unsafe && (await responseDetailLooksLikeCsrf(res))) {
    clearCsrfTokenCache();
    const refreshed = await ensureCsrfCookie(true);
    if (!refreshed) return res;
    headers = buildRequestHeaders(options, method);
    if (!headers) return csrfUnavailableResponse();
    try {
      res = await doFetch(headers);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return unauthenticatedResponse();
      }
      throw err;
    }
  }

  if (
    res.status === 401 &&
    !refreshFailed &&
    !path.includes("/api/token/refresh") &&
    hasAuthSessionFlag() &&
    !authRequestsBlocked
  ) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const retryHeaders = buildRequestHeaders(options, method);
      if (unsafe && !retryHeaders) return csrfUnavailableResponse();
      return doFetch(retryHeaders ?? headers!);
    }
  }

  return res;
}

export function resolveMediaUrl(url: string | null | undefined): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}
