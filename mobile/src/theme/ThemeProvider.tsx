import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import {
  darkColors,
  lightColors,
  type ThemeColors,
} from '@/theme/tokens';
import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/theme/themeStorage';

export type ResolvedScheme = 'light' | 'dark';

interface ThemeContextValue {
  /** Preferencia del usuario (incluye «seguir al sistema»). */
  preference: ThemePreference;
  /** Esquema resuelto que pinta la UI ahora. */
  scheme: ResolvedScheme;
  colors: ThemeColors;
  /**
   * `false` mientras se lee la preferencia guardada de `SecureStore`. Durante
   * ese instante `scheme` cae en el valor del sistema; si el usuario había
   * forzado un tema distinto al del SO, la UI parpadea al hidratar. El layout
   * raíz mantiene el splash hasta que esto es `true` para que no se vea.
   */
  hydrated: boolean;
  setPreference: (next: ThemePreference) => void;
  /** Alterna solo entre claro y oscuro (la navbar usa esto). */
  toggleLightDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(
  preference: ThemePreference,
  system: 'light' | 'dark' | 'unspecified' | null | undefined,
): ResolvedScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const guardada = await loadThemePreference();
      if (!vivo) return;
      if (guardada) setPreferenceState(guardada);
      setHidratado(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const scheme = resolveScheme(preference, system);
  const colors = scheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    if (!hidratado) return;
    // RN 0.86: setColorScheme ya no acepta undefined; 'unspecified' = seguir al sistema.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference, hidratado]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void saveThemePreference(next);
  }, []);

  const toggleLightDark = useCallback(() => {
    setPreferenceState((prev) => {
      const actual = resolveScheme(prev, Appearance.getColorScheme());
      const next: ThemePreference = actual === 'dark' ? 'light' : 'dark';
      void saveThemePreference(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme, colors, hydrated: hidratado, setPreference, toggleLightDark }),
    [preference, scheme, colors, hidratado, setPreference, toggleLightDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
}

/** Para tests o pantallas fuera del provider: no lanza. */
export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
