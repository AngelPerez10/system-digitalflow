/**
 * Tokens de movimiento compartidos entre el Modal ERP y el detalle de
 * «Status colocado por». Mantener un solo sitio para timing y fondo.
 */
export const MODAL_ENTER_EASE = [0.22, 1, 0.36, 1] as const;
export const MODAL_EXIT_EASE = [0.4, 0, 1, 1] as const;

export const MODAL_PANEL_ENTER_TRANSITION = {
  duration: 0.1,
  ease: MODAL_ENTER_EASE,
} as const;

export const MODAL_PANEL_EXIT_TRANSITION = {
  duration: 0.08,
  ease: MODAL_EXIT_EASE,
} as const;

export const MODAL_BACKDROP_TRANSITION = { duration: 0.08 } as const;

export const MODAL_REDUCE_TRANSITION = { duration: 0.06 } as const;

/** Fondo del overlay (igual al modal de auditoría de status). */
export const MODAL_BACKDROP_SURFACE =
  "bg-[#09090B]/40 backdrop-blur-[6px] dark:bg-black/55";

export const MODAL_BACKDROP_CLASS = `fixed inset-0 h-full w-full ${MODAL_BACKDROP_SURFACE}`;

export const MODAL_PANEL_INITIAL = {
  opacity: 0,
  y: 10,
  scale: 0.995,
} as const;

export const MODAL_PANEL_ANIMATE = {
  opacity: 1,
  y: 0,
  scale: 1,
} as const;

export const MODAL_PANEL_EXIT = {
  opacity: 0,
  y: 6,
  scale: 0.995,
} as const;
