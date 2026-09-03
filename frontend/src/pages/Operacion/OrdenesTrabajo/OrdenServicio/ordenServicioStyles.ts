/**
 * Sistema de estilos del módulo Órdenes de servicio (Operación).
 *
 * Mismo lenguaje que Cotizaciones, Facturas CFDI, Inventario, Cuentas
 * Antarix, Productos y Perfil: marino + dorado sobre lienzo blanco, azul
 * eléctrico (#1B5CFF) como único acento de acción, líneas de 1 px. En
 * oscuro, la familia slate del contenedor de la app
 * (lienzo #0f172a → panel #111827 → tarjeta hundida #1B2539).
 *
 * Reemplaza a los tokens compartidos `../ordenTrabajoStyles` (naranja ERP,
 * usados también por Proyectos / Pólizas / Reportes): se conservan los
 * nombres `erp*` para que la migración sea sólo cambiar la ruta del import.
 */

export const erpSansStyle = {
  fontFamily: "Geist, Outfit, system-ui, sans-serif",
} as const;

/* --------------------------------------------------------------------------
   Página: lienzo + contenedor + migas de pan
   -------------------------------------------------------------------------- */

export const erpPageCanvasClass = "min-h-[calc(100dvh-5rem)] overflow-x-hidden";

export const erpPageInnerClass =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-6 text-sm text-[#52525B] sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-7 md:px-6 lg:px-8 xl:px-10 dark:text-[#B7C1D1] 2xl:max-w-[min(100%,2200px)]";

export const erpBreadcrumbNavClass =
  "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]";

export const erpBreadcrumbLinkClass =
  "rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]";

/* --------------------------------------------------------------------------
   Cabecera: banda marina (idéntica a Cotizaciones / Facturas CFDI)
   -------------------------------------------------------------------------- */

export const osHeroBandClass =
  "relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8";

export const osHeroEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const osHeroBodyClass =
  "mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70";

export const osHeroChipClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85";

export const osHeroChipGoldClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C]";

export const erpHeroHeadingClass =
  "text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

export const erpHeroIconWrapClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const erpHeroBlurClass =
  "pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl";

/** Se conserva por compatibilidad; en la banda marina no se pinta ninguna línea. */
export const erpHeroGradientClass = "hidden";

/* --------------------------------------------------------------------------
   Superficies
   -------------------------------------------------------------------------- */

export const pageCardShellClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

export const erpCardShellClass = pageCardShellClass;

export const osEmptyPanelClass =
  "rounded-[20px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-6 py-14 text-center dark:border-[#3A4661] dark:bg-[#1B2539]";

/* --------------------------------------------------------------------------
   Tipografía de sección
   -------------------------------------------------------------------------- */

export const sectionLabelOrangeClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

export const osEyebrowClass = sectionLabelOrangeClass;

export const erpSectionHeadingClass =
  "text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[19px]";

export const erpSubheadingClass =
  "text-[15px] font-semibold leading-[1.3] tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] sm:text-base";

export const claudeBodyClass = "text-sm leading-relaxed text-[#52525B] dark:text-[#B7C1D1]";

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

export const erpPrimaryBtnClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-5 text-sm font-semibold tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] sm:w-auto sm:min-h-0 sm:py-2.5";

export const erpSecondaryBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-sm font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] sm:w-auto sm:min-h-0 sm:py-2.5";

export const erpDangerBtnClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-sm font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-h-0 sm:py-2.5";

export const outlineCoralBtnClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(27,92,255,0.25)] bg-white px-4 py-3 text-xs font-semibold text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.06)] focus:outline-none focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#4B7CFF]/40 dark:bg-transparent dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.08)] sm:min-h-0";

export const erpMonthNavBtnClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#52525B] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] sm:size-9";

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

export const pageSearchInputClass =
  "h-11 w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white py-2 pl-11 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const erpSearchInputClass = pageSearchInputClass;

export const erpSelectFieldClass =
  "h-11 w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const erpInputLikeClass =
  "w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:py-2.5";

export const erpTextareaLikeClass =
  "w-full min-h-[7rem] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:min-h-[8rem] sm:py-3";

