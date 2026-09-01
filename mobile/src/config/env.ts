/**
 * Configuración de entorno. `EXPO_PUBLIC_API_URL` se inyecta en build time;
 * aquí nunca van secretos (todo lo que empieza con EXPO_PUBLIC_ viaja al APK).
 */
const RAW_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(RAW_API_URL);

/** Prefijo canónico de las rutas de órdenes y auth (ver backend/config/urls.py). */
export const API_PREFIX = '/api';

export const IS_DEV = __DEV__;

/**
 * Mensaje de configuración inválida, o `null` si todo está en orden.
 * Se muestra en la pantalla de login en vez de reventar el arranque.
 */
export function getApiConfigError(): string | null {
  if (!API_BASE_URL) {
    return 'Falta configurar EXPO_PUBLIC_API_URL. Revise el archivo .env de la app.';
  }
  if (!/^https?:\/\//i.test(API_BASE_URL)) {
    return 'EXPO_PUBLIC_API_URL debe iniciar con http:// o https://.';
  }
  if (!IS_DEV && !/^https:\/\//i.test(API_BASE_URL)) {
    return 'En compilaciones de producción la API debe usar HTTPS.';
  }
  return null;
}
