/** Textos y constantes del formulario de cliente (sin componentes). */
import type { ClienteTipo } from "../domain/clienteTipos";

export const SINGULAR: Record<ClienteTipo | "DEFAULT", string> = {
  EMPRESA: "empresa",
  PERSONA_FISICA: "persona física",
  PROVEEDOR: "proveedor",
  DEFAULT: "contacto",
};

/** Fases visibles del guardado (en orden). */
export type SavePhase = "idle" | "cliente" | "contacto" | "direccion" | "done";

export const PHASE_LABEL: Record<Exclude<SavePhase, "idle">, string> = {
  cliente: "Guardando datos…",
  contacto: "Guardando contacto…",
  direccion: "Guardando dirección…",
  done: "¡Guardado!",
};

/** Tiempo que se ve «¡Guardado!» antes de cerrar. */
export const SAVED_PAUSE_MS = 650;

export function apiFailureMessage(status: number, parsed: string, isEditing: boolean): string {
  if (status === 403) return "No tienes permiso para guardar este registro.";
  if (status === 404 && isEditing) return "Este registro ya no existe; otro usuario pudo haberlo eliminado. Cierra y recarga el listado.";
  if (status === 409) return parsed || "Hubo un conflicto al guardar. Inténtalo de nuevo.";
  if (status === 0) return "El servidor no devolvió el registro guardado. Recarga el listado para verificar.";
  if (status >= 500) return "El servidor tuvo un problema al guardar. Inténtalo de nuevo en un momento.";
  return parsed || "No se pudo guardar. Revisa los datos e inténtalo de nuevo.";
}