export const erpFormInputClass = erpInputLikeClass;

/* --------------------------------------------------------------------------
   Métricas
   -------------------------------------------------------------------------- */

export const erpStatCardClass =
  "flex items-start gap-3 rounded-[16px] border border-[#E7E7EA] bg-white px-3 py-3 dark:border-[#273244] dark:bg-[#111827] sm:px-4";

/* --------------------------------------------------------------------------
   Tabla / listado — idéntico a ServiciosPage / FacturasCFDI
   -------------------------------------------------------------------------- */

export const erpTableWrapClass =
  "overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

export const erpTableHeaderClass =
  "sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]";

/** Celda de encabezado: sentence-case, sin mayúsculas ni tracking. */
export const osThCellClass = "px-3 py-2 text-left align-middle text-[#52525B] dark:text-[#B7C1D1]";

export const osTableBodyClass =
  "divide-y divide-[#EDEDED] bg-white text-[12px] text-[#44403c] dark:divide-[#273244] dark:bg-[#111827] dark:text-[#e5e7eb]";

export const osTdCellClass = "px-3 py-2 align-middle";

export const osEmptyCellClass = "text-[#A1A1AA]";

export const erpTableRowHoverClass =
  "transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]";

export const erpRowActionBarClass =
  "inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]";

export const erpRowActionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] disabled:pointer-events-none disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

/** Pastilla de estado — misma forma/tono que ServiciosPage. */
export const osStatusBadgeClass = (kind: "ok" | "bad" | "warn" | "neutral") => {
  const base =
    "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap";
  if (kind === "ok")
    return `${base} bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]`;
  if (kind === "bad")
    return `${base} bg-[rgba(194,43,43,0.10)] text-[#C22B2B] dark:bg-[rgba(248,113,113,0.14)] dark:text-[#F87171]`;
  if (kind === "warn")
    return `${base} bg-[rgba(230,162,60,0.14)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]`;
  return `${base} bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#8EA0B8]`;
};

export const osCountPillClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-1.5 text-[11px] font-medium tabular-nums text-[#52525B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#B7C1D1]";

/* --------------------------------------------------------------------------
   Tarjeta de fila en móvil
   -------------------------------------------------------------------------- */

export const erpMobileCardClass =
  "w-full min-w-0 overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white p-4 text-left shadow-[0_6px_20px_-14px_rgba(9,9,11,0.18)] transition-colors hover:border-[#1B5CFF]/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/40 sm:p-5";

/* --------------------------------------------------------------------------
   Filtros (popover)
   -------------------------------------------------------------------------- */

export const erpFilterBtnClass =
  "relative flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2 text-xs font-semibold text-[#52525B] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048] sm:w-auto sm:min-w-[86px]";

export const erpFilterBtnActiveClass =
  "border-[#1B5CFF]/55 bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:border-[#4B7CFF]/50 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]";

export const erpFilterPopoverClass =
  "absolute right-0 z-[110] mt-2 flex w-[min(calc(100vw-1.5rem),22rem)] max-h-[min(80vh,32rem)] flex-col overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white shadow-[0_24px_48px_-16px_rgba(9,9,11,0.28)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827] dark:ring-white/10";

export const erpFilterSectionLabelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]";

export const erpFilterStatusChipClass = (active: boolean) =>
  active
    ? "inline-flex min-h-9 flex-1 items-center justify-center rounded-[10px] bg-[#1B5CFF] px-2.5 text-xs font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.4)] dark:bg-[#4B7CFF]"
    : "inline-flex min-h-9 flex-1 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white px-2.5 text-xs font-medium text-[#52525B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:bg-[#243048]";

/* --------------------------------------------------------------------------
   Vista de tabs (Órdenes / Levantamiento u otras)
   -------------------------------------------------------------------------- */

export const viewTabClass = (active: boolean) =>
  active
    ? "rounded-[8px] bg-[#1B5CFF] px-3 py-1.5 text-xs font-semibold text-white shadow-sm dark:bg-[#4B7CFF]"
    : "rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#52525B] transition-colors hover:bg-white hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#243048] dark:hover:text-white";
