/**
 * Tokens visuales de Contactos. Mismo lenguaje que el resto de la app
 * (marino #17235B + dorado #E6A23C, azul eléctrico #1B5CFF como único acento
 * de acción, líneas de 1 px; en oscuro, la familia slate del contenedor).
 */
import type { ClienteTipo } from "@/components/clientes/domain";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

/** Tono por tipo: punto + pastilla + avatar. Contraste de texto ≥ 4.5:1 en ambos temas. */
export const TIPO_TONE: Record<ClienteTipo | "NONE", { dot: string; badge: string; avatar: string }> = {
  EMPRESA: {
    dot: "bg-[#1B5CFF] dark:bg-[#7FA2FF]",
    badge: "bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]",
    avatar: "bg-[#EEF3FF] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]",
  },
  PERSONA_FISICA: {
    dot: "bg-[#04724D] dark:bg-[#4ADE80]",
    badge: "bg-[rgba(4,114,77,0.08)] text-[#04724D] dark:bg-[rgba(74,222,128,0.12)] dark:text-[#6EE7A0]",
    avatar: "bg-[#E9F8F0] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#6EE7A0]",
  },
  PROVEEDOR: {
    dot: "bg-[#B4801F] dark:bg-[#E6A23C]",
    badge: "bg-[rgba(230,162,60,0.14)] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#F0B860]",
    avatar: "bg-[#FFF6E6] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#F0B860]",
  },
  NONE: {
    dot: "bg-[#A1A1AA] dark:bg-[#64748B]",
    badge: "bg-[rgba(23,35,91,0.06)] text-[#52525B] dark:bg-white/[0.08] dark:text-[#B7C1D1]",
    avatar: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.08] dark:text-[#B7C1D1]",
  },
};

export const tipoTone = (tipo?: ClienteTipo) => TIPO_TONE[tipo ?? "NONE"] ?? TIPO_TONE.NONE;

export const panelClass =
  "overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04),0_8px_24px_-16px_rgba(9,9,11,0.16)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]";

export const mutedText = "text-[#6E6E77] dark:text-[#8EA0B8]";
export const strongText = "text-[#09090B] dark:text-[#F8FAFC]";
export const emptyDash = "text-[#A1A1AA] dark:text-[#64748B]";

export const linkClass = `rounded-[4px] font-medium text-[#1244D1] underline-offset-2 hover:underline dark:text-[#7FA2FF] ${focusRing}`;

export const iconBtnClass = `cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#6E6E77] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC] ${focusRing}`;

export const iconDangerBtnClass = `cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#6E6E77] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:text-[#8EA0B8] dark:hover:bg-[rgba(248,113,113,0.12)] dark:hover:text-[#F87171] ${focusRing}`;
