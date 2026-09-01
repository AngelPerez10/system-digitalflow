import { HttpClient } from '../httpClient';
import { ApiError, NetworkError, SessionExpiredError } from '../errors';

interface FakeCall {
  url: string;
  init: RequestInit;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function makeClient(responses: Response[] | ((call: FakeCall) => Response)) {
  const calls: FakeCall[] = [];
  let access: string | null = 'access-1';
  let refresh: string | null = 'refresh-1';
  const rotated: string[] = [];
  const expired = jest.fn();
  let index = 0;

  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (typeof responses === 'function') return responses({ url, init });
    const next = responses[index];
    index += 1;
    if (!next) throw new Error(`Sin respuesta simulada para ${url}`);
    return next;
  }) as unknown as typeof fetch;

  const client = new HttpClient({
    baseUrl: 'https://api.test',
    getAccess: () => access,
    getRefresh: async () => refresh,
    onTokensRotated: async (nuevoAccess, nuevoRefresh) => {
      access = nuevoAccess;
      if (nuevoRefresh) refresh = nuevoRefresh;
      rotated.push(nuevoAccess);
    },
    onSessionExpired: () => {
      access = null;
      refresh = null;
      expired();
    },
    fetchImpl,
  });

  return { client, calls, rotated, expired, setRefresh: (value: string | null) => { refresh = value; } };
}

describe('HttpClient', () => {
  it('arma la URL con prefijo /api y query, y marca el cliente como móvil', async () => {
    const { client, calls } = makeClient([jsonResponse(200, [])]);
    await client.request('/ordenes/', { query: { mes: '2026-08', limit: undefined } });

    expect(calls[0]?.url).toBe('https://api.test/api/ordenes/?mes=2026-08');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['X-Client']).toBe('mobile');
    expect(headers.Authorization).toBe('Bearer access-1');
  });

  it('no manda Authorization cuando auth es false', async () => {
    const { client, calls } = makeClient([jsonResponse(200, { access: 'x' })]);
    await client.request('/login/', { method: 'POST', auth: false, body: { username: 'a' } });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('renueva el access ante un 401 y reintenta una sola vez', async () => {
    const { client, calls, rotated } = makeClient([
      jsonResponse(401, { detail: 'expirado' }),
      jsonResponse(200, { access: 'access-2', refresh: 'refresh-2' }),
      jsonResponse(200, { id: 1 }),
    ]);

    await expect(client.request('/ordenes/1/')).resolves.toEqual({ id: 1 });
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.test/api/ordenes/1/',
      'https://api.test/api/token/refresh/',
      'https://api.test/api/ordenes/1/',
    ]);
    expect(rotated).toEqual(['access-2']);
    expect((calls[2]?.init.headers as Record<string, string>).Authorization).toBe('Bearer access-2');
  });

  it('usa una sola cola de refresh para peticiones concurrentes', async () => {
    let refreshCount = 0;
    const { client } = makeClient(({ url, init }) => {
      if (url.endsWith('/token/refresh/')) {
        refreshCount += 1;
        return jsonResponse(200, { access: 'access-2', refresh: 'refresh-2' });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      // El access viejo ya no sirve; el rotado sí.
      return auth === 'Bearer access-1' ? jsonResponse(401, {}) : jsonResponse(200, { ok: true });
    });

    const resultados = await Promise.all([
      client.request('/ordenes/'),
      client.request('/me/'),
      client.request('/me/permissions/'),
    ]);

    expect(resultados).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    // Sin cola única serían 3 refresh, y el backend blacklistea el token en cada uso.
    expect(refreshCount).toBe(1);
  });

  it('un 401 de login (sin token) no dispara el aviso de sesión expirada', async () => {
    // Bug reportado: contraseña incorrecta hacía aparecer DOS avisos idénticos
    // «Tu sesión expiró…» — uno desde el notice global y otro desde el error
    // local — porque un 401 de una petición SIN token se trataba igual que un
    // token vencido.
    const { client, expired } = makeClient([jsonResponse(401, { detail: 'Credenciales inválidas' })]);
    await expect(
      client.request('/login/', { method: 'POST', auth: false, body: {} }),
    ).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
    expect(expired).not.toHaveBeenCalled();
  });

  it('cierra la sesión cuando el refresh ya no sirve', async () => {
    const { client, expired } = makeClient([jsonResponse(401, {}), jsonResponse(401, { detail: 'Token invalido o expirado.' })]);
    await expect(client.request('/ordenes/')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('cierra la sesión si ya no hay refresh guardado', async () => {
    const { client, expired, setRefresh } = makeClient([jsonResponse(401, {})]);
    setRefresh(null);
    await expect(client.request('/ordenes/')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('propaga el detail del backend en español', async () => {
    const { client } = makeClient([jsonResponse(400, { motivo_pausa: ['Indique por qué se pausó la orden.'] })]);
    await expect(client.request('/ordenes/1/', { method: 'PATCH', body: {} })).rejects.toMatchObject({
      status: 400,
      message: 'Indique por qué se pausó la orden.',
    });
  });

  it('no deja que un cuerpo no-JSON llegue a la app', async () => {
    // Django con DEBUG=True responde HTML ante un host no permitido.
    const paginaDebug = '<!DOCTYPE html><html><body>DisallowedHost: SECRET_KEY…</body></html>';
    const respuesta = {
      ok: false,
      status: 400,
      text: async () => paginaDebug,
    } as unknown as Response;

    const { client } = makeClient([respuesta]);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(client.request('/login/', { method: 'POST', auth: false, body: {} })).rejects.toMatchObject({
      status: 400,
      // Mensaje genérico, nunca el HTML del servidor.
      message: 'Los datos enviados no son válidos.',
      payload: null,
    });
  });

  it('convierte un 403 en ApiError sin tocar la sesión', async () => {
    const { client, expired } = makeClient([jsonResponse(403, { detail: 'No tiene permiso.' })]);
    await expect(client.request('/ordenes/9/')).rejects.toBeInstanceOf(ApiError);
    expect(expired).not.toHaveBeenCalled();
  });

  it('traduce la caída de red a un error legible', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const client = new HttpClient({
      baseUrl: 'https://api.test',
      getAccess: () => 'a',
      getRefresh: async () => 'r',
      onTokensRotated: async () => undefined,
      onSessionExpired: () => undefined,
      fetchImpl,
    });
    await expect(client.request('/ordenes/')).rejects.toBeInstanceOf(NetworkError);
  });
});
