/**
 * Sistema de estilos del módulo Inventario.
 *
 * Mismo lenguaje que Perfil/ProfilePage, Configuracion/GestionUsuario,
 * MiEscritorio/Tareas y ProductosYServicios: marino + dorado sobre lienzo
 * blanco, azul eléctrico (#1B5CFF) como único acento de acción, líneas de
 * 1 px. En oscuro, la familia slate del contenedor de la app
 * (lienzo #0f172a → panel #111827 → tarjeta hundida #1B2539).
 *
 * Los tokens `inv*` reemplazan a los estilos ERP compartidos
 * (erpPageStyles / ordenTrabajoStyles) que usan otros módulos: no se tocan
 * esos archivos para no arrastrar el cambio a Órdenes, Proyectos, etc.
 */
import type { InventarioSeccionTono } from "./inventarioSecciones";
import type { InventarioFuente, ScanModo } from "./inventarioTypes";

/* --------------------------------------------------------------------------
   Página: lienzo + contenedor + migas de pan
   -------------------------------------------------------------------------- */

export const inventarioSansStyle = {
  fontFamily: "Geist, Outfit, system-ui, sans-serif",
} as const;

export const invPageCanvasClass = "min-h-[calc(100dvh-5rem)] overflow-x-hidden";

export const invPageInnerClass =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-6 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]";

export const invBreadcrumbNavClass =
  "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]";

export const invBreadcrumbLinkClass =
  "rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]";

export const invBreadcrumbCurrentClass = "px-1.5 text-[#09090B] dark:text-[#F8FAFC]";

/* --------------------------------------------------------------------------
   Cabecera: banda marina (idéntica a GestionUsuario / Tareas)
   -------------------------------------------------------------------------- */

export const invHeroBandClass =
  "relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8";

export const invHeroBlurClass =
  "pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl";

export const invHeroIconWrapClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const invHeroEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const invHeroHeadingClass =
  "mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

export const invHeroBodyClass =
  "mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70";

/** Pastilla de dato dentro de la banda marina. */
export const invHeroChipClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85";

export const invHeroChipGoldClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C]";

/* --------------------------------------------------------------------------
   Superficies genéricas
   -------------------------------------------------------------------------- */

export const invCardShellClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

export const invPrimaryBtnClass =
  "inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] sm:w-auto";

export const invSecondaryBtnClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[14px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] sm:w-auto";

export const invDangerBtnClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

/** Botón-enlace inline (acciones terciarias tipo “Traer del catálogo”). */
export const invLinkBtnClass =
  "inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#1B5CFF] underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] disabled:opacity-60 dark:text-[#4B7CFF]";

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

export const invSearchInputClass =
  "h-11 w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white py-2 pl-11 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const invInputLikeClass =
  "h-11 w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const invTextareaLikeClass =
  "min-h-[7.5rem] w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

/* --------------------------------------------------------------------------
   Sistema de modales — cascarón blanco, cabecera marina, cuerpo en lienzo,
   pie hundido con las acciones ancladas.
   -------------------------------------------------------------------------- */

export const invModalShellClass =
  "flex max-h-[min(92vh,860px)] w-[min(96vw,44rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-2xl";

export const invModalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

export const invModalHeaderClass = "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";

export const invModalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

export const invModalEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

export const invModalTitleClass =
  "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";

export const invModalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";

