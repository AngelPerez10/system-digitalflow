/** URL base del API (extraído para evitar dependencias circulares con csrf.ts). */
const isBrowser = typeof window !== "undefined";

function liveHostname(): string {
  return isBrowser ? window.location.hostname : "localhost";
}

function livePort(): string {
  return isBrowser ? window.location.port : "";
}

function liveProtocol(): string {
  return isBrowser ? window.location.protocol : "http:";
}

function isViteDevPort(port: string): boolean {
  return port === "5173" || port === "4173";
}

function isLocalHostname(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

function resolveDefaultApiBase(): string {
  const host = liveHostname();
  const protocol = liveProtocol();
  const port = livePort();
  if (isLocalHostname(host)) return "http://127.0.0.1:8000";
  if (isViteDevPort(port)) return `http://${host}:8000`;
  return `${protocol}//${host}`;
}

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  resolveDefaultApiBase();

/** True cuando el front corre en Vite dev/preview (proxy /api → :8000). */
export function isViteDevServer(): boolean {
  return isBrowser && isViteDevPort(livePort());
}

function apiBasePointsToLocalBackend(): boolean {
  try {
    const api = new URL(API_BASE);
    const host = liveHostname();
    const localHost =
      isLocalHostname(api.hostname) || api.hostname === host;
    return localHost && (api.port === "8000" || api.port === "");
  } catch {
    return false;
  }
}

/**
 * En desarrollo las peticiones deben ir por el proxy de Vite (rutas relativas /api/...).
 * Ir directo a http://127.0.0.1:8000 provoca ERR_SSL_PROTOCOL_ERROR si el navegador
 * fuerza HTTPS (HSTS) sobre un servidor Django que solo habla HTTP.
 */
export function shouldUseDevProxy(): boolean {
  if (!import.meta.env.PROD) return true;
  if (!isBrowser) return false;
  if (isViteDevPort(livePort())) return true;
  if (liveProtocol() === "http:" && apiBasePointsToLocalBackend()) return true;
  return false;
}

function normalizeApiPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** URL final para fetch(): en dev local nunca apunta a :8000 (evita HSTS / ERR_SSL_PROTOCOL_ERROR). */
export function resolveApiFetchUrl(path: string): string {
  const normalized = normalizeApiPath(path);
  if (typeof window !== "undefined") {
    const port = window.location.port;
    if (port === "5173" || port === "4173") return normalized;
    if (!import.meta.env.PROD && window.location.protocol === "http:") {
      return normalized;
    }
  } else if (!import.meta.env.PROD) {
    return normalized;
  }
  if (shouldUseDevProxy()) return normalized;
  return `${API_BASE.replace(/\/$/, "")}${normalized}`;
}

export function apiUrl(path: string): string {
  return resolveApiFetchUrl(path);
}

export const PUBLIC_ORIGIN = (
  import.meta.env.VITE_PUBLIC_ORIGIN || (isBrowser ? window.location.origin : "")
).replace(/\/$/, "");

export function publicUrl(path: string): string {
  return `${PUBLIC_ORIGIN}${path}`;
}
