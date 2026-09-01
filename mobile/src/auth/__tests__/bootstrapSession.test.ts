import { NetworkError, SessionExpiredError } from '@/api/errors';
import type { SessionUser } from '@/types/api';
import { bootstrapSession } from '../bootstrapSession';

const usuario: SessionUser = {
  id: 4,
  username: 'tecnico',
  email: 'tecnico@sertel.mx',
  first_name: 'Juan',
  last_name: 'Pérez',
  is_staff: false,
  is_superuser: false,
  avatar_url: null,
  account_type: 'staff',
  must_change_password: false,
  cliente_id: null,
  portal_status: null,
};

const deps = {
  restore: jest.fn(),
  fetchMe: jest.fn(),
  fetchPermissions: jest.fn(),
  timeoutMs: 50,
};

beforeEach(() => {
  jest.clearAllMocks();
  deps.restore.mockResolvedValue({ access: 'a', refresh: 'r' });
  deps.fetchMe.mockResolvedValue(usuario);
  deps.fetchPermissions.mockResolvedValue({ ordenes: { view: true } });
});

describe('bootstrapSession', () => {
  it('restaura la sesión guardada', async () => {
    await expect(bootstrapSession(deps)).resolves.toEqual({
      status: 'signedIn',
      user: usuario,
      permissions: { ordenes: { view: true } },
    });
  });

  it('sin tokens guardados manda a login sin aviso', async () => {
    deps.restore.mockResolvedValue(null);
    await expect(bootstrapSession(deps)).resolves.toEqual({
      status: 'signedOut',
      notice: null,
      borrarTokens: false,
    });
  });

  it('nunca se queda colgado si el almacén seguro no responde', async () => {
    // Este era el síntoma: la app quedaba en «Restaurando sesión…» para siempre.
    deps.restore.mockReturnValue(new Promise(() => undefined));
    const resultado = await bootstrapSession(deps);
    expect(resultado.status).toBe('signedOut');
  });

  it('nunca se queda colgado si el servidor no responde', async () => {
    deps.fetchMe.mockReturnValue(new Promise(() => undefined));
    const resultado = await bootstrapSession(deps);
    expect(resultado).toMatchObject({ status: 'signedOut', borrarTokens: false });
    if (resultado.status === 'signedOut') {
      // Aviso accionable para el técnico; la causa técnica va al log de dev.
      expect(resultado.notice).toMatch(/servidor/i);
    }
  });

  it('conserva los tokens ante un fallo de red', async () => {
    deps.fetchMe.mockRejectedValue(new NetworkError());
    await expect(bootstrapSession(deps)).resolves.toMatchObject({
      status: 'signedOut',
      borrarTokens: false,
    });
  });

  it('borra los tokens cuando el servidor rechaza la sesión', async () => {
    deps.fetchMe.mockRejectedValue(new SessionExpiredError());
    await expect(bootstrapSession(deps)).resolves.toEqual({
      status: 'signedOut',
      notice: 'Tu sesión expiró. Inicia sesión de nuevo.',
      borrarTokens: true,
    });
  });

  it('traduce un error inesperado sin dejar la app en blanco', async () => {
    deps.restore.mockRejectedValue(new Error('Keystore corrupto'));
    const resultado = await bootstrapSession(deps);
    expect(resultado.status).toBe('signedOut');
    if (resultado.status === 'signedOut') {
      expect(resultado.borrarTokens).toBe(true);
      expect(resultado.notice).toContain('Keystore corrupto');
    }
  });
});
