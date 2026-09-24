/**
 * Clases heredadas que usan otros módulos (Órdenes → cotizaciones admin) y la
 * vista PDF. El listado y el modal de Proyectos usan `proyectoTokens.ts`.
 */

/**
 * Título de página sobre tarjeta clara (p. ej. Vista PDF).
 * No reutilizar `erpHeroHeadingClass` de ordenServicioStyles: ese va en banda marina oscura (`text-white`).
 */
export const proyectoPdfPageHeroHeadingClass =
  "text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[32px] sm:tracking-[-1.1px]";

export const proyectoEmptyPanelClass =
  "rounded-xl border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-4 py-8 text-center dark:border-[#3A4661] dark:bg-[#1B2539]/60";

export const proyectoOrigenBadgeClass = (origen: "digitalflow" | "sicar") =>
  origen === "digitalflow"
    ? "inline-flex rounded-full border border-[#BFD3FF] bg-[#F1F5FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B5CFF] dark:border-[#4B7CFF]/40 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]"
    : "inline-flex rounded-full border border-sky-200/80 bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300";
