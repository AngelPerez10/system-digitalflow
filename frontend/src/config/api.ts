import { hasBearerFallback, setAccessTokenFromLogin } from "./authSession";
import { apiUrl, API_BASE, PUBLIC_ORIGIN, publicUrl } from "./apiBase";

export {
  bearerAuthHeader,
  clearAccessToken,
  getAccessToken,
  hasBearerFallback,
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
} from "./csrf";
export {
  AUTH_SESSION_FLAG,
  clearAuthSession,
  fetchApi,
  getAuthHeaders,
  hasAuthSessionFlag,
  markAuthSession,
  resetRefreshState,
  revokeAuthSession,
} from "./authFetch";

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

export function resolveMediaUrl(url: string | null | undefined): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}
