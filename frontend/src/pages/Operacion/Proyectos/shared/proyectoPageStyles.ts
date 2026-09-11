/** Tokens visuales del módulo Proyectos (modal y badges).
 *  Mismo lenguaje que Órdenes / Cotizaciones / Pólizas: azul eléctrico #1B5CFF. */

export const proyectoOrdenCardClass =
  "space-y-3 rounded-xl border border-[#E7E7EA] bg-white p-3 shadow-sm dark:border-[#273244] dark:bg-[#111827]/60 sm:space-y-4 sm:p-4";

export const proyectoOrdenSectionHeadClass =
  "flex flex-col gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between";

export const proyectoPickerModalClass =
  "w-full max-w-lg overflow-hidden rounded-t-2xl border border-[#E7E7EA] bg-white p-0 pb-[env(safe-area-inset-bottom)] shadow-[0_24px_48px_-12px_rgba(9,9,11,0.18)] dark:border-[#273244] dark:bg-[#111827] sm:rounded-2xl sm:pb-0";

export const proyectoPickerModalBodyClass =
  "custom-scrollbar max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain touch-auto p-4 sm:max-h-[min(70vh,28rem)] sm:p-6";

export const proyectoPickerModalHeaderClass =
  "relative shrink-0 border-b border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3.5 pr-14 dark:border-[#273244] dark:bg-[#111827] sm:px-6 sm:py-4 sm:pr-16";

export const proyectoEmptyPanelClass =
  "rounded-xl border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-4 py-8 text-center dark:border-[#3A4661] dark:bg-[#1B2539]/60";

/** Grupo de equipos por cotización (estación de campo). */
export const proyectoEquipoGroupClass =
  "overflow-hidden rounded-2xl border border-[#E7E7EA] bg-white shadow-sm dark:border-[#273244] dark:bg-[#0f172a]/40 dark:shadow-none";

/** Fila de equipo: riel de estado + contenido. */
export const proyectoEquipoCardClass =
  "relative flex overflow-hidden bg-white transition-colors hover:bg-[#FAFAFA] dark:bg-transparent dark:hover:bg-[#111a2b]/55";

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
      return `${base} bg-[#D3D3D8] dark:bg-[#475569]`;
  }
};

export const proyectoEquipoMetaClass =
  "mt-1 text-[11px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]";

export const proyectoEquipoProgressBarClass =
  "h-1.5 w-full overflow-hidden rounded-full bg-[#E7E7EA] dark:bg-[#1e293b]";

export const proyectoEquipoSummaryChipClass = (tone: "neutral" | "entrega" | "instalacion") => {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums";
  switch (tone) {
    case "entrega":
      return `${base} border-[#BFD3FF] bg-[#F1F5FF] text-[#1244D1] dark:border-[#4B7CFF]/40 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]`;
    case "instalacion":
      return `${base} border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300`;
    default:
      return `${base} border-[#E7E7EA] bg-white text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1]`;
  }
};

export const proyectoEquipoDeliveredClass = (delivered: boolean) =>
  [
    "inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-[rgba(27,92,255,0.3)]",
    delivered
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-600/50 dark:bg-emerald-950/35"
      : "border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]",
  ].join(" ");

export const proyectoEquipoInstallBtnClass = (
  active: boolean,
  value: "instalado" | "no_instalado"
) => {
  const base =
    "min-h-9 min-w-[6.5rem] flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.35)] disabled:opacity-50 sm:flex-none";
  if (!active) {
    return `${base} text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-[#1e293b]/60`;
  }
  return value === "instalado"
    ? `${base} bg-sky-100 text-sky-900 shadow-sm dark:bg-sky-950/55 dark:text-sky-200`
    : `${base} bg-rose-100 text-rose-900 shadow-sm dark:bg-rose-950/45 dark:text-rose-200`;
};

export const proyectoOrigenBadgeClass = (origen: "digitalflow" | "sicar") =>
  origen === "digitalflow"
    ? "inline-flex rounded-full border border-[#BFD3FF] bg-[#F1F5FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B5CFF] dark:border-[#4B7CFF]/40 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]"
    : "inline-flex rounded-full border border-sky-200/80 bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300";

export const proyectoFieldLabelClass =
  "mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1] sm:mb-1.5";

export const proyectoCotizacionOptionClass =
  "w-full rounded-xl border border-[#E7E7EA] bg-white px-4 py-3 text-left transition-colors hover:border-[#1B5CFF]/40 hover:bg-[#F1F5FF]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.25)] dark:border-[#273244] dark:bg-[#111827] dark:hover:bg-[#243048]/60";

export const proyectoSectionHintClass =
  "mt-0.5 text-[12px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]";

/** Secciones tipo Órdenes / Cotización */
export const proyectoOrdenSectionClass = "space-y-3";

export const proyectoOrdenEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

export const proyectoOrdenTitleClass =
  "text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]";

export const proyectoOrdenHintClass =
  "mt-0.5 text-[12px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]";

