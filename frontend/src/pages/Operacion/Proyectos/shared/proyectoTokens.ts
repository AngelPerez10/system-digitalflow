/**
 * Tokens visuales de Proyectos (listado + modal).
 *
 * Mismo sistema que Cotizaciones, Órdenes, Inventario y Productos: marino +
 * dorado sobre lienzo blanco, azul eléctrico (#1B5CFF) como único acento de
 * acción, líneas de 1 px y tipografía Geist. En oscuro, familia slate
 * (lienzo #0f172a → panel #111827 → tarjeta hundida #151E32).
 *
 * Movimiento: clases `cot-*` de `modal-kit/motion.css` (solo transform/opacity,
 * desactivadas con `prefers-reduced-motion`).
 */
import "@/components/ui/modal-kit/motion.css";
import type { ProyectoEstado } from "./proyectoTypes";

export const sansStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;
export const fontSans = "[font-family:Geist,Outfit,system-ui,sans-serif]";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

/* --------------------------------------------------------------------------
   Superficies
   -------------------------------------------------------------------------- */

export const cardShell =
  "rounded-[20px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]";

export const cardShellRaised = `${cardShell} shadow-[0_6px_20px_-12px_rgba(9,9,11,0.16)] dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]`;

/** Superficie hundida dentro de una tarjeta (listas, pistas). */
export const sunken =
  "rounded-[14px] border border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60";

export const emptyPanel =
  "rounded-[16px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-5 py-10 text-center dark:border-[#3A4661] dark:bg-[#0F172A]/50";

export const divider = "border-[#F0F0F2] dark:border-[#1F2A3C]";

/* --------------------------------------------------------------------------
   Tipografía
   -------------------------------------------------------------------------- */

export const eyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]";

export const eyebrowAccent =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#7EA0FF]";

export const titleMd = "text-[15px] font-semibold leading-snug tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]";

export const bodyMuted = "text-[13px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]";

export const fieldLabel =
  "mb-1.5 block text-[13px] font-medium tracking-[-0.05px] text-[#3F3F46] dark:text-[#D6DEEA]";

export const fieldHint = "mt-1.5 text-[12px] leading-snug text-[#71717A] dark:text-[#8EA0B8]";

export const fieldError = "mt-1.5 text-[12px] font-medium text-[#C22B2B] dark:text-[#F87171]";

export const requiredMark = "ml-0.5 text-[#C22B2B] dark:text-[#F87171]";

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

export const input =
  "block h-11 w-full rounded-[10px] border border-[#E4E4E7] bg-white px-3.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.14)] disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:text-[#71717A] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.24)] dark:disabled:bg-[#111827] dark:disabled:text-[#8EA0B8]";

export const inputInvalid =
  "border-[#E8A5A5]! focus:border-[#C22B2B]! focus:ring-[rgba(194,43,43,0.14)]! dark:border-[#7F1D1D]!";

export const textarea = `${input} h-auto min-h-[96px] resize-y py-2.5 leading-relaxed`;

export const select = `${input} cursor-pointer pr-9`;

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

const btnBase = `cot-press inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[14px] font-semibold tracking-[-0.1px] disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0 ${focusRing}`;

export const btn = {
  primary: `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] text-white hover:border-[#1244D1] hover:bg-[#1244D1] disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0]`,
  secondary: `${btnBase} border border-[#E4E4E7] bg-white text-[#18181B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#1B2539]`,
  ghost: `${btnBase} border border-transparent bg-transparent text-[#1B5CFF] hover:bg-[rgba(27,92,255,0.07)] disabled:opacity-50 dark:text-[#7EA0FF] dark:hover:bg-[rgba(75,124,255,0.12)]`,
  dangerSoft: `${btnBase} border border-[#F6CFCF] bg-[#FEF2F2] text-[#C22B2B] hover:bg-[#FDE4E4] disabled:opacity-60 dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171] dark:hover:bg-[#4C1A1E]`,
  /** Sobre la banda marina. */
  onNavy: `${btnBase} border border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50`,
} as const;

