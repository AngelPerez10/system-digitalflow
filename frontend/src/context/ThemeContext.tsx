"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

/** Aplica la clase en el mismo tick que el cambio de estado (evita 1 frame de desfase iconos CSS vs React). */
function applyDocumentTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

/**
 * Congela transitions/animations durante el flip de `.dark`.
 * Sin esto, cientos de `transition-colors` interpolan border/bg/text y los SVG con
 * currentColor “parpadean”.
 */
function withThemeTransitionLock(apply: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-changing");
  apply();
  // Doble rAF: aplica estilos nuevos y luego reactiva transitions en el siguiente frame.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-changing");
    });
  });
}

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* private mode / blocked storage */
  }
  return "light";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const initial = readStoredTheme();
    applyDocumentTheme(initial);
    return initial;
  });

  useEffect(() => {
    applyDocumentTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      withThemeTransitionLock(() => {
        applyDocumentTheme(next);
      });
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
