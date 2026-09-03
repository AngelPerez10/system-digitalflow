/** Tokens visuales del panel de instalaciones GPS del proyecto.
 *  Reexporta tokens de sección compartidos y define chips/acciones del listado. */

export {
  proyectoEmptyPanelClass,
  proyectoOrdenCardClass,
  proyectoOrdenEyebrowClass,
  proyectoOrdenHintClass,
  proyectoOrdenSectionClass,
  proyectoOrdenSectionHeadClass,
  proyectoOrdenTitleClass,
} from "../shared/proyectoPageStyles";

export const proyectoSectionIconClass = "h-5 w-5";

export const instalacionEmptyPanelClass =
  "rounded-xl border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-4 py-8 text-center dark:border-[#3A4661] dark:bg-[#0f172a]/40";

export const instalacionSectionHeadClass =
  "flex flex-col gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between";

export const instalacionEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

export const instalacionListCardClass =
  "flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#E7E7EA] bg-white p-3.5 transition-[border-color,box-shadow] hover:border-[#1B5CFF]/30 dark:border-[#273244] dark:bg-[#0f172a]/50 dark:hover:border-[#4B7CFF]/35";

export const instalacionListCardEditingClass =
  "ring-2 ring-[rgba(27,92,255,0.25)] border-[#1B5CFF]/45 dark:ring-[rgba(75,124,255,0.3)]";

export const instalacionCardClass = instalacionListCardClass;
export const instalacionCardActiveClass = instalacionListCardEditingClass;

export const instalacionFolioBadgeClass =
  "inline-flex items-center rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]";

export const instalacionTipoBadgeClass =
  "inline-flex items-center rounded-lg border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.10)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1244D1] dark:border-[#4B7CFF]/40 dark:bg-[rgba(75,124,255,0.15)] dark:text-[#4B7CFF]";

export const instalacionBadgeClass = instalacionTipoBadgeClass;

export const instalacionCountChipClass =
  "inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[rgba(27,92,255,0.12)] px-2 text-[11px] font-bold tabular-nums text-[#1244D1] dark:bg-[rgba(75,124,255,0.20)] dark:text-[#4B7CFF]";

export const instalacionGhostActionClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7E7EA] bg-white text-[#6E6E77] shadow-sm transition hover:border-[#1B5CFF]/40 hover:bg-[#F1F5FF] hover:text-[#1B5CFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#94a3b8] dark:hover:border-[#4B7CFF]/40 dark:hover:bg-[#1e293b]/50 dark:hover:text-[#4B7CFF]";

export const instalacionIconBtnClass = instalacionGhostActionClass;

export const instalacionDangerActionClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7E7EA] bg-white text-[#6E6E77] shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#94a3b8] dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300";
