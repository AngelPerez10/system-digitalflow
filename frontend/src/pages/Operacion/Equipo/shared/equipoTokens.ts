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

export const rowActionBtn = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/6 dark:hover:text-white [&_svg]:size-4 ${focusRing}`;

