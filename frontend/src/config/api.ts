// API base can be overridden via VITE_API_BASE. Otherwise, derive from current host.
// In Vite dev (5173/4173), assume Django backend runs on :8000 (also when using a LAN IP).
// In production, default to same origin WITHOUT port.
const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : 'localhost';
const protocol = isBrowser ? window.location.protocol : 'http:';
const port = isBrowser ? window.location.port : '';
const isLocal = isBrowser && (hostname === 'localhost' || hostname === '127.0.0.1');
const isViteDev = isBrowser && (port === '5173' || port === '4173');

const DEFAULT_API_BASE = isBrowser
  ? (isLocal
    ? 'http://localhost:8000'
    : (isViteDev
      ? `${protocol}//${hostname}:8000`
      : `${protocol}//${hostname}`))
  : 'http://localhost:8000';

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  DEFAULT_API_BASE;

export const apiUrl = (path: string) => {
  if (!path.startsWith("/")) path = "/" + path;
  // Dev: proxy Vite /api → Django. Producción o VITE_API_BASE: URL absoluta.
  if (isViteDev) return path;
  return `${API_BASE.replace(/\/$/, "")}${path}`;
};

/** Indica que hubo login exitoso (cookies HttpOnly no son legibles desde JS). */
export const AUTH_SESSION_FLAG = 'auth_has_session';
export const AUTH_CACHE_KEY = 'auth_state';

export function hasAuthSessionFlag(): boolean {
  if (!isBrowser) return false;
  try {
    return sessionStorage.getItem(AUTH_SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

let authRequestsBlocked = false;
let inFlightAbort = new AbortController();

function isAuthExemptPath(path: string): boolean {
  const p = path.startsWith('/') ? path : `/${path}`;
  return (
    p.startsWith('/api/login') ||
    p.startsWith('/api/auth/csrf') ||
    p.startsWith('/api/logout') ||
    p.startsWith('/api/token/refresh')
  );
}

function unauthenticatedResponse(): Response {
  return new Response(JSON.stringify({ detail: 'Not authenticated' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function markAuthSession() {
  if (!isBrowser) return;
  authRequestsBlocked = false;
  try {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
  } catch {
    /* ignore */
  }
}

/** Cancela peticiones en vuelo y bloquea nuevas (p. ej. al cerrar sesión). */
export function revokeAuthSession() {
  authRequestsBlocked = true;
  inFlightAbort.abort();
  inFlightAbort = new AbortController();
}

/** Limpia caché local de sesión tras logout o tokens inválidos. */
export function clearAuthSession() {
  if (!isBrowser) return;
  revokeAuthSession();
  try {
    sessionStorage.removeItem(AUTH_SESSION_FLAG);
    sessionStorage.removeItem(AUTH_CACHE_KEY);
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('permissions');
  } catch {
    /* ignore */
  }
  resetRefreshState();
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getAuthHeaders(method: string = 'GET'): Record<string, string> {
  const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (!unsafe) return {};
  const csrf = getCsrfToken();
  return csrf ? { 'X-CSRFToken': csrf } : {};
}

interface FetchApiOptions extends RequestInit {}

let refreshPromise: Promise<boolean> | null = null;
let refreshFailed = false;
let csrfBootstrapPromise: Promise<void> | null = null;

export function resetRefreshState() {
  refreshFailed = false;
  refreshPromise = null;
}

/** Obtiene la cookie csrftoken antes de login/refresh (requerido en POST cross-origin). */
export async function ensureCsrfCookie(): Promise<void> {
  if (!isBrowser) return;
  if (getCsrfToken()) return;
  if (csrfBootstrapPromise) return csrfBootstrapPromise;

  csrfBootstrapPromise = (async () => {
    try {
      await fetch(apiUrl('/api/auth/csrf/'), {
        method: 'GET',
        credentials: 'include',
      });
    } catch {
      /* ignore */
    } finally {
      csrfBootstrapPromise = null;
    }
  })();

  return csrfBootstrapPromise;
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl('/api/token/refresh/'), {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders('POST') },
      });
      const ok = res.ok;
      if (!ok) {
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

export async function fetchApi(path: string, options: FetchApiOptions = {}): Promise<Response> {
  const exempt = isAuthExemptPath(path);
  if (path.includes('/api/login/')) {
    authRequestsBlocked = false;
  }
  if (authRequestsBlocked && !exempt) {
    return unauthenticatedResponse();
  }
  if (!exempt && !hasAuthSessionFlag()) {
    return unauthenticatedResponse();
  }

  const url = apiUrl(path);
  const method = (options.method || 'GET').toUpperCase();
  const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (unsafe) {
    await ensureCsrfCookie();
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (unsafe) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-CSRFToken'] = csrf;
    }
  }

  const signal = options.signal ?? inFlightAbort.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return unauthenticatedResponse();
    }
    throw err;
  }

  if (
    res.status === 401 &&
    !refreshFailed &&
    !path.includes('/api/token/refresh') &&
    hasAuthSessionFlag() &&
    !authRequestsBlocked
  ) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers,
        signal: inFlightAbort.signal,
      });
    }
  }

  return res;
}

/** URLs absolutas (p. ej. Cloudinary) se devuelven tal cual; rutas /media/... se resuelven contra el API. */
export function resolveMediaUrl(url: string | null | undefined): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}
export const PUBLIC_ORIGIN = (import.meta.env.VITE_PUBLIC_ORIGIN || (isBrowser ? window.location.origin : '')).replace(/\/$/, '');
export const publicUrl = (path: string) => `${PUBLIC_ORIGIN}${path}`;