export const invModalBodyClass =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col bg-white dark:bg-[#111827]";

export const invModalScrollClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6";

export const invModalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";

export const invModalSectionCardShellClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

/* --------------------------------------------------------------------------
   Secciones de formulario
   -------------------------------------------------------------------------- */

export const inventarioSectionClass = "space-y-3";

export const inventarioSectionHeadClass =
  "flex flex-col gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between";

export const inventarioSectionCardClass =
  "space-y-3 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#1B2539] sm:space-y-4 sm:p-4";

export const inventarioEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A6B15] dark:text-[#E6A23C] sm:text-[11px]";

export const inventarioSectionTitleClass =
  "text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]";

export const inventarioSectionHintClass =
  "mt-0.5 text-[12px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]";

export const inventarioSectionIconClass = "h-5 w-5";

export const inventarioEmptyPanelClass =
  "rounded-[16px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-4 py-8 text-center dark:border-[#3A4661] dark:bg-[#1B2539]";

export const inventarioFieldLabelClass =
  "mb-1.5 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]";

/* --------------------------------------------------------------------------
   Consola de escaneo
   -------------------------------------------------------------------------- */

export const consolaShellClass =
  "relative overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

/** Rail de color que identifica el modo activo de un vistazo. */
export const consolaRailClass = (modo: ScanModo) =>
  `pointer-events-none absolute inset-x-0 top-0 h-1 ${
    modo === "entrada"
      ? "bg-gradient-to-r from-[#04724D] via-[#4ADE80] to-transparent"
      : "bg-gradient-to-r from-[#9A6B15] via-[#E6A23C] to-transparent"
  }`;

export const modoToggleWrapClass =
  "inline-flex w-full gap-1 rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#1B2539] sm:w-auto";

export const modoToggleBtnClass = (active: boolean, modo: ScanModo) => {
  const base =
    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-6";
  if (!active) {
    return `${base} text-[#52525B] hover:bg-white focus-visible:ring-[rgba(27,92,255,0.3)] dark:text-[#B7C1D1] dark:hover:bg-[#243048]`;
  }
  return modo === "entrada"
    ? `${base} bg-[#047857] text-white shadow-sm focus-visible:ring-[#047857]/40`
    : `${base} bg-[#B45309] text-white shadow-sm focus-visible:ring-[#B45309]/40`;
};

/** Campo de escaneo: monoespaciado y grande para leer el código a distancia. */
export const scanInputClass =
  "h-16 w-full rounded-[14px] border-2 border-[#E7E7EA] bg-white pl-14 pr-4 font-mono text-lg tracking-[0.12em] text-[#09090B] outline-none transition-all placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-[#A1A1AA] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] dark:disabled:bg-[#1B2539]";

/* --------------------------------------------------------------------------
   Métricas
   -------------------------------------------------------------------------- */

export const statCardClass =
  "flex items-start gap-3 rounded-[16px] border border-[#E7E7EA] bg-white px-3 py-3 dark:border-[#273244] dark:bg-[#111827] sm:px-4";

export const statValueClass =
  "text-2xl font-bold leading-none tracking-[-0.5px] text-[#09090B] dark:text-[#F8FAFC]";

export const statLabelClass =
  "mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]";

export type StatTono = "coral" | "emerald" | "amber" | "rose";

export const statIconWrapClass = (tono: StatTono) => {
  const base =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] sm:h-10 sm:w-10";
  if (tono === "emerald") return `${base} bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]`;
  if (tono === "amber") return `${base} bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]`;
  if (tono === "rose") return `${base} bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]`;
  return `${base} bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]`;
};

/* --------------------------------------------------------------------------
   Tabla / listado
   -------------------------------------------------------------------------- */

export const invTableWrapClass =
  "touch-pan-x overflow-x-auto overscroll-x-contain rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] [-webkit-overflow-scrolling:touch] dark:border-[#273244] dark:bg-[#1B2539]";

export const invTableHeaderClass =
  "sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[10px] font-semibold text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] sm:text-[11px]";

export const invTableRowHoverClass =
  "transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]";

export const invTableRowSelectedClass =
  "bg-[rgba(27,92,255,0.06)] dark:bg-[rgba(75,124,255,0.10)]";

export const invRowActionBarClass =
  "inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]";

export const invRowActionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

/* --------------------------------------------------------------------------
   Tarjeta de ítem en móvil (sustituye la tabla debajo de md)
   -------------------------------------------------------------------------- */

export const inventarioMobileCardClass =
  "rounded-[16px] border border-[#E7E7EA] bg-white p-3 shadow-[0_6px_20px_-14px_rgba(9,9,11,0.18)] dark:border-[#273244] dark:bg-[#111827] sm:p-4";

export const inventarioMobileCardSelectedClass =
  "border-[#1B5CFF]/60 bg-[rgba(27,92,255,0.06)] dark:border-[#4B7CFF]/50 dark:bg-[rgba(75,124,255,0.10)]";

/* --------------------------------------------------------------------------
   Badges
   -------------------------------------------------------------------------- */

