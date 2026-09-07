import type { ModulePermissions, SessionUser } from '@/types/api';
import { initialSessionState, sessionReducer, type SessionState } from '../sessionReducer';

const user: SessionUser = {
  id: 1,
  username: 'tecnico1',
  email: 'tecnico1@example.com',
  first_name: 'Tecnico',
  last_name: 'Uno',
  is_staff: false,
  is_superuser: false,
  avatar_url: null,
  account_type: 'staff',
  must_change_password: false,
  cliente_id: null,
  portal_status: null,
};

const permissions: ModulePermissions = { ordenes: { view: true, create: false, edit: false, delete: false } };

describe('sessionReducer', () => {
  it('arranca en loading sin usuario', () => {
    expect(initialSessionState).toEqual({ status: 'loading', user: null, permissions: {}, notice: null });
  });

  it('signedIn deja status/user/permissions consistentes y limpia el notice', () => {
    const prev: SessionState = { status: 'signedOut', user: null, permissions: {}, notice: 'Sesión expirada' };
    const next = sessionReducer(prev, { type: 'signedIn', user, permissions });
    expect(next).toEqual({ status: 'signedIn', user, permissions, notice: null });
  });

  it('signedOut limpia usuario y permisos, y conserva el motivo', () => {
    const prev: SessionState = { status: 'signedIn', user, permissions, notice: null };
    const next = sessionReducer(prev, { type: 'signedOut', notice: 'Tu sesión expiró.' });
    expect(next).toEqual({ status: 'signedOut', user: null, permissions: {}, notice: 'Tu sesión expiró.' });
  });

  it('sessionReloaded actualiza usuario/permisos sin tocar notice ni status', () => {
    const prev: SessionState = { status: 'signedIn', user, permissions: {}, notice: null };
    const nuevoUsuario: SessionUser = { ...user, must_change_password: false, avatar_url: 'https://x/y.png' };
    const next = sessionReducer(prev, {
      type: 'sessionReloaded',
      user: nuevoUsuario,
      permissions,
    });
    expect(next).toEqual({ status: 'signedIn', user: nuevoUsuario, permissions, notice: null });
  });

  it('sessionReloaded no hace nada fuera de signedIn', () => {
    const prev: SessionState = { status: 'signedOut', user: null, permissions: {}, notice: null };
    const next = sessionReducer(prev, { type: 'sessionReloaded', user, permissions });
    expect(next).toBe(prev);
  });

  it('noticeCleared solo borra el notice', () => {
    const prev: SessionState = { status: 'signedOut', user: null, permissions: {}, notice: 'algo' };
    const next = sessionReducer(prev, { type: 'noticeCleared' });
    expect(next).toEqual({ status: 'signedOut', user: null, permissions: {}, notice: null });
  });
});
