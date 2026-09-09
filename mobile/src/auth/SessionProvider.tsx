import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as authApi from '@/api/authApi';
import { setSessionExpiredHandler } from '@/api/client';
import { IS_DEV } from '@/config/env';
import { darDeBajaDispositivoPush } from '@/notifications/registrarPush';
import { bootstrapSession } from './bootstrapSession';
import { portalAcceso } from './portalAcceso';
import { initialSessionState, sessionReducer } from './sessionReducer';
import type { ModulePermissions, SessionUser } from '@/types/api';
import { tokenStore } from './tokenStore';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: SessionStatus;
  user: SessionUser | null;
  permissions: ModulePermissions;
  /** Motivo del último cierre de sesión automático, para mostrarlo en Login. */
  notice: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Relee `/me/` y los permisos sin re-login. Lo usa el cambio de contraseña
   * del portal para que `must_change_password` pase a `false` y la guarda de
   * `app/cliente/_layout.tsx` deje pasar.
   */
  recargarSesion: () => Promise<void>;
  clearNotice: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);

  const cerrarSesionLocal = useCallback(
    async (message: string | null, { borrarTokens = true }: { borrarTokens?: boolean } = {}) => {
      // Un fallo de red no debe costarle la sesión al técnico: los tokens solo
      // se borran cuando el servidor los rechazó de verdad.
      if (borrarTokens) await tokenStore.clear();
      dispatch({ type: 'signedOut', notice: message });
    },
    [],
  );

  // El cliente HTTP avisa cuando el refresh ya no sirve.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      void cerrarSesionLocal('Tu sesión expiró. Inicia sesión de nuevo.');
    });
    return () => setSessionExpiredHandler(null);
  }, [cerrarSesionLocal]);

  // Rehidratación al abrir la app: los tokens viven en SecureStore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await portalAcceso.restore();
      const resultado = await bootstrapSession({
        restore: () => tokenStore.restore(),
        fetchMe: authApi.fetchMe,
        fetchPermissions: authApi.fetchMyPermissions,
      });
      if (cancelled) return;

      if (resultado.status === 'signedIn') {
        dispatch({ type: 'signedIn', user: resultado.user, permissions: resultado.permissions });
        return;
      }

      if (IS_DEV && resultado.notice) console.warn('[auth]', resultado.notice);
      await cerrarSesionLocal(resultado.notice, { borrarTokens: resultado.borrarTokens });
    })();
    return () => {
      cancelled = true;
    };
  }, [cerrarSesionLocal]);

  const signIn = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    await tokenStore.save({ access: data.access, refresh: data.refresh });
    // `LoginResponse extends SessionUser` (types/api.ts): descartando solo
    // `permissions` (access/refresh ya se guardaron arriba), `user` conserva
    // todos los campos de SessionUser sin listarlos a mano ni perder ninguno
    // que el backend agregue a futuro.
    const { permissions, ...user } = data;
    dispatch({ type: 'signedIn', user, permissions });
  }, []);

  const recargarSesion = useCallback(async () => {
    const [user, permissions] = await Promise.all([authApi.fetchMe(), authApi.fetchMyPermissions()]);
    dispatch({ type: 'sessionReloaded', user, permissions });
  }, []);

  const signOut = useCallback(async () => {
    const refresh = await tokenStore.getRefresh();
    // Baja del dispositivo push antes de invalidar el token (necesita auth).
    // Best-effort: el backend también limpia tokens muertos por su cuenta.
    await darDeBajaDispositivoPush();
    try {
      await authApi.logout(refresh);
    } catch {
      // El blacklist es best-effort: sin red igual cerramos sesión local.
    }
    await cerrarSesionLocal(null);
  }, [cerrarSesionLocal]);

  const value = useMemo<SessionValue>(
    () => ({
      status: state.status,
      user: state.user,
      permissions: state.permissions,
      notice: state.notice,
      signIn,
      signOut,
      recargarSesion,
      clearNotice: () => dispatch({ type: 'noticeCleared' }),
    }),
    [state, signIn, signOut, recargarSesion],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  return value;
}
