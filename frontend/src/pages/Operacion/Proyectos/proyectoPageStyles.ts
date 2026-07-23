/** Tokens visuales del módulo Proyectos (modal y badges). */

export const proyectoPickerModalClass =
  "w-full max-w-lg overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b]";

export const proyectoPickerModalHeaderClass =
  "relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-5 py-4 pr-14 dark:border-[#334155] dark:bg-none dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:px-6 sm:pr-16";

export const proyectoPickerModalBodyClass = "custom-scrollbar max-h-[min(70vh,28rem)] overflow-y-auto p-5 sm:p-6";

export const proyectoEmptyPanelClass =
  "rounded-xl border border-dashed border-[#e2d9ca] bg-[#fffdf8]/80 px-4 py-8 text-center dark:border-[#334155] dark:bg-[#0f172a]/40";

/** Grupo de equipos por cotización (estación de campo). */
export const proyectoEquipoGroupClass =
  "overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] shadow-[0_1px_0_rgba(28,25,23,0.04)] dark:border-[#334155] dark:bg-[#0f172a]/40 dark:shadow-none";

/** Fila de equipo: riel de estado + contenido. */
export const proyectoEquipoCardClass =
  "relative flex overflow-hidden bg-[#fffdfa] transition-colors hover:bg-[#fffaf3]/70 dark:bg-transparent dark:hover:bg-[#111a2b]/55";

export const proyectoEquipoAccentClass = (estado: string) => {
  const base = "w-1 shrink-0 self-stretch";
  switch (estado) {
    case "instalado":
      return `${base} bg-sky-500`;
    case "no_instalado":
      return `${base} bg-rose-500`;
    case "entregado":
      return `${base} bg-emerald-500`;
    default:
      return `${base} bg-[#d6d3d1] dark:bg-[#475569]`;
  }
};

export const proyectoEquipoMetaClass =
  "mt-1 text-[11px] leading-snug text-[#78716c] dark:text-[#8ea0b8]";

export const proyectoEquipoProgressBarClass =
  "h-1.5 w-full overflow-hidden rounded-full bg-[#efe9de] dark:bg-[#1e293b]";

export const proyectoEquipoSummaryChipClass = (tone: "neutral" | "entrega" | "instalacion") => {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums";
  switch (tone) {
    case "entrega":
      return `${base} border-[#ff801f]/30 bg-[#fff4eb] text-[#9a3412] dark:border-[#ff801f]/40 dark:bg-[#ff801f]/15 dark:text-[#fdba74]`;
    case "instalacion":
      return `${base} border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300`;
    default:
      return `${base} border-[#e2d9ca] bg-white text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]`;
  }
};

export const proyectoEquipoDeliveredClass = (delivered: boolean) =>
  [
    "inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-[#ff801f]/30",
    delivered
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-600/50 dark:bg-emerald-950/35"
      : "border-[#e2d9ca] bg-white dark:border-[#334155] dark:bg-[#111a2b]",
  ].join(" ");

export const proyectoEquipoInstallBtnClass = (
  active: boolean,
  value: "instalado" | "no_instalado"
) => {
  const base =
    "min-h-9 min-w-[6.5rem] flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 disabled:opacity-50 sm:flex-none";
  if (!active) {
    return `${base} text-[#57534e] hover:bg-white dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]/60`;
  }
  return value === "instalado"
    ? `${base} bg-sky-100 text-sky-900 shadow-sm dark:bg-sky-950/55 dark:text-sky-200`
    : `${base} bg-rose-100 text-rose-900 shadow-sm dark:bg-rose-950/45 dark:text-rose-200`;
};
export const proyectoOrigenBadgeClass = (origen: "digitalflow" | "sicar") =>
  origen === "digitalflow"
    ? "inline-flex rounded-full border border-[#ff801f]/25 bg-[#ff801f]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9a3412] dark:text-[#fdba74]"
    : "inline-flex rounded-full border border-sky-200/80 bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300";

export const proyectoFieldLabelClass =
  "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300 sm:mb-1.5";

export const proyectoCotizacionOptionClass =
  "w-full rounded-xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-3 text-left transition-colors hover:border-[#ff801f]/40 hover:bg-[#fff8f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 dark:border-[#334155] dark:bg-[#111a2b] dark:hover:bg-[#1e293b]/60";

export const proyectoSectionHintClass =
  "mt-0.5 text-[12px] leading-snug text-gray-500 dark:text-gray-400";

