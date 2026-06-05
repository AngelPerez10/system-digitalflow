/**
 * CSRF para SPA con API en otro origen (Render).
 * El token se guarda en memoria (no localStorage) tras GET /api/auth/csrf/ o login.
 */
import { resolveApiFetchUrl } from "./apiBase";

export const CSRF_HEADER_MIN_LENGTH = 32;

let cachedCsrfToken: string | null = null;
let csrfBootstrapPromise: Promise<boolean> | null = null;

function readCsrfFromDocumentCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function getCsrfToken(): string {
  if (cachedCsrfToken) return cachedCsrfToken;
  return readCsrfFromDocumentCookie();
}

export function csrfTokenLooksValid(token: string): boolean {
  return token.trim().length >= CSRF_HEADER_MIN_LENGTH;
}

export function storeCsrfTokenFromPayload(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const rec = data as Record<string, unknown>;
  const raw = rec.csrfToken ?? rec.csrf_token;
  if (typeof raw === "string" && csrfTokenLooksValid(raw)) {
    cachedCsrfToken = raw.trim();
  }
}

export function clearCsrfTokenCache(): void {
  cachedCsrfToken = null;
}

/** Obtiene csrftoken del API (JSON + cookie cuando el navegador lo permite). */
export async function ensureCsrfCookie(force = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!force && csrfTokenLooksValid(getCsrfToken())) return true;
  if (csrfBootstrapPromise) return csrfBootstrapPromise;

  csrfBootstrapPromise = (async () => {
    try {
      const res = await fetch(resolveApiFetchUrl("/api/auth/csrf/"), {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      storeCsrfTokenFromPayload(data);
      if (!csrfTokenLooksValid(getCsrfToken())) {
        const fromCookie = readCsrfFromDocumentCookie();
        if (csrfTokenLooksValid(fromCookie)) {
          cachedCsrfToken = fromCookie;
        }
      }
      return csrfTokenLooksValid(getCsrfToken());
    } catch {
      return false;
    } finally {
      csrfBootstrapPromise = null;
    }
  })();

  return csrfBootstrapPromise;
}

export function getCsrfRequestHeaders(method: string): Record<string, string> {
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  if (!unsafe) return {};
  const csrf = getCsrfToken();
  if (!csrfTokenLooksValid(csrf)) return {};
  return { "X-CSRFToken": csrf };
}