export const fuenteBadgeClass = (fuente: InventarioFuente | "manual") => {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold";
  if (fuente === "syscom") {
    return `${base} bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#93c5fd]`;
  }
  if (fuente === "tvc") {
    return `${base} bg-[#ede9fe] text-[#5b21b6] dark:bg-[#4c1d95]/40 dark:text-[#c4b5fd]`;
  }
  if (fuente === "manual") {
    return `${base} bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]`;
  }
  return `${base} bg-[#FAFAFA] text-[#6E6E77] dark:bg-[#1B2539] dark:text-[#8EA0B8]`;
};

/** Badge de sección en tabla / cards: tipografía densa, tono por categoría. */
export const seccionBadgeClass = (tono: InventarioSeccionTono | "empty") => {
  const base =
    "inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide sm:text-[11px]";
  if (tono === "empty") {
    return `${base} border-dashed border-[#D3D3D8] bg-transparent text-[#A1A1AA] dark:border-[#3A4661] dark:text-[#64748b]`;
  }
  if (tono === "amber") {
    return `${base} border-[#E6A23C]/45 bg-[rgba(230,162,60,0.12)] text-[#9A6B15] dark:border-[#E6A23C]/35 dark:bg-[rgba(230,162,60,0.14)] dark:text-[#E6A23C]`;
  }
  if (tono === "rose") {
    return `${base} border-[#F6CFCF] bg-[#FEF2F2] text-[#C22B2B] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]`;
  }
  if (tono === "emerald") {
    return `${base} border-[#BFE6D4] bg-[#E9F8F0] text-[#04724D] dark:border-[#1E5A42] dark:bg-[#0F2A1C] dark:text-[#4ADE80]`;
  }
  if (tono === "sky") {
    return `${base} border-[#7dd3fc]/50 bg-[#f0f9ff] text-[#075985] dark:border-[#0284c7]/40 dark:bg-[#0c4a6e]/30 dark:text-[#7dd3fc]`;
  }
  if (tono === "violet") {
    return `${base} border-[#c4b5fd]/50 bg-[#f5f3ff] text-[#5b21b6] dark:border-[#7c3aed]/40 dark:bg-[#4c1d95]/25 dark:text-[#c4b5fd]`;
  }
  if (tono === "orange") {
    return `${base} border-[rgba(27,92,255,0.25)] bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:border-[#4B7CFF]/40 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]`;
  }
  if (tono === "slate") {
    return `${base} border-[#cbd5e1] bg-[#f8fafc] text-[#334155] dark:border-[#475569] dark:bg-[#1e293b] dark:text-[#cbd5e1]`;
  }
  return `${base} border-[#E7E7EA] bg-white text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#B7C1D1]`;
};

/** Chip de existencia: se marca en dorado cuando el ítem se quedó en cero. */
export const existenciaBadgeClass = (cantidad: number) => {
  const base =
    "inline-flex min-w-[2.25rem] items-center justify-center rounded-lg border px-2 py-0.5 text-sm font-semibold tabular-nums";
  if (cantidad <= 0) {
    return `${base} border-[#E6A23C]/60 bg-[rgba(230,162,60,0.12)] text-[#9A6B15] dark:border-[#E6A23C]/40 dark:bg-[rgba(230,162,60,0.14)] dark:text-[#E6A23C]`;
  }
  return `${base} border-[#E7E7EA] bg-[#FAFAFA] text-[#09090B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#F8FAFC]`;
};

export const movimientoChipClass = (tipo: ScanModo) =>
  `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
    tipo === "entrada"
      ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
      : "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]"
  }`;

export const candidatoRowClass =
  "flex w-full items-start gap-3 rounded-[12px] border border-[#E7E7EA] bg-white p-3 text-left transition-colors hover:border-[#1B5CFF]/50 hover:bg-[rgba(27,92,255,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#0f172a] dark:hover:border-[#4B7CFF]/50 dark:hover:bg-[rgba(75,124,255,0.08)]";

/* --------------------------------------------------------------------------
   Alertas — mismo tono y estructura que InlineAlert de Tareas / Productos
   -------------------------------------------------------------------------- */

export type InvAlertVariant = "success" | "error" | "warning" | "info";

export const invAlertTone: Record<
  InvAlertVariant,
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
