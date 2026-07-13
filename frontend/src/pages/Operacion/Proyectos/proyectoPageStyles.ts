/** Tokens visuales del módulo Proyectos (modal y badges). */

export const proyectoPickerModalClass =
  "w-full max-w-lg overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b]";

export const proyectoPickerModalHeaderClass =
  "relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-5 py-4 pr-14 dark:border-[#334155] dark:bg-none dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:px-6 sm:pr-16";

export const proyectoPickerModalBodyClass = "custom-scrollbar max-h-[min(70vh,28rem)] overflow-y-auto p-5 sm:p-6";

export const proyectoEmptyPanelClass =
  "rounded-xl border border-dashed border-[#e2d9ca] bg-[#fffdf8]/80 px-4 py-8 text-center dark:border-[#334155] dark:bg-[#0f172a]/40";

export const proyectoEquipoCardClass =
  "rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-3.5 shadow-sm dark:border-[#334155] dark:bg-[#0f172a]/50 sm:p-4";

export const proyectoOrigenBadgeClass = (origen: "digitalflow" | "sicar") =>
  origen === "digitalflow"
    ? "inline-flex rounded-full border border-[#ff801f]/25 bg-[#ff801f]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9a3412] dark:text-[#fdba74]"
    : "inline-flex rounded-full border border-sky-200/80 bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300";

export const proyectoFieldLabelClass =
  "mb-1.5 block text-xs font-medium leading-[1.6] tracking-[0.12px] text-[#57534e] dark:text-[#cbd5e1] sm:text-sm";

export const proyectoCotizacionOptionClass =
  "w-full rounded-xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-3 text-left transition-colors hover:border-[#ff801f]/40 hover:bg-[#fff8f1] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 dark:border-[#334155] dark:bg-[#111a2b] dark:hover:bg-[#1e293b]/60";

export const proyectoSectionHintClass =
  "mt-0.5 text-[12px] leading-snug text-[#78716c] dark:text-[#8ea0b8]";

export const proyectoStepBadgeClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/15 text-[11px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]";

export function formatProyectoFecha(fecha: string): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}
