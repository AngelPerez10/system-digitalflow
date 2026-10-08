/**
 * Paleta de datos del panel: un color por módulo, igual en ícono, mini gráfica,
 * barras y gráficas. El azul de acción (#1B5CFF) queda solo para enlaces y foco;
 * los estados (autorizada, cancelada…) conservan sus tonos semánticos.
 *
 * Validada con el validador de dataviz (CVD ΔE ≥ 8, banda de luminosidad) en
 * claro (#FFFFFF) y oscuro (#111827). El dorado claro queda bajo 3:1 contra
 * blanco: siempre va con su cifra visible.
 */

export type Modulo = "ventas" | "monto" | "ordenes" | "proyectos";

type Tono = {
  /** Marca principal de la serie (mes en curso, línea). */
  light: string;
  dark: string;
  /** Barras del resto de los meses. */
  softLight: string;
  softDark: string;
  /** Caja del ícono. */
  icon: string;
  /** Texto de acento (cifras pequeñas). */
  text: string;
  /** Relleno de barras de progreso. */
  bar: string;
};

export const MODULO: Record<Modulo, Tono> = {
  ventas: {
    light: "#0F9D8A",
    dark: "#14A08E",
    softLight: "#BFE7E0",
    softDark: "#134E4A",
    icon: "bg-[#E6F6F3] text-[#0B7A6B] dark:bg-[#0F2E2B] dark:text-[#2DD4BF]",
    text: "text-[#0B7A6B] dark:text-[#2DD4BF]",
    bar: "bg-[#0F9D8A] dark:bg-[#14A08E]",
  },
  monto: {
    light: "#D9952E",
    dark: "#BF8226",
    softLight: "#F3DDB4",
    softDark: "#4A3719",
    icon: "bg-[rgba(230,162,60,0.14)] text-[#B7791F] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]",
    text: "text-[#B7791F] dark:text-[#E6A23C]",
    bar: "bg-[#D9952E] dark:bg-[#BF8226]",
  },
  ordenes: {
    light: "#4453A8",
    dark: "#7A8BE6",
    softLight: "#D3D8F2",
    softDark: "#2A3366",
    icon: "bg-[#EEF0FA] text-[#4453A8] dark:bg-[#1E2550] dark:text-[#A5B1F2]",
    text: "text-[#4453A8] dark:text-[#A5B1F2]",
    bar: "bg-[#4453A8] dark:bg-[#7A8BE6]",
  },
  proyectos: {
    light: "#C2477F",
    dark: "#D25890",
    softLight: "#F2CDDD",
    softDark: "#552139",
    icon: "bg-[#FBEEF4] text-[#A8386B] dark:bg-[#3A1527] dark:text-[#F08DB8]",
    text: "text-[#A8386B] dark:text-[#F08DB8]",
    bar: "bg-[#C2477F] dark:bg-[#D25890]",
  },
};

export function serieColor(m: Modulo, dark: boolean) {
  const t = MODULO[m];
  return { main: dark ? t.dark : t.light, soft: dark ? t.softDark : t.softLight };
}

/** Segmento activo neutro (marino), sin azul de acción. */
export const segmentoActivo =
  "bg-white text-[#17235B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#1F2A3C] dark:text-[#F8FAFC] dark:ring-[#334056]";
export const segmentoInactivo = "text-[#52525B] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]";
