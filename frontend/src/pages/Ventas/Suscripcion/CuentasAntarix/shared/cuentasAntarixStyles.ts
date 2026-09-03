/**
 * Sistema de estilos del módulo Cuentas Antarix GPS (Ventas · Suscripción).
 *
 * Mismo lenguaje que Perfil, Gestión de usuarios, Tareas, Productos,
 * Inventario y Cotizaciones: marino + dorado sobre lienzo blanco, azul
 * eléctrico (#1B5CFF) como único acento de acción, líneas de 1 px. En
 * oscuro, la familia slate del contenedor de la app
 * (lienzo #0f172a → panel #111827 → tarjeta hundida #1B2539).
 *
 * Reemplaza a los estilos ERP compartidos (@/layout/erpPageStyles y
 * ordenTrabajoStyles) que usan otros módulos: se conservan los mismos
 * nombres de export (`erp*`) para que la migración sea sólo cambiar la
 * ruta del import, sin renombrar cada uso.
 */

export const erpSansStyle = {
  fontFamily: "Geist, Outfit, system-ui, sans-serif",
} as const;

/* --------------------------------------------------------------------------
   Página: lienzo + contenedor + migas de pan
   -------------------------------------------------------------------------- */

export const caaPageCanvasClass = "min-h-[calc(100dvh-5rem)] overflow-x-hidden";

export const caaPageInnerClass =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-6 text-sm text-[#52525B] sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-7 md:px-6 lg:px-8 xl:px-10 dark:text-[#B7C1D1] 2xl:max-w-[min(100%,2200px)]";

export const caaBreadcrumbNavClass =
  "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]";

export const caaBreadcrumbLinkClass =
  "rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]";

export const caaBreadcrumbSepClass = "text-[#D3D3D8] dark:text-[#3D3D4A]";

export const caaBreadcrumbCurrentClass = "px-1.5 text-[#09090B] dark:text-[#F8FAFC]";

/* --------------------------------------------------------------------------
   Cabecera: banda marina (idéntica a Inventario / Cotizaciones)
   -------------------------------------------------------------------------- */

export const caaHeroBandClass =
  "relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8";

export const caaHeroBlurClass =
  "pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl";

export const caaHeroIconWrapClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const caaHeroEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

/** Titular del hero — mismo peso/escala que el resto de módulos. */
export const erpHeroHeadingClass =
  "text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

export const caaHeroBodyClass =
  "mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70";

export const caaHeroLinkClass = "font-semibold text-[#E6A23C]";

export const caaHeroChipClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85";

export const caaHeroChipGoldClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C]";

/* --------------------------------------------------------------------------
   Superficies
   -------------------------------------------------------------------------- */

export const erpCardShellClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

export const caaCardShellMutedClass =
  "overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

export const caaInnerPanelClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

export const caaEmptyPanelClass =
  "rounded-[20px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-6 py-14 text-center dark:border-[#3A4661] dark:bg-[#1B2539]";

/* --------------------------------------------------------------------------
   Tipografía de secciones
   -------------------------------------------------------------------------- */

export const erpSectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8] sm:text-[11px]";

export const caaEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

export const erpSectionHeadingClass =
  "text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[19px]";

export const erpSubheadingClass =
  "text-[15px] font-semibold leading-[1.3] tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] sm:text-base";

export const erpBodyClass =
  "text-sm leading-relaxed text-[#52525B] dark:text-[#B7C1D1] sm:text-[15px]";

export const caaCaptionClass =
  "text-xs leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]";

export const caaValueClass =
  "text-sm font-medium leading-snug text-[#09090B] dark:text-[#F8FAFC]";

export const caaFieldLabelClass =
  "mb-1.5 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]";

/* --------------------------------------------------------------------------
   Métricas (stat cards)
   -------------------------------------------------------------------------- */

export const caaStatCardClass =
  "flex items-start gap-3 rounded-[16px] border border-[#E7E7EA] bg-white px-3 py-3 dark:border-[#273244] dark:bg-[#111827] sm:px-4";

export const caaStatValueClass =
  "text-2xl font-bold leading-none tracking-[-0.5px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]";

export const caaStatLabelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]";

export type CaaStatTono = "blue" | "emerald" | "amber" | "rose";

export const caaStatIconWrapClass = (tono: CaaStatTono = "blue") => {
  const base =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] sm:h-10 sm:w-10";
  if (tono === "emerald")
    return `${base} bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]`;
  if (tono === "amber")
    return `${base} bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]`;
  if (tono === "rose")
    return `${base} bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]`;
  return `${base} bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]`;
};

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

export const erpPrimaryBtnClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-5 text-sm font-semibold tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] sm:w-auto sm:min-h-0 sm:py-2.5";

export const erpSecondaryBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-sm font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] sm:w-auto sm:min-h-0 sm:py-2.5";

export const caaDangerBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-sm font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-h-0 sm:py-2.5";

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

