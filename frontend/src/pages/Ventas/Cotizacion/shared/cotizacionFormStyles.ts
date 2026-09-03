/**
 * Sistema de estilos del módulo Cotizaciones (Ventas).
 *
 * Mismo lenguaje que Perfil, Gestión de usuarios, Tareas, Productos e
 * Inventario: marino + dorado sobre lienzo blanco, azul eléctrico
 * (#1B5CFF) como único acento de acción, líneas de 1 px. En oscuro, la
 * familia slate del contenedor de la app
 * (lienzo #0f172a → panel #111827 → tarjeta hundida #1B2539).
 *
 * Los tokens `cot*` reemplazan a los estilos ERP compartidos
 * (@/layout/erpPageStyles) que usan otros módulos: no se tocan esos
 * archivos para no arrastrar el cambio a Órdenes, Proyectos, etc.
 */

export const cotSansStyle = {
  fontFamily: "Geist, Outfit, system-ui, sans-serif",
} as const;

export const cotPageCanvasClass = "min-h-[calc(100dvh-5rem)] overflow-x-hidden";

export const cotPageInnerClass =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-6 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]";

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

export const inputLikeClassName =
  "w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:py-2.5";

export const textareaLikeClassName =
  "w-full min-h-[7rem] rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:min-h-[8rem] sm:py-3";

export const cloneModalSearchInputClass =
  "min-h-[44px] w-full rounded-[10px] border border-[#E7E7EA] bg-white py-2.5 pl-10 pr-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

