/**
 * Estilos del módulo Pólizas de mantenimiento.
 *
 * Mismo lenguaje que Inventario / Gestión de usuarios: banda marina con acento
 * dorado, lienzo blanco con líneas de 1 px y azul eléctrico (#1B5CFF) como único
 * color de acción. En oscuro, la familia slate de la app
 * (#0f172a → #111827 → #1B2539). Estados: esmeralda (vigente), ámbar (próxima
 * visita) y rosa (vencida).
 *
 * Movimiento: las clases `cot-*` de modal-kit/motion.css (solo transform/opacity,
 * desactivadas con prefers-reduced-motion).
 */
import type { PolizaEstado, PolizaEstadoFiltro } from "../list/polizaListTypes";

export const polSansStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

/* ------------------------------- Página ------------------------------- */

export const polPageCanvasClass = "min-h-[calc(100dvh-5rem)] overflow-x-hidden";

export const polPageInnerClass =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-12 pt-6 text-sm sm:space-y-6 sm:px-5 sm:pt-7 md:px-6 lg:px-8 xl:px-10";

export const polBreadcrumbNavClass =
  "flex flex-wrap items-center gap-x-1.5 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]";

export const polBreadcrumbLinkClass =
  "rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]";

/* ------------------------------ Cabecera ------------------------------ */

export const polHeroClass =
  "cot-sheen relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8";

export const polHeroGlowClass =
  "pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl";

export const polHeroIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const polHeroEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const polHeroTitleClass =
  "mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

export const polHeroBodyClass = "mt-1.5 max-w-[60ch] text-[15px] leading-[22px] text-white/70";

/* ----------------------------- Superficies ---------------------------- */

export const polCardClass =
  "rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-12px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]";

/* ------------------------------- Botones ------------------------------ */

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.2)]";

export const polPrimaryBtnClass = `cot-press inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#1B5CFF] px-5 text-[14.5px] font-semibold tracking-[-0.1px] text-white hover:bg-[#1244D1] disabled:cursor-not-allowed disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] ${focusRing}`;

export const polSecondaryBtnClass = `cot-press inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[14px] font-medium text-[#09090B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048] ${focusRing}`;

export const polDangerBtnClass =
  "cot-press inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#C22B2B] px-5 text-[14px] font-semibold text-white hover:bg-[#A82424] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.25)]";

/** Botón de icono de 40 px para acciones de fila. */
export const polIconBtnClass = `cot-press inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] hover:bg-[#F1F5FF] hover:text-[#1244D1] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-[#C7D5FF] ${focusRing}`;

export const polIconBtnDangerClass = `cot-press inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:text-[#8EA0B8] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.2)]`;

/* -------------------------------- Campos ------------------------------- */

export const polInputClass =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] aria-[invalid=true]:border-[#E8A5A5] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const polSearchInputClass = `${polInputClass} pl-10 pr-10`;

export const polLabelClass = "mb-1.5 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]";

export const polErrorClass = "mt-1.5 text-[13px] font-medium text-[#C22B2B] dark:text-[#F87171]";

/* -------------------------------- Estados ------------------------------ */

type Tono = { dot: string; badge: string; soft: string; text: string; ring: string };

export const ESTADO_TONO: Record<PolizaEstado, Tono> = {
  vigente: {
    dot: "bg-[#0E9F6E] dark:bg-[#34D399]",
    badge: "bg-[rgba(14,159,110,0.10)] text-[#046C4E] dark:bg-[rgba(52,211,153,0.14)] dark:text-[#6EE7B7]",
    soft: "bg-[rgba(14,159,110,0.08)] dark:bg-[rgba(52,211,153,0.10)]",
    text: "text-[#046C4E] dark:text-[#6EE7B7]",
    ring: "ring-[#0E9F6E]/40",
  },
  proxima_visita: {
    dot: "bg-[#D97706] dark:bg-[#FBBF24]",
    badge: "bg-[rgba(217,119,6,0.12)] text-[#8A4B08] dark:bg-[rgba(251,191,36,0.14)] dark:text-[#FCD34D]",
    soft: "bg-[rgba(217,119,6,0.08)] dark:bg-[rgba(251,191,36,0.10)]",
    text: "text-[#8A4B08] dark:text-[#FCD34D]",
    ring: "ring-[#D97706]/40",
  },
  vencida: {
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    badge: "bg-[rgba(194,43,43,0.10)] text-[#9F1F1F] dark:bg-[rgba(248,113,113,0.14)] dark:text-[#FCA5A5]",
    soft: "bg-[rgba(194,43,43,0.07)] dark:bg-[rgba(248,113,113,0.10)]",
    text: "text-[#9F1F1F] dark:text-[#FCA5A5]",
    ring: "ring-[#C22B2B]/40",
  },
};

export function filtroTabClass(active: boolean, filtro: PolizaEstadoFiltro): string {
  const activeRing = filtro === "todas" ? "ring-[#1B5CFF]/45 dark:ring-[#4B7CFF]/50" : ESTADO_TONO[filtro].ring;
  return [
    "cot-press group relative flex min-h-[5.5rem] w-full flex-col justify-between rounded-[16px] border p-4 text-left",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.2)]",
    active
      ? `border-transparent bg-white ring-2 ${activeRing} shadow-[0_10px_28px_-16px_rgba(9,9,11,0.35)] dark:bg-[#151E32]`
      : "border-[#E7E7EA] bg-white hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]",
  ].join(" ");
}
