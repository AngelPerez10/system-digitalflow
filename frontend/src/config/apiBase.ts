/** URL base del API (extraído para evitar dependencias circulares con csrf.ts). */
const isBrowser = typeof window !== "undefined";
const hostname = isBrowser ? window.location.hostname : "localhost";
const protocol = isBrowser ? window.location.protocol : "http:";
const port = isBrowser ? window.location.port : "";
const isLocal = isBrowser && (hostname === "localhost" || hostname === "127.0.0.1");
const isViteDev = isBrowser && (port === "5173" || port === "4173");

const DEFAULT_API_BASE = isBrowser
  ? isLocal
    ? "http://localhost:8000"
    : isViteDev
      ? `${protocol}//${hostname}:8000`
      : `${protocol}//${hostname}`
  : "http://localhost:8000";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  DEFAULT_API_BASE;

export const isViteDevServer = isViteDev;

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  if (isViteDev) return path;
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export const PUBLIC_ORIGIN = (
  import.meta.env.VITE_PUBLIC_ORIGIN || (isBrowser ? window.location.origin : "")
).replace(/\/$/, "");

export function publicUrl(path: string): string {
  return `${PUBLIC_ORIGIN}${path}`;
}
