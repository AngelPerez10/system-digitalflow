/** Tokens visuales compartidos del módulo Órdenes de trabajo (ERP). */
export {
  erpCardShellClass,
  erpCardShellMutedClass,
  erpHeroHeadingClass,
  erpInputLikeClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSelectFieldClass,
  erpSubheadingClass,
  erpTableHeaderClass,
  erpTableWrapClass,
  erpTextareaLikeClass,
} from "@/layout/erpPageStyles";

import { erpCardShellClass, erpInputLikeClass, erpSearchInputClass } from "@/layout/erpPageStyles";

/** Alias para páginas de listado (misma shell que Cotizaciones). */
export const pageCardShellClass = erpCardShellClass;
export const pageSearchInputClass = erpSearchInputClass;

export const sectionLabelOrangeClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]";

export const claudeBodyClass = "text-sm leading-relaxed text-[#57534e] dark:text-[#b7c1d1]";

export const outlineCoralBtnClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-[#fed7aa] bg-white px-4 py-3 text-xs font-semibold text-[#9a3412] transition-colors hover:bg-[#fff3e8] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#fb923c]/40 dark:bg-transparent dark:text-[#fdba74] dark:hover:bg-[#fb923c]/10 sm:min-h-0";

export const erpStatCardClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-4";

export const erpBreadcrumbNavClass =
  "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]";

export const erpBreadcrumbLinkClass =
  "rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white";

export const erpMonthNavBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9ca] bg-[#fffdfa] text-[#57534e] transition-colors hover:bg-[#fffdf8] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]";

export const erpHeroIconWrapClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11";

export const erpHeroBlurClass =
  "pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6";

export const erpHeroGradientClass =
  "mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent";

export const erpTableRowHoverClass =
  "transition-colors hover:bg-[#fff8f1]/80 dark:hover:bg-[#1e293b]/40";

export const erpFormInputClass = erpInputLikeClass;

export const erpFormPanelClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5";

export const erpFilterBtnClass =
  "flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2 text-xs font-semibold text-[#57534e] transition-colors hover:bg-[#fffdf8] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b] sm:w-auto sm:min-w-[86px]";

export const erpFilterPopoverClass =
  "absolute right-0 z-[110] mt-2 w-72 max-h-[min(80vh,24rem)] overflow-auto rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-xl ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111a2b] dark:ring-white/10";

export const erpRowActionBarClass =
  "inline-flex items-center gap-1 rounded-md bg-[#f5f0e8] px-1.5 py-1 dark:bg-white/10";

export const erpRowActionBtnClass =
  "inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2d9ca] bg-white transition hover:border-[#ffa057] hover:text-[#ff801f] dark:border-white/10 dark:bg-[#111a2b] dark:hover:border-[#ff801f]";

export const erpMobileCardClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-3 shadow-[0_12px_32px_-24px_rgba(28,25,23,0.25)] dark:border-[#273244] dark:bg-[#111827]/80 sm:p-4";

export const viewTabClass = (active: boolean) =>
  active
    ? "rounded-lg bg-[#ff801f] px-3 py-1.5 text-xs font-semibold text-black shadow-sm"
    : "rounded-lg px-3 py-1.5 text-xs font-semibold text-[#57534e] transition-colors hover:bg-[#fffdf8] dark:text-[#aeb8c8] dark:hover:bg-white/[0.06]";

export const erpHeroHeaderClass = (cardShell: string) =>
  `relative flex w-full flex-col gap-4 ${cardShell} p-4 sm:p-6`;

/** Modal crear/editar orden */
export const erpModalShellClass =
  "flex max-h-[min(92vh,92vh)] w-[min(96vw,56rem)] flex-col overflow-hidden rounded-2xl border border-[#e7ded0] bg-white p-0 shadow-[0_24px_48px_-12px_rgba(28,25,23,0.18)] dark:border-[#334155] dark:bg-[#111a2b] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:max-w-4xl";

export const erpModalHeaderClass =
  "relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-[#111827] sm:pr-16";

export const erpModalHeaderAccentClass = "pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]";

export const erpModalBodyClass = "flex min-h-0 w-full flex-1 flex-col bg-[#fcfaf6]/60 dark:bg-[#111827]/40";

export const erpModalFormScrollClass =
  "min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 custom-scrollbar sm:p-5";

export const erpModalFooterClass =
  "shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 dark:border-[#334155] dark:bg-[#111827] sm:px-6";

export const erpModalPanelClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5";

export const erpModalInnerPanelClass =
  "space-y-4 rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-sm dark:border-[#334155] dark:bg-[#0f172a]/40";

export const erpModalSectionRowClass =
  "flex items-center gap-2 border-b border-[#e7ded0] pb-2 dark:border-[#334155]/80";

export const erpModalSectionTitleClass = "text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]";

export const erpModalTabClass = (active: boolean) =>
  active
    ? "rounded-lg border border-[#ff801f] bg-[#ff801f] px-3 py-2 text-xs font-semibold text-black"
    : "rounded-lg border border-[#e7ded0] bg-white px-3 py-2 text-xs font-medium text-[#57534e] transition-colors hover:bg-[#fffdf8] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#aeb8c8] dark:hover:bg-white/[0.05]";

/** Modal eliminar / confirmación */
export const erpDeleteModalClass = "mx-4 w-full max-w-md sm:mx-auto";

export const erpDeleteModalPanelClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-6 shadow-[0_24px_48px_-12px_rgba(28,25,23,0.18)] dark:border-[#273244] dark:bg-[#111a2b] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]";

export const erpDangerBtnClass =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60";

/** Modal vista (problemática, servicios, comentario) */
export const erpViewModalClass = "max-w-2xl w-[92vw]";

export const erpViewModalPanelClass =
  "overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] dark:border-[#273244] dark:bg-[#111a2b]";

export const erpViewModalHeaderClass =
  "flex items-center gap-3 border-b border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 dark:border-[#334155] dark:bg-[#111827]";

export const erpViewModalFooterClass =
  "border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 text-right dark:border-[#334155] dark:bg-[#111827]";
