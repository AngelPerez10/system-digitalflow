/** Tokens visuales del tablero Equipo (status de orden, botones de fila). */
import { isOrdenCancelada, isOrdenResuelta } from "../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";

/** Status de orden: misma paleta que la tabla de Órdenes. */
export const ORDEN_TONE = {
  pendiente: {
    label: "Pendiente",
    pill: "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]",
    dot: "bg-[#D08A1E] dark:bg-[#E6A23C]",
    accent: "bg-[#D08A1E] dark:bg-[#E6A23C]",
  },
  pausado: {
    label: "Pausado",
    pill: "bg-[#F1F1FE] text-[#3E3EA8] ring-[#D8D8FA] dark:bg-[#23244F] dark:text-[#C7C8FB] dark:ring-[#3B3D7A]",
    dot: "bg-[#5B5BD6] dark:bg-[#A5A6F6]",
    accent: "bg-[#5B5BD6] dark:bg-[#A5A6F6]",
  },
  saldo_pendiente: {
    label: "Saldo pendiente",
    pill: "bg-[#FDF4FF] text-[#86198F] ring-[#F5D0FE] dark:bg-[#3B0A45] dark:text-[#F5D0FE] dark:ring-[#701A75]",
    dot: "bg-[#A21CAF] dark:bg-[#E879F9]",
    accent: "bg-[#A21CAF] dark:bg-[#E879F9]",
  },
  resuelto: {
    label: "Resuelto",
    pill: "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]",
    dot: "bg-[#0E8A5F] dark:bg-[#34D399]",
    accent: "bg-[#0E8A5F] dark:bg-[#34D399]",
  },
  cancelada: {
    label: "Cancelada",
    pill: "bg-[#FEF2F2] text-[#B42323] ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    accent: "bg-[#C22B2B] dark:bg-[#F87171]",
  },
} as const;

export function ordenTone(status: unknown) {
  if (isOrdenResuelta(status)) return ORDEN_TONE.resuelto;
  if (isOrdenCancelada(status)) return ORDEN_TONE.cancelada;
  const s = String(status || "").toLowerCase();
  if (s === "pausado") return ORDEN_TONE.pausado;
  if (s === "saldo_pendiente") return ORDEN_TONE.saldo_pendiente;
  return ORDEN_TONE.pendiente;
}

/**
 * Identidad de tipo de trabajo (orden vs proyecto).
 *
 * Tonos propios (turquesa y rosa, muy distintos entre sí) y a propósito ajenos a los
 * de status (azul, naranja, índigo, magenta, verde, rojo): una barra o un ícono de tipo nunca se
 * confunde con el estado de la tarjeta. El tipo además se distingue por ícono
 * y texto, no solo por color. Para cambiar los colores basta con editar aquí.
 */
export const TIPO_TONE = {
  orden: {
    label: "Orden de trabajo",
    /** Barra lateral de la tarjeta y de la leyenda. */
    bar: "bg-[#14B8A6] dark:bg-[#2DD4BF]",
    /** Ícono del tipo. */
    icon: "text-[#0F766E] dark:text-[#5EEAD4]",
    /** Pastilla de texto (hoy solo la usa la jornada de un proyecto). */
    chip: "bg-[#E6F8F5] text-[#0B5F58] dark:bg-[rgba(45,212,191,0.14)] dark:text-[#5EEAD4]",
    /** Recuadro con ícono (tarjeta y leyenda). */
    tile: "bg-[#E6F8F5] text-[#0F766E] ring-[#BDEBE4] dark:bg-[rgba(45,212,191,0.14)] dark:text-[#5EEAD4] dark:ring-[rgba(45,212,191,0.3)]",
    /** Etiqueta de la vista previa al arrastrar (siempre sobre blanco). */
    dragTag: "bg-[#E6F8F5] text-[#0B5F58]",
    /** Recuadro del contador de la semana. */
    stat: "border-teal-200/80 bg-teal-50/90 text-teal-700 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300",
  },
  proyecto: {
    label: "Proyecto",
    bar: "bg-[#F472B6] dark:bg-[#F9A8D4]",
    icon: "text-[#BE185D] dark:text-[#F9A8D4]",
    chip: "bg-[#FDF0F7] text-[#9D174D] dark:bg-[rgba(249,168,212,0.14)] dark:text-[#F9A8D4]",
    tile: "bg-[#FDF0F7] text-[#BE185D] ring-[#F8D3E6] dark:bg-[rgba(249,168,212,0.14)] dark:text-[#F9A8D4] dark:ring-[rgba(249,168,212,0.3)]",
    dragTag: "bg-[#FDF0F7] text-[#9D174D]",
    stat: "border-pink-200/80 bg-pink-50/90 text-pink-700 dark:border-pink-400/25 dark:bg-pink-400/10 dark:text-pink-300",
  },
} as const;

/*
 * Barra de herramientas (Filtros · Sin asignar · Reporte · Historial): botones
 * «fantasma» de 40 px dentro de la barra de mando (`EquipoFilterBar`). En
 * celular se reparten el ancho y solo muestran el ícono; desde `sm` llevan
 * etiqueta. `eq-tool` da el micro-movimiento del ícono (ver equipo.css).
 */
export const toolbarGroup =
  "flex w-full items-center gap-1 border-t border-[#F0F0F2] pt-1.5 sm:w-auto sm:border-t-0 sm:pt-0 dark:border-[#1F2A3C]";

export function toolbarBtn(active: boolean, tone: "blue" | "amber" = "blue") {
  const on =
    tone === "amber"
      ? "bg-[#FFF5E1] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#F2C27A]"
      : "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/70 dark:text-[#C9D7FF]";
  return `eq-tool cot-press relative inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-semibold sm:w-auto [&_svg]:size-4 [&_svg]:shrink-0 ${
    active
      ? on
      : "text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-white/[0.06] dark:hover:text-white"
  } ${focusRing}`;
}

const badgeBase = "cot-flash inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold tabular-nums";

/** Contadores dentro de los botones de la barra. */
export const toolbarBadge = {
  blue: `${badgeBase} bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]`,
  amber: `${badgeBase} bg-[#D08A1E] text-white dark:bg-[#E6A23C] dark:text-[#111827]`,
  muted: `${badgeBase} bg-[#F1F1F4] text-[#52525B] dark:bg-white/[0.08] dark:text-[#D6DEEA]`,
} as const;

export const rowActionBtn = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/6 dark:hover:text-white [&_svg]:size-4 ${focusRing}`;