export const erpSearchInputClass =
  "h-11 w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white py-2 pl-11 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const erpInputLikeClass =
  "w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:py-2.5";

export const erpSelectFieldClass =
  "h-11 w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const erpTextareaLikeClass =
  "w-full min-h-[7rem] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:min-h-[8rem] sm:py-3";

/* --------------------------------------------------------------------------
   Chips / badges
   -------------------------------------------------------------------------- */

export const erpChipNeutralClass =
  "border border-[#E7E7EA] bg-[#FAFAFA] text-[#52525B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#B7C1D1]";

export const caaCountPillClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-1.5 text-[11px] font-medium tabular-nums text-[#52525B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#B7C1D1]";

/** Toggle de vista (Cuentas / Unidades) — pastilla marina sobre lienzo. */
export const caaViewTabTrackClass =
  "inline-flex rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#1B2539]";

export const caaViewTabClass = (active: boolean) =>
  active
    ? "rounded-[8px] bg-[#1B5CFF] px-3 py-1.5 text-xs font-semibold text-white shadow-sm dark:bg-[#4B7CFF]"
    : "rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#52525B] transition-colors hover:bg-white hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#243048] dark:hover:text-white";

/* --------------------------------------------------------------------------
   Tabla / listado — idéntico a ProductosYServicios/ServiciosPage
   -------------------------------------------------------------------------- */

export const erpTableWrapClass =
  "overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

export const erpTableHeaderClass =
  "sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]";

/** Celda de encabezado: sentence-case, sin mayúsculas ni tracking. */
export const caaThCellClass = "px-3 py-2 text-left align-middle text-[#52525B] dark:text-[#B7C1D1]";

/** Cuerpo de la tabla — fondo blanco para que el hover de fila sea visible sobre el marco crema. */
export const caaTableBodyClass =
  "divide-y divide-[#EDEDED] bg-white text-[12px] text-[#44403c] dark:divide-[#273244] dark:bg-[#111827] dark:text-[#e5e7eb]";

/** Celda de cuerpo. */
export const caaTdCellClass = "px-3 py-2 align-middle";

/** Valor vacío en celda (guion tenue). */
export const caaEmptyCellClass = "text-[#A1A1AA]";

export const erpTableRowHoverClass =
  "transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]";

/** Pastilla de estado — misma forma/tono que ServiciosPage. */
export const caaStatusBadgeClass = (kind: "ok" | "bad" | "neutral") => {
  const base =
    "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap";
  if (kind === "ok")
    return `${base} bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]`;
  if (kind === "bad")
    return `${base} bg-[rgba(194,43,43,0.10)] text-[#C22B2B] dark:bg-[rgba(248,113,113,0.14)] dark:text-[#F87171]`;
  return `${base} bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#8EA0B8]`;
};

export const erpRowActionBarClass =
  "inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]";

export const erpRowActionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

/* --------------------------------------------------------------------------
   Tarjeta de fila en móvil
   -------------------------------------------------------------------------- */

export const caaMobileCardClass =
  "w-full min-w-0 overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white p-4 text-left shadow-[0_6px_20px_-14px_rgba(9,9,11,0.18)] transition-colors hover:border-[#1B5CFF]/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/40 sm:p-5";

/** Avatar de inicial — marino con letra dorada, igual que el icono del hero. */
export const caaAvatarClass =
  "inline-flex shrink-0 items-center justify-center rounded-[12px] bg-[#17235B] font-semibold text-[#E6A23C] dark:bg-[#1B2A63]";

/* --------------------------------------------------------------------------
   Sistema de modales — cascarón blanco, cabecera marina, pie hundido.
   -------------------------------------------------------------------------- */

export const caaModalShellClass =
  "flex max-h-[min(92vh,900px)] w-[min(96vw,52rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-3xl";

export const caaModalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

export const caaModalHeaderClass =
  "relative shrink-0 bg-[#17235B] px-5 py-5 pr-14 dark:bg-[#1B2A63] sm:px-6 sm:pr-16";

export const caaModalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const caaModalEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const caaModalTitleClass =
  "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";

export const caaModalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";

export const caaModalBodyClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-[#111827] sm:px-6";

export const erpModalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";

/** Pestañas dentro de la cabecera marina del modal. */
export const caaModalTabTrackClass =
  "inline-flex w-full max-w-xs gap-1 rounded-[12px] bg-white/10 p-1 sm:w-auto";

export const caaModalTabBtnClass = (active: boolean) =>
  active
    ? "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-white px-4 text-sm font-semibold text-[#17235B] transition-colors sm:flex-none"
    : "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-4 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:flex-none";

/* --------------------------------------------------------------------------
   Alertas — mismo tono y estructura que el resto de módulos
   -------------------------------------------------------------------------- */

export type CaaAlertVariant = "success" | "error" | "warning" | "info";

export const caaAlertTone: Record<
  CaaAlertVariant,
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
