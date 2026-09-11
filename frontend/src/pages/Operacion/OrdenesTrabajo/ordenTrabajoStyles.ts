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

import { erpInputLikeClass, erpSearchInputClass } from "@/layout/erpPageStyles";

/**
 * Shell de tarjeta para páginas de listado del módulo Operación (Órdenes, Proyectos,
 * Reportes, Pólizas). Superficie propia, un tono más clara que el canvas oscuro
 * (#0f172a) — el shell compartido (`erpCardShellClass`, #111827) queda casi
 * indistinguible del fondo en modo oscuro.
 */
export const pageCardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#334155] dark:bg-[#141b2d] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_30px_80px_-45px_rgba(0,0,0,0.7)]";
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
  "relative flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2 text-xs font-semibold text-[#57534e] transition-colors hover:bg-[#fffdf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b] sm:w-auto sm:min-w-[86px]";

export const erpFilterBtnActiveClass =
  "border-[#ff801f]/55 bg-[#fff4eb] text-[#9a3412] dark:border-[#fb923c]/50 dark:bg-[#fb923c]/10 dark:text-[#fdba74]";

export const erpFilterPopoverClass =
  "absolute right-0 z-[110] mt-2 flex w-[min(calc(100vw-1.5rem),22rem)] max-h-[min(80vh,32rem)] flex-col overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] shadow-[0_24px_48px_-16px_rgba(28,25,23,0.28)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111a2b] dark:ring-white/10";

export const erpFilterSectionLabelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]";

export const erpFilterStatusChipClass = (active: boolean) =>
  active
    ? "inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-[#ff801f] px-2.5 text-xs font-semibold text-black shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40"
    : "inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-[#e2d9ca] bg-[#fffdfa] px-2.5 text-xs font-medium text-[#57534e] transition-colors hover:bg-[#fff8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]";

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

/**
 * Modal crear/editar orden / proyecto.
 *
 * Lenguaje azul marino compartido con `OrdenServicio/ordenServicioStyles.ts`
 * (`#1B5CFF` como único acento de acción, líneas de 1 px `#E7E7EA`). Estos
 * tokens de modal los consumen también Proyectos y Pólizas vía
 * `OrdenTrabajoModals.tsx`; las páginas de esos módulos conservan sus propios
 * tokens naranja (no se tocan aquí).
 */
export const erpModalShellClass =
  "flex max-h-[min(94dvh,94vh)] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:max-h-[min(92vh,92vh)] sm:w-[min(96vw,56rem)] sm:max-w-4xl sm:rounded-[20px]";

/** Cabecera de modal — banda marina (mismo sistema que Clientes / Cotizaciones / Servicios). */
export const erpModalHeaderClass =
  "relative shrink-0 bg-[#17235B] px-4 py-4 pr-14 dark:bg-[#1B2A63] sm:px-6 sm:py-5 sm:pr-16";

/** Se conserva por compatibilidad; en la banda marina no se pinta ninguna línea de acento. */
export const erpModalHeaderAccentClass = "hidden";

/** Eyebrow del encabezado de modal (antes `sectionLabelOrangeClass`). */
export const erpModalEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

export const erpModalBodyClass = "flex min-h-0 w-full min-w-0 flex-1 flex-col bg-white dark:bg-[#111827]";

export const erpModalFormScrollClass =
  "erp-modal-form-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain touch-pan-y p-4 custom-scrollbar sm:space-y-5 sm:p-6 sm:touch-auto";

export const erpModalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#273244] dark:bg-[#151E32] sm:px-6 sm:py-4 sm:pb-4";

export const erpModalPanelClass =
  "rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

export const erpModalInnerPanelClass =
  "space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-3 shadow-sm dark:border-[#273244] dark:bg-[#0f172a]/40 sm:p-4";

export const erpModalSectionRowClass =
  "flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]/80";

export const erpModalSectionTitleClass = "text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]";

export const erpModalTabClass = (active: boolean) =>
  active
    ? "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[#1B5CFF] bg-[#1B5CFF] px-3 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.4)] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
    : "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[#E7E7EA] bg-white px-3 py-2 text-xs font-medium text-[#52525B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#aeb8c8] dark:hover:bg-[#243048]";

/** Fila de tabs con scroll horizontal en móvil. */
export const erpModalTabListClass =
  "-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Modal eliminar / confirmación */
export const erpDeleteModalClass = "mx-4 w-full max-w-md sm:mx-auto";

export const erpDeleteModalPanelClass =
  "rounded-2xl border border-[#E7E7EA] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(9,9,11,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]";

export const erpDangerBtnClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#C22B2B] px-5 py-2.5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-[#A82424] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-[#111827] sm:w-auto sm:min-h-[42px]";

/** Botones específicos de modal — lenguaje azul marino (antes re-export naranja de `erpPageStyles`). */
export const erpModalPrimaryBtnClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-5 text-sm font-semibold tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] sm:w-auto sm:min-h-[42px] sm:py-2.5";

export const erpModalSecondaryBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-sm font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] sm:w-auto sm:min-h-[42px] sm:py-2.5";

/** Botón outline azul de modal (antes `outlineCoralBtnClass`). */
export const erpModalOutlineBtnClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#BFD3FF] bg-white px-4 py-3 text-xs font-semibold text-[#1244D1] transition-colors hover:bg-[#F1F5FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#4B7CFF]/40 dark:bg-transparent dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.1)] sm:min-h-[42px]";

/** Modal vista (problemática, servicios, comentario) */
export const erpViewModalClass = "max-w-2xl w-[92vw]";

export const erpViewModalPanelClass =
  "overflow-hidden rounded-2xl border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]";

export const erpViewModalHeaderClass =
  "flex items-center gap-3 border-b border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#111827]";

export const erpViewModalFooterClass =
  "border-t border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 text-right dark:border-[#273244] dark:bg-[#111827]";
