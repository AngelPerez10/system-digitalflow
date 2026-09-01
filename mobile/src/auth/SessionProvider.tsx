import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '@/api/authApi';
import { setSessionExpiredHandler } from '@/api/client';
import { IS_DEV } from '@/config/env';
import { bootstrapSession } from './bootstrapSession';
import { portalAcceso } from './portalAcceso';
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
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<ModulePermissions>({});
  const [notice, setNotice] = useState<string | null>(null);

  const cerrarSesionLocal = useCallback(
    async (message: string | null, { borrarTokens = true }: { borrarTokens?: boolean } = {}) => {
      // Un fallo de red no debe costarle la sesión al técnico: los tokens solo
      // se borran cuando el servidor los rechazó de verdad.
      if (borrarTokens) await tokenStore.clear();
      setUser(null);
      setPermissions({});
      setNotice(message);
      setStatus('signedOut');
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
        setUser(resultado.user);
        setPermissions(resultado.permissions);
        setStatus('signedIn');
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
    setUser({
      id: data.id,
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      is_staff: data.is_staff,
      is_superuser: data.is_superuser,
      // El login no trae `avatar_url`; se completa en el primer `/me/`
      // (arranque en frío o `recargarSesion` tras cambiar la contraseña).
      avatar_url: null,
      account_type: data.account_type,
      must_change_password: data.must_change_password,
      cliente_id: data.cliente_id,
      portal_status: data.portal_status,
    });
    setPermissions(data.permissions);
    setNotice(null);
    setStatus('signedIn');
  }, []);

  const recargarSesion = useCallback(async () => {
    const [me, perms] = await Promise.all([authApi.fetchMe(), authApi.fetchMyPermissions()]);
    setUser(me);
    setPermissions(perms);
  }, []);

  const signOut = useCallback(async () => {
    const refresh = await tokenStore.getRefresh();
    try {
      await authApi.logout(refresh);
    } catch {
      // El blacklist es best-effort: sin red igual cerramos sesión local.
    }
    await cerrarSesionLocal(null);
  }, [cerrarSesionLocal]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      permissions,
      notice,
      signIn,
      signOut,
      recargarSesion,
      clearNotice: () => setNotice(null),
    }),
    [status, user, permissions, notice, signIn, signOut, recargarSesion],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  return value;
}
