import { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from "react";
import {
  AUTH_CACHE_KEY,
  clearAuthSession,
  ensureCsrfCookie,
  fetchApi,
  hasAuthSessionFlag,
  markAuthSession,
} from "@/config/api";

export interface AuthUser {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  first_name: string;
  last_name: string;
  id: number;
  avatar_url?: string;
}

interface Permissions {
  [module: string]: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
}

interface AuthContextType {
  user: AuthUser | null;
  permissions: Permissions;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
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
    <AuthContext.Provider value={{ user, permissions, isAdmin, isAuthenticated, loading, refresh, signOut }}>
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