/** Secciones tipo Órdenes / Cotización */
export const proyectoOrdenSectionClass = "space-y-3";

export const proyectoOrdenSectionHeadClass =
  "flex flex-wrap items-end justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-700";

export const proyectoOrdenEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]";

export const proyectoOrdenTitleClass =
  "text-sm font-semibold text-gray-800 dark:text-gray-100";

export const proyectoOrdenHintClass =
  "mt-0.5 text-[12px] leading-snug text-gray-500 dark:text-gray-400";

export const proyectoOrdenCardClass =
  "space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40";

export const proyectoStepBadgeClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/15 text-[11px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]";

/** Chip de status del proyecto (radiogroup). */
export const proyectoStatusChipClass = (active: boolean, tone: "proceso" | "pausado" | "cerrado") => {
  const base =
    "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/30 sm:flex-none sm:min-w-[7.5rem]";
  if (!active) {
    return `${base} border-[#e2d9ca] bg-white text-[#57534e] hover:border-[#ff801f]/35 hover:bg-[#fff8f1] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]/50`;
  }
  switch (tone) {
    case "pausado":
      return `${base} border-amber-300 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200`;
    case "cerrado":
      return `${base} border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200`;
    default:
      return `${base} border-[#ff801f] bg-[#fff4eb] text-[#9a3412] shadow-sm dark:border-[#ff801f]/50 dark:bg-[#ff801f]/15 dark:text-[#fdba74]`;
  }
};

export const proyectoGhostIconBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-[#a8a29e] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:text-[#64748b] dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300";

export const proyectoAddDayBtnClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#e2d9ca] bg-white px-3 text-xs font-semibold text-[#44403c] shadow-sm transition hover:border-[#ff801f]/40 hover:bg-[#fff8f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:border-[#ff801f]/40 dark:hover:bg-[#1e293b]/50";

/** Bitácora: tarjeta de nota por jornada */
export const proyectoNotaCardClass =
  "relative min-w-0 flex-1 overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] shadow-sm transition-[border-color,box-shadow] hover:border-[#ff801f]/30 focus-within:border-[#ff801f]/45 focus-within:shadow-[0_0_0_3px_rgba(255,128,31,0.12)] dark:border-[#334155] dark:bg-[#0f172a]/55 dark:hover:border-[#ff801f]/35 dark:focus-within:border-[#ff801f]/40";

export const proyectoNotaDayBadgeClass =
  "relative z-[1] mt-1 inline-flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-xl border border-[#ff801f]/40 bg-gradient-to-b from-[#fff4eb] to-[#ffedd5] text-[11px] font-bold tabular-nums leading-none text-[#9a3412] shadow-sm dark:border-[#ff801f]/45 dark:from-[#ff801f]/20 dark:to-[#ff801f]/10 dark:text-[#fdba74]";

export const proyectoNotaTextareaClass =
  "min-h-[5rem] w-full resize-y rounded-lg border border-transparent bg-[#fcfaf6] px-3 py-2.5 text-sm leading-relaxed text-[#1c1917] placeholder:text-[#a8a29e] transition focus:border-[#ff801f]/35 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 dark:bg-[#111827]/80 dark:text-[#f8fafc] dark:placeholder:text-[#64748b] dark:focus:bg-[#0f172a]";

export const proyectoNotaMetaClass =
  "text-[11px] font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]";

/** Slider de avance del proyecto (accent Intrax). */
export const proyectoAvanceRangeClass =
  "h-2 w-full cursor-pointer appearance-none rounded-full outline-none transition " +
  "bg-[linear-gradient(to_right,#ff801f_0%,#ff801f_var(--proyecto-avance,#0%),#f1e8db_var(--proyecto-avance,#0%),#f1e8db_100%)] " +
  "dark:bg-[linear-gradient(to_right,#ff801f_0%,#ff801f_var(--proyecto-avance,#0%),#1e293b_var(--proyecto-avance,#0%),#1e293b_100%)] " +
  "accent-[#ff801f] focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdfa] dark:focus-visible:ring-offset-[#0f172a] " +
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#ff801f] [&::-webkit-slider-thumb]:shadow-sm dark:[&::-webkit-slider-thumb]:border-[#0f172a] " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#ff801f]";

export const proyectoAvanceValueClass =
  "min-w-[3.25rem] text-right text-2xl font-semibold tabular-nums tracking-tight text-[#9a3412] dark:text-[#fdba74]";

export function formatProyectoFecha(fecha: string): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}
