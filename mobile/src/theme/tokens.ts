/**
 * Mundo visual de SertelPro: azul eléctrico sobre blanco (y su gemelo oscuro).
 *
 * Reemplaza por completo el crema + naranja heredado del ERP web (decisión del
 * usuario, 2026-08-26). El listón de acabado es Linear/Vercel: jerarquía por
 * peso tipográfico, líneas de 1 px, sombras al borde de lo visible y el azul
 * reservado como único acento. El modo oscuro invierte el lienzo, no la marca.
 */

export type ThemeColors = {
  canvas: string;
  surface: string;
  surfaceSunken: string;
  line: string;
  lineStrong: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  primary: string;
  primaryPressed: string;
  primaryDisabled: string;
  onPrimaryDisabled: string;
  gridDot: string;
  halo: string;
  primaryRing: string;
  onPrimary: string;
  statusPendienteBg: string;
  statusPendienteText: string;
  statusPausadoBg: string;
  statusPausadoText: string;
  statusResueltoBg: string;
  statusResueltoText: string;
  danger: string;
  dangerBg: string;
  dangerLine: string;
  success: string;
  /**
   * Familia marino + dorado. Transversal: cabecera del acceso (bienvenida /
   * login / registro), portal del cliente y vistas del técnico (lista, detalle,
   * edición). El marino es la superficie de la banda de cabecera; el dorado, el
   * acento de acción (flecha de "ver detalle", píldora "Sin guardar", viñetas de
   * "lo que se hizo"). Nunca como fondo de acción primaria — ese es `navy`.
   */
  navy: string;
  navyDeep: string;
  navyDisabled: string;
  onNavy: string;
  onNavyMuted: string;
  gold: string;
  onGold: string;
  goldSoftBg: string;
  goldSoftText: string;
  /** Sombra de elevación (Android `elevation` / iOS shadowColor). */
  shadow: string;
  /** Fondo de la navbar (puede diferir ligeramente del canvas). */
  nav: string;
};

export const lightColors: ThemeColors = {
  canvas: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSunken: '#FAFAFA',
  line: '#E7E7EA',
  lineStrong: '#D3D3D8',
  ink: '#09090B',
  inkMuted: '#52525B',
  inkSubtle: '#6E6E77',
  primary: '#1B5CFF',
  primaryPressed: '#1244D1',
  primaryDisabled: '#DCE7FF',
  onPrimaryDisabled: '#2F4899',
  gridDot: 'rgba(9, 9, 11, 0.055)',
  halo: '#1B5CFF',
  primaryRing: 'rgba(27, 92, 255, 0.18)',
  onPrimary: '#FFFFFF',
  statusPendienteBg: '#FFF7E6',
  statusPendienteText: '#8A5A00',
  statusPausadoBg: '#EEF1FF',
  statusPausadoText: '#3538CD',
  statusResueltoBg: '#E9F8F0',
  statusResueltoText: '#04724D',
  danger: '#C22B2B',
  dangerBg: '#FEF2F2',
  dangerLine: '#F6CFCF',
  success: '#04724D',
  navy: '#17235B',
  navyDeep: '#0F1A46',
  navyDisabled: '#C6CCE0',
  onNavy: '#FFFFFF',
  onNavyMuted: 'rgba(255, 255, 255, 0.72)',
  gold: '#E6A23C',
  onGold: '#17235B',
  goldSoftBg: 'rgba(230, 162, 60, 0.14)',
  goldSoftText: '#9A6B15',
  shadow: '#09090B',
  nav: '#FFFFFF',
};

