import { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from "react";
import {
  clearAuthSession,
  ensureCsrfCookie,
  fetchApi,
  hasAuthSessionFlag,
  markAuthSession,
  setAccessTokenFromLogin,
} from "@/config/api";
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

async function reviveCookieSession(): Promise<boolean> {
  const res = await fetchApi("/api/token/refresh/", { method: "POST" });
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  setAccessTokenFromLogin((data as { access?: unknown } | null)?.access);
  markAuthSession();
  return true;
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
    markAuthSession();
    setAccessTokenFromLogin(data.access);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await ensureCsrfCookie();

      const hasSession = hasAuthSessionFlag() || (await reviveCookieSession());
      if (!hasSession) {
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
        clearAuthSession();
        setUser(null);
        setPermissions({});
        return;
      }

      setUser(nextUser);
      setPermissions(nextPerms);
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