export const proyectoStepBadgeClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(27,92,255,0.12)] text-[11px] font-bold tabular-nums text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.18)] dark:text-[#4B7CFF]";

/** Chip de status del proyecto (radiogroup). */
export const proyectoStatusChipClass = (
  active: boolean,
  tone: "proceso" | "pausado" | "cerrado" | "cancelado",
) => {
  const base =
    "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] sm:flex-none sm:min-w-[7.5rem]";
  if (!active) {
    return `${base} border-[#E7E7EA] bg-white text-[#52525B] hover:border-[#1B5CFF]/35 hover:bg-[#F1F5FF]/50 dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#B7C1D1] dark:hover:bg-[#243048]/50`;
  }
  switch (tone) {
    case "pausado":
      return `${base} border-amber-300 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200`;
    case "cerrado":
      return `${base} border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200`;
    case "cancelado":
      return `${base} border-rose-300 bg-rose-50 text-rose-900 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200`;
    default:
      return `${base} border-[#1B5CFF] bg-[#F1F5FF] text-[#1244D1] shadow-sm dark:border-[#4B7CFF]/50 dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]`;
  }
};

export const proyectoGhostIconBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-[#A1A1AA] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:text-[#64748b] dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300";

export const proyectoAddDayBtnClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#E7E7EA] bg-white px-3 text-xs font-semibold text-[#52525B] shadow-sm transition hover:border-[#1B5CFF]/40 hover:bg-[#F1F5FF]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.25)] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#F8FAFC] dark:hover:border-[#4B7CFF]/40 dark:hover:bg-[#243048]/50";

/** Acciones de cotizaciones: zona de alta + enlace de limpieza (sin barra de botones). */
export const proyectoCotizacionMetaRowClass =
  "flex flex-wrap items-center justify-between gap-x-3 gap-y-1";

export const proyectoCotizacionClearLinkClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:text-rose-300 dark:hover:bg-rose-950/40";

export const proyectoCotizacionAddZoneClass =
  "group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#D3D3D8] bg-gradient-to-b from-white to-[#FAFAFA] px-4 py-3.5 text-sm font-semibold text-[#52525B] transition hover:border-[#1B5CFF] hover:from-[#F1F5FF] hover:to-[#E8F0FF] hover:text-[#1244D1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.35)] active:scale-[0.99] dark:border-[#3A4661] dark:from-[#0f172a]/50 dark:to-[#111827]/40 dark:text-[#F8FAFC] dark:hover:border-[#4B7CFF] dark:hover:from-[#1e293b]/50 dark:hover:to-[#1e293b]/30 dark:hover:text-[#4B7CFF]";

export const proyectoCotizacionAddZoneIconClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(27,92,255,0.12)] text-[#1B5CFF] transition group-hover:bg-[#1B5CFF] group-hover:text-white dark:bg-[rgba(75,124,255,0.18)] dark:text-[#4B7CFF] dark:group-hover:bg-[#4B7CFF] dark:group-hover:text-white";

/** Bitácora: tarjeta de nota por jornada */
export const proyectoNotaCardClass =
  "relative min-w-0 flex-1 overflow-hidden rounded-xl border border-[#E7E7EA] bg-white shadow-sm transition-[border-color,box-shadow] hover:border-[#1B5CFF]/30 focus-within:border-[#1B5CFF]/45 focus-within:shadow-[0_0_0_3px_rgba(27,92,255,0.12)] dark:border-[#273244] dark:bg-[#0f172a]/55 dark:hover:border-[#4B7CFF]/35 dark:focus-within:border-[#4B7CFF]/40";

export const proyectoNotaDayBadgeClass =
  "relative z-[1] mt-1 inline-flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-xl border border-[#BFD3FF] bg-gradient-to-b from-[#F1F5FF] to-[#E8F0FF] text-[11px] font-bold tabular-nums leading-none text-[#1B5CFF] shadow-sm dark:border-[#4B7CFF]/45 dark:from-[rgba(75,124,255,0.2)] dark:to-[rgba(75,124,255,0.1)] dark:text-[#4B7CFF]";

export const proyectoNotaTextareaClass =
  "min-h-[5rem] w-full resize-y rounded-lg border border-transparent bg-[#FAFAFA] px-3 py-2.5 text-sm leading-relaxed text-[#09090B] placeholder:text-[#A1A1AA] transition focus:border-[#1B5CFF]/35 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.25)] dark:bg-[#111827]/80 dark:text-[#F8FAFC] dark:placeholder:text-[#64748b] dark:focus:bg-[#0f172a]";

export const proyectoNotaMetaClass =
  "text-[11px] font-medium tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]";

/** Slider de avance del proyecto (accent azul eléctrico). */
export const proyectoAvanceRangeClass =
  "h-2 w-full cursor-pointer appearance-none rounded-full outline-none transition " +
  "bg-[linear-gradient(to_right,#1B5CFF_0%,#1B5CFF_var(--proyecto-avance,#0%),#E7E7EA_var(--proyecto-avance,#0%),#E7E7EA_100%)] " +
  "dark:bg-[linear-gradient(to_right,#4B7CFF_0%,#4B7CFF_var(--proyecto-avance,#0%),#1e293b_var(--proyecto-avance,#0%),#1e293b_100%)] " +
  "accent-[#1B5CFF] focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.35)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0f172a] " +
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#1B5CFF] [&::-webkit-slider-thumb]:shadow-sm dark:[&::-webkit-slider-thumb]:border-[#0f172a] dark:[&::-webkit-slider-thumb]:bg-[#4B7CFF] " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#1B5CFF]";

export const proyectoAvanceValueClass =
  "min-w-[3.25rem] text-right text-2xl font-semibold tabular-nums tracking-tight text-[#1B5CFF] dark:text-[#4B7CFF]";

export function formatProyectoFecha(fecha: string): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}
