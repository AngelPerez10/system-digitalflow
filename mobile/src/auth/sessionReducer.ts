import type { ModulePermissions, SessionUser } from '@/types/api';

/**
 * Estado de sesión como unión discriminada: `signedIn` siempre trae `user`,
 * `loading`/`signedOut` nunca lo traen. Evita representar combinaciones
 * imposibles (p. ej. `status: 'signedIn'` con `user: null`) que 4 `useState`
 * sueltos no podían impedir por sí solos.
 */
export type SessionState =
  | { status: 'loading'; user: null; permissions: ModulePermissions; notice: string | null }
  | { status: 'signedIn'; user: SessionUser; permissions: ModulePermissions; notice: string | null }
  | { status: 'signedOut'; user: null; permissions: ModulePermissions; notice: string | null };

export type SessionAction =
  | { type: 'signedIn'; user: SessionUser; permissions: ModulePermissions }
  /** Relee `/me/` y permisos sin pasar por login (p. ej. tras cambiar contraseña); no toca `notice`. */
  | { type: 'sessionReloaded'; user: SessionUser; permissions: ModulePermissions }
  | { type: 'signedOut'; notice: string | null }
  | { type: 'noticeCleared' };

export const initialSessionState: SessionState = {
  status: 'loading',
  user: null,
  permissions: {},
  notice: null,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'signedIn':
      return { status: 'signedIn', user: action.user, permissions: action.permissions, notice: null };
    case 'sessionReloaded':
      // Solo tiene sentido mientras hay sesión activa; en cualquier otro
      // estado no hay nada que recargar.
      if (state.status !== 'signedIn') return state;
      return { ...state, user: action.user, permissions: action.permissions };
    case 'signedOut':
      return { status: 'signedOut', user: null, permissions: {}, notice: action.notice };
    case 'noticeCleared':
      return { ...state, notice: null };
    default:
      return state;
  }
}
