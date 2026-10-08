/**
 * Tokens visuales de Documentos › Contratos.
 *
 * Mismo sistema que Proyectos, Cotizaciones, Órdenes e Inventario (ver
 * `Operacion/Proyectos/shared/proyectoTokens.ts`): banda marina #17235B con
 * acento dorado #E6A23C, azul #1B5CFF como único color de acción, tarjetas
 * blancas con línea de 1 px y Geist. Se reexporta lo común para que las vistas
 * de contratos no definan su propia paleta.
 *
 * Movimiento: clases `cot-*` de `components/ui/modal-kit/motion.css`.
 */
import "@/components/ui/modal-kit/motion.css";
import { ESTADO_TONE as PROYECTO_TONE, type ProyectoTone } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import type { ContratoEstado } from "./contratoApi";

export {
  bodyMuted,
  btn,
  btnSm,
  cardShell,
  cardShellRaised,
  divider,
  emptyPanel,
  eyebrow,
  eyebrowAccent,
  fieldError,
  fieldHint,
  fieldLabel,
  focusRing,
  folioText,
  fontSans,
  iconBtn,
  iconBtnDanger,
  input,
  inputInvalid,
  metaChip,
  requiredMark,
  sansStyle,
  select,
  sunken,
  textarea,
  titleMd,
} from "@/pages/Operacion/Proyectos/shared/proyectoTokens";

export {
  erpPrimaryBtnClass,
  erpStatCardClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles";

/** Lienzo de página (mismo contenedor que Proyectos / Órdenes). */
export const pageWrap =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-12 pt-6 text-sm text-[#52525B] sm:space-y-6 sm:px-5 sm:pt-7 md:px-6 lg:px-8 xl:px-10 dark:text-[#B7C1D1]";

/** Banda marina del encabezado. */
export const heroBand = "cot-sheen relative overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63]";

/** Botón sobre la banda marina. */
export const heroBtn =
  "cot-press inline-flex min-h-9 items-center justify-center gap-2 rounded-[10px] bg-white/10 px-3 text-[13px] font-medium text-white/90 ring-1 ring-inset ring-white/15 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 [&_svg]:size-4";

/** Botón principal sobre la banda (blanco, para destacar sobre marino). */
export const heroBtnPrimary =
  "cot-press inline-flex min-h-9 items-center justify-center gap-2 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-[#17235B] shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:bg-[#EEF3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60 [&_svg]:size-4";

/** Decoración de la banda: retícula de puntos + halos (marino/dorado). */
export const heroDots =
  "pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_left,black,transparent_70%)]";
export const heroGlowGold = "pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl";
export const heroGlowBlue = "pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#1B5CFF]/20 blur-3xl";

/** Ícono dorado del encabezado. */
export const heroIcon =
  "cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] ring-1 ring-inset ring-[#E6A23C]/25";

/* --------------------------------------------------------------------------
   Estados del contrato → mismos tonos que los estados de Proyectos
   -------------------------------------------------------------------------- */

const NEUTRO: ProyectoTone = {
  label: "Borrador",
  dot: "bg-[#A1A1AA] dark:bg-[#64748B]",
  pill: "bg-[#F4F4F5] text-[#52525B] ring-[#E4E4E7] dark:bg-white/[0.06] dark:text-[#B7C1D1] dark:ring-[#273244]",
  bar: "bg-[#A1A1AA] dark:bg-[#64748B]",
  text: "text-[#52525B] dark:text-[#B7C1D1]",
  segment:
    "bg-white text-[#3F3F46] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#243048] dark:text-white dark:ring-[#3A4661]",
};

export const ESTADO_CONTRATO_TONE: Record<ContratoEstado, ProyectoTone> = {
  borrador: NEUTRO,
  enviado: { ...PROYECTO_TONE.en_proceso, label: "En firma" },
  firmado_prestador: { ...PROYECTO_TONE.pausado, label: "Firmó el prestador" },
  firmado_cliente: { ...PROYECTO_TONE.pausado, label: "Firmó el cliente" },
  completado: { ...PROYECTO_TONE.cerrado, label: "Completado" },
  cancelado: { ...PROYECTO_TONE.cancelado, label: "Cancelado" },
};
