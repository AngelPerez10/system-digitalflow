/** Tonos para piezas React (filtros, agenda, pendientes, detalle). Los del calendario viven en calendar.css. */
import type { ItemKind, ItemStatus } from "./calendarModel";

export const sansStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;
export const fontSans = "[font-family:Geist,Outfit,system-ui,sans-serif]";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

export const STATUS_TONE: Record<ItemStatus, { dot: string; pill: string; chipOn: string }> = {
  pendiente: {
    dot: "bg-[#1B5CFF] dark:bg-[#7EA0FF]",
    pill: "bg-[#EEF3FF] text-[#1244D1] ring-[#D7E3FF] dark:bg-[#1B2A63]/70 dark:text-[#C9D7FF] dark:ring-[#2C3F7A]",
    chipOn: "border-[#BFD3FF] bg-[#F5F8FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]",
  },
  pausado: {
    dot: "bg-[#D08A1E] dark:bg-[#E6A23C]",
    pill: "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]",
    chipOn: "border-[#F0D7A3] bg-[#FFF8EB] text-[#8A5D0F] dark:border-[rgba(230,162,60,0.35)] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A]",
  },
  resuelto: {
    dot: "bg-[#0E8A5F] dark:bg-[#34D399]",
    pill: "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]",
    chipOn: "border-[#BFE6D4] bg-[#E9F8F0] text-[#04724D] dark:border-[#1E5A42] dark:bg-[#0F2A1C] dark:text-[#86EFAC]",
  },
  cancelada: {
    dot: "bg-[#A1A1AA] dark:bg-[#64748B]",
    pill: "bg-[#F4F4F5] text-[#52525B] ring-[#E4E4E7] dark:bg-white/[0.06] dark:text-[#B7C1D1] dark:ring-[#273244]",
    chipOn: "border-[#D4D4D8] bg-[#F4F4F5] text-[#3F3F46] dark:border-[#3A4661] dark:bg-white/[0.06] dark:text-[#D6DEEA]",
  },
};

/** Órdenes en azul marino, proyectos en dorado: se distinguen sin leer. */
export const KIND_TONE: Record<ItemKind, { tile: string; text: string; chipOn: string }> = {
  orden: {
    tile: "bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#D6DEEA]",
    text: "text-[#17235B] dark:text-[#D6DEEA]",
    chipOn: "border-[#C7CCE0] bg-[rgba(23,35,91,0.06)] text-[#17235B] dark:border-[#3A4661] dark:bg-white/[0.06] dark:text-[#D6DEEA]",
  },
  proyecto: {
    tile: "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]",
    text: "text-[#8A5D0F] dark:text-[#E6A23C]",
    chipOn: "border-[#F0D7A3] bg-[#FFF8EB] text-[#8A5D0F] dark:border-[rgba(230,162,60,0.35)] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A]",
  },
};
