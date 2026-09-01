import { API_PREFIX } from '@/config/env';
import { ApiError, NetworkError, SessionExpiredError, messageFromPayload } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** false para login/refresh: no adjunta Bearer ni intenta renovar. */
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpClientDeps {
  baseUrl: string;
  getAccess: () => string | null;
  getRefresh: () => Promise<string | null>;
  /** Persiste el par rotado devuelto por `/token/refresh/`. */
  onTokensRotated: (access: string, refresh?: string) => Promise<void>;
  /** El refresh falló: la sesión debe cerrarse limpiamente. */
  onSessionExpired: () => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20000;

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  let url = `${baseUrl}${API_PREFIX}${suffix}`;
  if (query) {
    const params = Object.entries(query)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== null && entry[1] !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    if (params.length > 0) url += `?${params.join('&')}`;
  }
  return url;
}

/**
 * Solo se conserva el cuerpo si es JSON. Un cuerpo no-JSON (la página de
 * depuración de Django, el HTML de un proxy, un traceback) puede contener
 * configuración del servidor: no entra a la app ni siquiera para inspección.
 * En desarrollo se deja un recorte corto en consola para poder diagnosticar.
 */
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (__DEV__) {
      console.warn(
        `[api] Respuesta no-JSON (${response.status}). Extracto: ${text.slice(0, 120)}`,
      );
    }
    return null;
  }
}

/**
 * Cliente HTTP con **una sola** cola de refresh: si varias peticiones reciben
 * 401 a la vez, todas esperan la misma renovación en lugar de dispararle N
 * refresh al backend (que rota y blacklistea el token en cada uso).
 */
export class HttpClient {
  private readonly deps: HttpClientDeps;
  private readonly fetchImpl: typeof fetch;
  private refreshPromise: Promise<string> | null = null;

  constructor(deps: HttpClientDeps) {
    this.deps = deps;
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const withAuth = options.auth !== false;
    const first = await this.send(path, options, withAuth ? this.deps.getAccess() : null);

    if (first.status === 401 && withAuth) {
      const access = await this.refreshAccess();
      const retry = await this.send(path, options, access);
      // La reintentada siempre lleva token: un 401 aquí sí es sesión expirada.
      return this.unwrap<T>(retry, true);
    }

    // Una petición sin token (login, refresh) que responde 401 es una
    // credencial rechazada, no una sesión expirada: no debe cerrar sesión ni
    // disparar el mismo aviso que un token vencido.
    return this.unwrap<T>(first, withAuth);
  }

  /** Renueva el access token; concurrentes comparten la misma promesa. */
  private refreshAccess(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<string> {
    const refresh = await this.deps.getRefresh();
    if (!refresh) {
      this.deps.onSessionExpired();
      throw new SessionExpiredError();
    }

    let response: Response;
    try {
      response = await this.send('/token/refresh/', { method: 'POST', body: { refresh }, auth: false }, null);
    } catch (error) {
      // Red caída: no cerrar sesión, el usuario puede reintentar.
      throw error instanceof Error ? error : new NetworkError();
    }

    if (!response.ok) {
      this.deps.onSessionExpired();
      throw new SessionExpiredError();
    }

    const payload = (await parseBody(response)) as { access?: unknown; refresh?: unknown } | null;
    const access = typeof payload?.access === 'string' ? payload.access : '';
    if (!access) {
      this.deps.onSessionExpired();
      throw new SessionExpiredError();
    }
    const rotated = typeof payload?.refresh === 'string' ? payload.refresh : undefined;
    await this.deps.onTokensRotated(access, rotated);
    return access;
  }

  private async send(path: string, options: RequestOptions, access: string | null): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      // Marca de cliente nativo: el backend solo entrega el refresh en el body
      // a este cliente (ver apps/users/views.py `_is_mobile_client`).
      'X-Client': 'mobile',
    };
    if (access) headers.Authorization = `Bearer ${access}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const externalAbort = () => controller.abort();
    options.signal?.addEventListener('abort', externalAbort);

    try {
      return await this.fetchImpl(buildUrl(this.deps.baseUrl, path, options.query), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
        // Cliente solo-Bearer: no mandar las cookies (`access_token`, `csrftoken`)
        // que el backend pone en el login. Si viajan de vuelta, `CookieJWTAuthentication`
        // exige `X-CSRFToken` en los POST y el segundo login/logout falla con
        // "CSRF Failed". iOS respeta esto; Android/OkHttp puede ignorarlo, por eso
        // el backend además exime las peticiones con header Bearer.
        credentials: 'omit',
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw new NetworkError('El servidor tardó demasiado en responder. Intente de nuevo.');
      }
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', externalAbort);
    }
  }

  private async unwrap<T>(response: Response, tratarComoSesionExpirada: boolean): Promise<T> {
    const payload = await parseBody(response);
    if (response.ok) return payload as T;
    if (response.status === 401 && tratarComoSesionExpirada) {
      this.deps.onSessionExpired();
      throw new SessionExpiredError();
    }
    throw new ApiError(response.status, messageFromPayload(response.status, payload), payload);
  }
}
