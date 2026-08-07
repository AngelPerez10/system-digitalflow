/** Clases de la consola de escaneo. Mantienen el lenguaje ERP (crema + coral). */
import type { InventarioFuente, ScanModo } from "./inventarioTypes";

/* --- Secciones de formulario: mismo patrón que Proyectos / Órdenes --- */

export const inventarioSectionClass = "space-y-3";

export const inventarioSectionHeadClass =
  "flex flex-col gap-2 border-b border-gray-200 pb-2 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between";

export const inventarioSectionCardClass =
  "space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40 sm:space-y-4 sm:p-4";

export const inventarioEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]";

export const inventarioSectionTitleClass =
  "text-sm font-semibold text-gray-800 dark:text-gray-100";

export const inventarioSectionHintClass =
  "mt-0.5 text-[12px] leading-snug text-gray-500 dark:text-gray-400";

export const inventarioSectionIconClass = "h-5 w-5";

export const inventarioEmptyPanelClass =
  "rounded-xl border border-dashed border-[#e2d9ca] bg-[#fffdf8]/80 px-4 py-8 text-center dark:border-[#334155] dark:bg-[#0f172a]/40";

export const inventarioFieldLabelClass =
  "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300 sm:mb-1.5";

export const consolaShellClass =
  "relative overflow-hidden rounded-3xl border border-[#e7ded0] bg-gradient-to-br from-[#fffdfa] via-[#fffdfa] to-[#fff6ed] shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] dark:border-[#273244] dark:from-[#111827] dark:via-[#111827] dark:to-[#0f172a]";

/** Rail de color que identifica el modo activo de un vistazo. */
export const consolaRailClass = (modo: ScanModo) =>
  `pointer-events-none absolute inset-x-0 top-0 h-1 ${
    modo === "entrada"
      ? "bg-gradient-to-r from-[#10b981] via-[#34d399] to-transparent"
      : "bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-transparent"
  }`;

export const modoToggleWrapClass =
  "inline-flex w-full gap-1 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a] sm:w-auto";

export const modoToggleBtnClass = (active: boolean, modo: ScanModo) => {
  const base =
    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-6";
  if (!active) {
    return `${base} text-[#57534e] hover:bg-[#fff4eb] focus-visible:ring-[#ff801f]/40 dark:text-[#aeb8c8] dark:hover:bg-[#1e293b]`;
  }
  return modo === "entrada"
    ? `${base} bg-[#047857] text-white shadow-sm focus-visible:ring-[#047857]/40`
    : `${base} bg-[#b45309] text-white shadow-sm focus-visible:ring-[#b45309]/40`;
};

/** Campo de escaneo: monoespaciado y grande para leer el código a distancia. */
export const scanInputClass =
  "h-16 w-full rounded-2xl border-2 border-[#e2d9ca] bg-[#fffdfa] pl-14 pr-4 font-mono text-lg tracking-[0.12em] text-[#1c1917] outline-none transition-all placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-[#a8a29e] focus:border-[#ff801f] focus:ring-4 focus:ring-[#ff801f]/15 disabled:cursor-not-allowed disabled:bg-[#f5f0e8] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc] dark:placeholder:text-[#64748b] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20 dark:disabled:bg-[#1e293b]";

export const statCardClass =
  "flex items-start gap-3 rounded-2xl border border-[#e7ded0] bg-[#fffdfa] px-3 py-3 dark:border-[#273244] dark:bg-[#111a2b]/80 sm:px-4";

export const statValueClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-xl font-medium leading-none text-[#1c1917] dark:text-[#f8fafc] sm:text-2xl";

export const statLabelClass =
  "mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]";

export type StatTono = "coral" | "emerald" | "amber" | "rose";

export const statIconWrapClass = (tono: StatTono) => {
  const base =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10";
  if (tono === "emerald") return `${base} bg-[#d1fae5] text-[#047857] dark:bg-[#047857]/25 dark:text-[#6ee7b7]`;
  if (tono === "amber") return `${base} bg-[#fef3c7] text-[#b45309] dark:bg-[#b45309]/25 dark:text-[#fcd34d]`;
  if (tono === "rose") return `${base} bg-[#fee2e2] text-[#b91c1c] dark:bg-[#7f1d1d]/30 dark:text-[#fca5a5]`;
  return `${base} bg-[#ff801f]/15 text-[#9a3412] dark:bg-[#fb923c]/15 dark:text-[#fdba74]`;
};

/** Tarjeta de ítem en móvil (sustituye la tabla debajo de md). */
export const inventarioMobileCardClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-3 shadow-[0_12px_32px_-24px_rgba(28,25,23,0.25)] dark:border-[#273244] dark:bg-[#111827]/80 sm:p-4";

export const inventarioMobileCardSelectedClass =
  "border-[#ff801f]/60 bg-[#fff7ed] dark:border-[#fb923c]/50 dark:bg-[#fb923c]/10";

export const fuenteBadgeClass = (fuente: InventarioFuente) => {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold";
  if (fuente === "syscom") {
    return `${base} bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a8a]/40 dark:text-[#93c5fd]`;
  }
  if (fuente === "tvc") {
    return `${base} bg-[#ede9fe] text-[#5b21b6] dark:bg-[#4c1d95]/40 dark:text-[#c4b5fd]`;
  }
  return `${base} bg-[#f5f0e8] text-[#78716c] dark:bg-[#1e293b] dark:text-[#94a3b8]`;
};

/** Chip de existencia: se marca en ámbar cuando el ítem se quedó en cero. */
export const existenciaBadgeClass = (cantidad: number) => {
  const base =
    "inline-flex min-w-[2.25rem] items-center justify-center rounded-lg border px-2 py-0.5 text-sm font-semibold tabular-nums";
  if (cantidad <= 0) {
    return `${base} border-[#fcd34d]/70 bg-[#fffbeb] text-[#b45309] dark:border-[#b45309]/40 dark:bg-[#b45309]/15 dark:text-[#fcd34d]`;
  }
  return `${base} border-[#e2d9ca] bg-[#fcfaf6] text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc]`;
};

export const movimientoChipClass = (tipo: ScanModo) =>
  `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
    tipo === "entrada"
      ? "bg-[#d1fae5] text-[#047857] dark:bg-[#047857]/25 dark:text-[#6ee7b7]"
      : "bg-[#fef3c7] text-[#b45309] dark:bg-[#b45309]/25 dark:text-[#fcd34d]"
  }`;

export const candidatoRowClass =
  "flex w-full items-start gap-3 rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-3 text-left transition-colors hover:border-[#ff801f]/50 hover:bg-[#fff8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 dark:border-[#334155] dark:bg-[#0f172a] dark:hover:border-[#fb923c]/50 dark:hover:bg-[#1e293b]";
