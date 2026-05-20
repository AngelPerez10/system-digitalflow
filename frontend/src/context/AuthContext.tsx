import { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from "react";
import {
  AUTH_CACHE_KEY,
  clearAuthSession,
  ensureCsrfCookie,
  fetchApi,
  hasAuthSessionFlag,
  markAuthSession,
  setAccessTokenFromLogin,
} from "@/config/api";
import { hasBearerFallback } from "@/config/authSession";
import { userFromLoginPayload, type LoginSuccessPayload } from "@/config/loginErrors";
import type { AuthUser, Permissions } from "@/context/authTypes";

export type { AuthUser } from "@/context/authTypes";

interface AuthContextType {
  user: AuthUser | null;
  permissions: Permissions;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Tras login exitoso: hidrata usuario/permisos sin depender solo de cookies HttpOnly. */
  applyLoginSession: (data: LoginSuccessPayload) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readCache(): { user: AuthUser | null; permissions: Permissions } | null {
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(user: AuthUser | null, permissions: Permissions) {
  try {
    if (user?.username) {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, permissions }));
      markAuthSession();
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);

  const applyLoginSession = useCallback((data: LoginSuccessPayload) => {
    const nextUser = userFromLoginPayload(data);
    if (!nextUser) return;
    const nextPerms = (data.permissions as Permissions) ?? {};
    setUser(nextUser);
    setPermissions(nextPerms);
    writeCache(nextUser, nextPerms);
    markAuthSession();
    setAccessTokenFromLogin(data.access);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await ensureCsrfCookie();

      const hadSession = hasAuthSessionFlag() || !!readCache()?.user?.username;
      if (!hadSession) {
        setUser(null);
        setPermissions({});
        return;
      }

      const [userRes, permsRes] = await Promise.all([
        fetchApi("/api/me/"),
        fetchApi("/api/me/permissions/"),
      ]);

      let nextUser: AuthUser | null = null;
      let nextPerms: Permissions = {};

      if (userRes.ok) {
        const userData = await userRes.json().catch(() => null);
        if (userData?.username) {
          nextUser = userData;
        }
      }

      if (permsRes.ok) {
        const permsData = await permsRes.json().catch(() => ({}));
        nextPerms = permsData.permissions ?? {};
      }

      if (!nextUser) {
        const cached = readCache();
        if (cached?.user?.username && hasBearerFallback()) {
          setUser(cached.user);
          setPermissions(cached.permissions ?? {});
          return;
        }
        clearAuthSession();
        setUser(null);
        setPermissions({});
        return;
      }

      setUser(nextUser);
      setPermissions(nextPerms);
      writeCache(nextUser, nextPerms);
    } catch {
      clearAuthSession();
      setUser(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    void fetchApi("/api/logout/", { method: "POST" }).catch(() => null);
    clearAuthSession();
    setUser(null);
    setPermissions({});
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = !!(user?.is_superuser || user?.is_staff);
  const isAuthenticated = !!user?.username;

  return (
    <AuthContext.Provider
      value={{ user, permissions, isAdmin, isAuthenticated, loading, refresh, applyLoginSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