export const btnSm = "min-h-9! px-3! text-[13px]!";

export const iconBtn = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[#E7E7EA] bg-white text-[#52525B] hover:border-[#D3D3D8] hover:text-[#09090B] disabled:opacity-40 dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:hover:text-[#F8FAFC] [&_svg]:size-4 ${focusRing}`;

export const iconBtnDanger = `${iconBtn} hover:border-[#F6CFCF]! hover:bg-[#FEF2F2]! hover:text-[#C22B2B]! dark:hover:border-[#7F1D1D]! dark:hover:bg-[#3F1518]! dark:hover:text-[#F87171]!`;

/* --------------------------------------------------------------------------
   Estados del proyecto
   -------------------------------------------------------------------------- */

export type ProyectoTone = {
  label: string;
  /** Punto sólido. */
  dot: string;
  /** Píldora (fondo tenue + texto). */
  pill: string;
  /** Barra de progreso / riel. */
  bar: string;
  /** Texto de acento. */
  text: string;
  /** Segmento activo del filtro. */
  segment: string;
};

export const ESTADO_TONE: Record<ProyectoEstado, ProyectoTone> = {
  en_proceso: {
    label: "En proceso",
    dot: "bg-[#1B5CFF] dark:bg-[#7EA0FF]",
    pill: "bg-[#EEF3FF] text-[#1244D1] ring-[#D7E3FF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF] dark:ring-[#2C3F7A]",
    bar: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    text: "text-[#1244D1] dark:text-[#9BB6FF]",
    segment: "bg-white text-[#1244D1] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#C9D7FF] dark:ring-[#2C3F7A]",
  },
  pausado: {
    label: "Pausado",
    dot: "bg-[#D08A1E] dark:bg-[#E6A23C]",
    pill: "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#E6A23C] dark:ring-[rgba(230,162,60,0.3)]",
    bar: "bg-[#D08A1E] dark:bg-[#E6A23C]",
    text: "text-[#8A5D0F] dark:text-[#E6A23C]",
    segment: "bg-white text-[#8A5D0F] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.35)]",
  },
  cerrado: {
    label: "Cerrado",
    dot: "bg-[#0E8A5F] dark:bg-[#34D399]",
    pill: "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#4ADE80] dark:ring-[#1E5A42]",
    bar: "bg-[#0E8A5F] dark:bg-[#34D399]",
    text: "text-[#04724D] dark:text-[#4ADE80]",
    segment: "bg-white text-[#04724D] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]",
  },
  cancelado: {
    label: "Cancelado",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    pill: "bg-[#FEF2F2] text-[#B42323] ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]",
    bar: "bg-[#C22B2B] dark:bg-[#F87171]",
    text: "text-[#B42323] dark:text-[#F87171]",
    segment: "bg-white text-[#B42323] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#FCA5A5] dark:ring-[#7F1D1D]",
  },
};

export function toneForEstado(estado: string | null | undefined): ProyectoTone {
  const key = String(estado || "").trim().toLowerCase() as ProyectoEstado;
  return ESTADO_TONE[key] ?? ESTADO_TONE.en_proceso;
}

/** Etiqueta del origen de una cotización. */
export const origenChip = {
  digitalflow:
    "inline-flex h-5 shrink-0 items-center rounded-full bg-[rgba(27,92,255,0.08)] px-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]",
  sicar:
    "inline-flex h-5 shrink-0 items-center rounded-full bg-[rgba(23,35,91,0.08)] px-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#17235B] dark:bg-white/[0.08] dark:text-[#D6DEEA]",
} as const;

/** Chip neutro (conteos, metadatos). */
export const metaChip =
  "inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[#F4F4F5] px-2.5 text-[12px] font-medium text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]";

export const folioText = "font-mono text-[12px] font-semibold tracking-tight text-[#1244D1] dark:text-[#9BB6FF]";
