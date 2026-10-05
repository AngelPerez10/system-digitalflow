/** Tonos de color del listado de cuentas (etiquetas y secciones). */
import type { CaaSeccionKey, CaaUnidadSeccionKey } from "./cuentasAntarixFiltros";

export type CaaSeccionTone = { bar: string; band: string; text: string; count: string; tile: string };

export const CAA_TONE = {
  activa: "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]",
  bloqueada: "bg-[#FFF1F3] text-[#B4234A] ring-[#FBCFD9] dark:bg-[#3A0F1C] dark:text-[#FDA4B8] dark:ring-[#6B1E35]",
  sinUnidades: "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]",
  unidades: "bg-[#EEF3FF] text-[#1244D1] ring-[#CFDCFF] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF] dark:ring-[#2C3F7A]",
  distribuidor: "bg-[#F1F1FE] text-[#3E3EA8] ring-[#D8D8FA] dark:bg-[#23244F] dark:text-[#C7C8FB] dark:ring-[#3B3D7A]",
} as const;

export const SECCION_TONE: Record<CaaSeccionKey, CaaSeccionTone> = {
  bloqueadas: {
    bar: "bg-[#E11D48] dark:bg-[#FB7185]",
    band: "bg-[#FFF5F7] dark:bg-[#2A0D16]",
    text: "text-[#B4234A] dark:text-[#FDA4B8]",
    count: CAA_TONE.bloqueada,
    tile: "bg-[#FFE4EA] text-[#B4234A] ring-1 ring-inset ring-[#FBCFD9] dark:bg-[#3A0F1C] dark:text-[#FDA4B8] dark:ring-[#6B1E35]",
  },
  sin_unidades: {
    bar: "bg-[#D08A1E] dark:bg-[#E6A23C]",
    band: "bg-[#FFFAF0] dark:bg-[rgba(230,162,60,0.07)]",
    text: "text-[#8A5D0F] dark:text-[#F2C27A]",
    count: CAA_TONE.sinUnidades,
    tile: "bg-[#FFF1D6] text-[#8A5D0F] ring-1 ring-inset ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]",
  },
  con_unidades: {
    bar: "bg-[#0E8A5F] dark:bg-[#34D399]",
    band: "bg-[#F3FBF7] dark:bg-[#0B2117]",
    text: "text-[#04724D] dark:text-[#86EFAC]",
    count: CAA_TONE.activa,
    tile: "bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63]",
  },
};


/** Unidades: mismos tonos que cuentas (inactiva = rosa, sin cuenta = ámbar, activa = verde). */
export const UNIDAD_SECCION_TONE: Record<CaaUnidadSeccionKey, CaaSeccionTone> = {
  inactivas: SECCION_TONE.bloqueadas,
  sin_cuenta: SECCION_TONE.sin_unidades,
  activas: SECCION_TONE.con_unidades,
};
