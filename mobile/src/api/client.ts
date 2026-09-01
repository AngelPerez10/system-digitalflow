import { API_BASE_URL } from '@/config/env';
import { tokenStore } from '@/auth/tokenStore';
import { HttpClient } from './httpClient';

/**
 * El cliente vive fuera de React (los hooks lo consumen), así que la sesión
 * registra aquí su reacción al 401 irrecuperable.
 */
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export const apiClient = new HttpClient({
  baseUrl: API_BASE_URL,
  getAccess: () => tokenStore.getAccess(),
  getRefresh: () => tokenStore.getRefresh(),
  onTokensRotated: (access, refresh) => tokenStore.updateAccess(access, refresh),
  onSessionExpired: () => sessionExpiredHandler?.(),
});