/** Oscuro de taller: tinta clara sobre zinc, azul un tono más luminoso para contraste. */
export const darkColors: ThemeColors = {
  canvas: '#0B0B0F',
  surface: '#141418',
  surfaceSunken: '#1A1A22',
  line: '#2A2A34',
  lineStrong: '#3D3D4A',
  ink: '#F4F4F5',
  inkMuted: '#A1A1AA',
  inkSubtle: '#71717A',
  primary: '#4B7CFF',
  primaryPressed: '#3B6AF0',
  primaryDisabled: '#1A2748',
  onPrimaryDisabled: '#9BB0F0',
  gridDot: 'rgba(244, 244, 245, 0.07)',
  halo: '#4B7CFF',
  primaryRing: 'rgba(75, 124, 255, 0.28)',
  onPrimary: '#FFFFFF',
  statusPendienteBg: '#2A2110',
  statusPendienteText: '#F5C84C',
  statusPausadoBg: '#1A1F3D',
  statusPausadoText: '#A5B4FC',
  statusResueltoBg: '#0F2A1C',
  statusResueltoText: '#4ADE80',
  danger: '#F87171',
  dangerBg: '#3F1518',
  dangerLine: '#7F1D1D',
  success: '#4ADE80',
  navy: '#1B2A63',
  navyDeep: '#131E49',
  navyDisabled: '#2A3560',
  onNavy: '#FFFFFF',
  onNavyMuted: 'rgba(255, 255, 255, 0.72)',
  gold: '#E6A23C',
  onGold: '#17235B',
  goldSoftBg: 'rgba(230, 162, 60, 0.18)',
  goldSoftText: '#E6A23C',
  shadow: '#000000',
  nav: '#0F0F14',
};

/** Alias del modo claro — preferir `useTheme().colors` en UI nueva. */
export const colors = lightColors;

/** Escala de 4 px. Nada se coloca fuera de este paso. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  /** La tarjeta de resumen del encabezado — más presencia que cualquier
   *  tarjeta de contenido, para que se lea como el módulo principal. */
  xl: 24,
  /** Tarjeta de elección de rol (acceso) — más redondeada que `lg`. */
  card: 20,
  /** Hoja blanca y cabecera del acceso. */
  sheet: 28,
  pill: 999,
} as const;

/**
 * Geist (Vercel). El tracking negativo en los tamaños grandes es lo que separa
 * esta tipografía de la del sistema: sin él, el display se lee blando.
 */
export const font = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  /** Solo para el acceso (título "SertelPro", rediseño con Sleek): ningún otro
   *  texto del sistema pide un peso más pesado que `semibold`. */
  bold: 'Geist_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1.1 },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  bodyMedium: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  button: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  /** Datos: folios, horas, contadores. Numerales tabulares, nunca prosa. */
  mono: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
} as const;

/**
 * Elevación. Una sola escala, con desplazamiento y desenfoque suave: el panel
 * del formulario se levanta del lienzo, nada más flota en la app.
 */
export const elevation = {
  panel: {
    shadowColor: '#09090B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  /** Más presencia que `panel`: para tarjetas de contenido en una lista, donde
   *  la sombra tenue del panel se leía como "plana" a plena luz de pantalla. */
  card: {
    shadowColor: '#09090B',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

/** Elevación teñida por el tema (modo oscuro necesita más opacidad). */
export function elevationFor(
  colors: ThemeColors,
  level: 'panel' | 'card' = 'card',
) {
  const base = elevation[level];
  const dark = colors.canvas === darkColors.canvas;
  return {
    ...base,
    shadowColor: colors.shadow,
    shadowOpacity: dark ? (level === 'card' ? 0.45 : 0.35) : base.shadowOpacity,
  };
}

/** Mínimo táctil accesible. */
export const TOUCH_TARGET = 48;

export const MOTION = {
  /** Espaciado entre bloques de `useEntrance` — corto a propósito (Operate). */
  stagger: 48,
  /** Ciclo de la señal de la marca. Lento a propósito: respira, no parpadea. */
  pulse: 3200,
  /** Palomita de confirmación antes de entrar. */
  success: 450,
  /** Desplazamiento vertical de entrada (px). Antes 12; 8 se lee menos «show». */
  entranceY: 8,
} as const;
