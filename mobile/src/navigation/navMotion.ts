import { Platform } from 'react-native';

/**
 * Tesis de movimiento (modo Operate): la navegación explica dónde estás,
 * no entretiene. Push espacial lista→detalle; edición como hoja suave;
 * todo ≤300 ms. Con «reducir movimiento» solo queda un fade corto.
 */

export type NavAnimation =
  | 'default'
  | 'fade'
  | 'fade_from_bottom'
  | 'slide_from_bottom'
  | 'slide_from_right'
  | 'ios_from_right'
  | 'none';

/** Duraciones en ms — salidas un poco más rápidas vía el stack nativo. */
export const NAV_MS = {
  /** Lista ↔ detalle: continuidad espacial. */
  push: 260,
  /** Detalle → edición: «abre el formulario». */
  sheet: 240,
  /** Login ↔ app / reducir movimiento. */
  fade: 180,
} as const;

/** Empuje lateral sutil (iOS nativo; en Android el equivalente iOS-like). */
export function pushAnimation(reduced: boolean): NavAnimation {
  if (reduced) return 'fade';
  return Platform.OS === 'ios' ? 'default' : 'ios_from_right';
}

/** Entrada de formulario: sube y se desvanece un poco — no un modal dramático. */
export function sheetAnimation(reduced: boolean): NavAnimation {
  if (reduced) return 'fade';
  return 'fade_from_bottom';
}

export function fadeAnimation(_reduced: boolean): NavAnimation {
  return 'fade';
}

export function animationDurationMs(kind: 'push' | 'sheet' | 'fade', reduced: boolean): number {
  if (reduced) return NAV_MS.fade;
  return NAV_MS[kind];
}