/** Campo numérico: mismo tono que `inputLikeClassName`, cifras tabulares y sin flechas nativas. */
export const numberInputClass = `${inputLikeClassName} tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

/** Override de borde/anillo para estado inválido (rojo de error del sistema). */
export const inputInvalidClass =
  "!border-[#C22B2B] focus:!border-[#C22B2B] focus:!ring-[rgba(194,43,43,0.18)] dark:!border-[#F87171] dark:focus:!border-[#F87171]";

export const labelPageClass =
  "!mb-1.5 !text-[13px] !font-medium !text-[#52525B] dark:!text-[#8EA0B8] sm:!text-[13px]";

/* --------------------------------------------------------------------------
   Superficies
   -------------------------------------------------------------------------- */

export const cardShellClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

export const cardShellMutedClass =
  "overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

export const innerFieldPanelClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

export const cloneModalPanelClass =
  "rounded-[16px] border border-[#E7E7EA] bg-white p-4 dark:border-[#273244] dark:bg-[#111827] sm:p-5";

/** Resumen destacado del total: banda azul suave, no coral. */
export const summaryHeroClass =
  "relative overflow-hidden rounded-[16px] border border-[rgba(27,92,255,0.25)] bg-[rgba(27,92,255,0.06)] p-4 dark:border-[#4B7CFF]/25 dark:bg-[rgba(75,124,255,0.10)] sm:p-5";

export const tableWrapClass =
  "touch-pan-x overflow-x-auto overscroll-x-contain rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] [-webkit-overflow-scrolling:touch] dark:border-[#273244] dark:bg-[#1B2539]";

/* --------------------------------------------------------------------------
   Tipografía
   -------------------------------------------------------------------------- */

export const claudeHeroHeadingClass =
  "text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

export const claudeBodyClass = "text-sm leading-relaxed text-[#52525B] dark:text-[#B7C1D1]";

export const sectionZoneClass = "relative space-y-4 sm:space-y-5";

export const sectionHeadingClass =
  "text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] sm:text-base";

export const sectionEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

export const cotSubheadingClass =
  "text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]";

export const sectionDividerClass =
  "border-t border-[#E7E7EA] pt-6 dark:border-[#273244] sm:pt-8";

export const conceptCountBadgeClass =
  "inline-flex items-center rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#52525B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#B7C1D1] sm:text-[11px]";

export const headerStatPillClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-1.5 text-[11px] font-medium text-[#52525B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#B7C1D1] sm:text-xs";

/** Pastilla de dato dentro de la banda marina de cabecera. */
export const heroChipClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85";

export const heroChipGoldClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C]";

/* --------------------------------------------------------------------------
   Cabecera: banda marina (idéntica a los otros módulos)
   -------------------------------------------------------------------------- */

export const heroBandClass =
  "relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8";

export const heroBlurClass =
  "pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl";

export const heroIconWrapClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const heroEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const heroBodyClass =
  "mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70";

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

export const primaryActionBtnClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-4 py-3 text-sm font-semibold tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] sm:min-h-[44px]";

/** Variante de ancho automático (barras de acción con el botón a la derecha). */
export const primaryActionInlineBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-5 py-2.5 text-sm font-semibold tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] disabled:shadow-none dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] sm:w-auto";

export const secondaryActionBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2.5 text-xs font-semibold tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]";

export const ghostActionBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-transparent px-3 py-2.5 text-xs font-medium tracking-[-0.1px] text-[#52525B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] dark:border-[#273244] dark:text-[#B7C1D1] dark:hover:bg-[#243048]";

export const cloneActionBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(27,92,255,0.25)] bg-[rgba(27,92,255,0.08)] px-3 py-2.5 text-xs font-semibold tracking-[-0.1px] text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] dark:border-[#4B7CFF]/40 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.22)]";

/** Enviar por correo — se mantiene el tono azul de información. */
export const correoActionBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(27,92,255,0.25)] bg-white px-3 py-2.5 text-xs font-semibold text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.06)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#4B7CFF]/30 dark:bg-transparent dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.08)]";

/** Acción destructiva — rojo de error. */
export const dangerActionBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 py-2.5 text-xs font-semibold tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

/** Generar / autorizar — verde de éxito. */
export const tertiaryActionBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#BFE6D4] bg-white px-3 py-2.5 text-xs font-semibold text-[#04724D] transition-colors hover:bg-[#E9F8F0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(4,114,77,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#1E5A42] dark:bg-transparent dark:text-[#4ADE80] dark:hover:bg-[#0F2A1C]";

/* --------------------------------------------------------------------------
   Sistema de modales — cascarón blanco, cabecera marina, pie hundido.
   -------------------------------------------------------------------------- */

export const modalShellClass =
  "flex max-h-[min(92vh,860px)] w-[min(96vw,44rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-2xl";

export const modalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

export const modalHeaderClass = "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";

export const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const modalEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const modalTitleClass =
  "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";

export const modalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";

export const modalBodyClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-[#111827] sm:px-6";

export const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";

/* --------------------------------------------------------------------------
   Alertas — mismo tono y estructura que InlineAlert de Tareas / Productos
   -------------------------------------------------------------------------- */

export type CotAlertVariant = "success" | "error" | "warning" | "info";

export const cotAlertTone: Record<
  CotAlertVariant,
  { border: string; bg: string; dot: string; title: string; msg: string }
> = {
  success: {
    border: "border-[#BFE6D4] dark:border-[#1E5A42]",
    bg: "bg-[#E9F8F0] dark:bg-[#0F2A1C]",
    dot: "bg-[#04724D] dark:bg-[#4ADE80]",
    title: "text-[#04724D] dark:text-[#4ADE80]",
    msg: "text-[#04724D]/85 dark:text-[#4ADE80]/80",
  },
  error: {
    border: "border-[#F6CFCF] dark:border-[#7F1D1D]",
    bg: "bg-[#FEF2F2] dark:bg-[#3F1518]",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    title: "text-[#C22B2B] dark:text-[#F87171]",
    msg: "text-[#C22B2B]/85 dark:text-[#F87171]/80",
  },
  warning: {
    border: "border-[rgba(230,162,60,0.4)] dark:border-[rgba(230,162,60,0.3)]",
    bg: "bg-[rgba(230,162,60,0.10)] dark:bg-[rgba(230,162,60,0.10)]",
    dot: "bg-[#9A6B15] dark:bg-[#E6A23C]",
    title: "text-[#9A6B15] dark:text-[#E6A23C]",
    msg: "text-[#9A6B15]/85 dark:text-[#E6A23C]/85",
  },
  info: {
    border: "border-[rgba(27,92,255,0.28)] dark:border-[rgba(75,124,255,0.3)]",
    bg: "bg-[rgba(27,92,255,0.06)] dark:bg-[rgba(75,124,255,0.10)]",
    dot: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    title: "text-[#1B5CFF] dark:text-[#4B7CFF]",
    msg: "text-[#1B5CFF]/85 dark:text-[#4B7CFF]/85",
  },
};
