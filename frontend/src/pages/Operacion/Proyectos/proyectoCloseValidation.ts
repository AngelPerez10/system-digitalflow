import type { ProyectoDraft } from "./proyectoTypes";

/** True si el proyecto exige cotización adicional antes de cerrar. */
export function proyectoRequiereCotizacionAdicional(
  draft: Pick<ProyectoDraft, "requierePresupuestoAdicional" | "requerimientosAdicionales">
): boolean {
  return (
    Boolean(draft.requierePresupuestoAdicional) ||
    Boolean(String(draft.requerimientosAdicionales || "").trim())
  );
}

export function proyectoTieneCotizacionAdicionalVinculada(
  draft: Pick<ProyectoDraft, "cotizacionAdicional">
): boolean {
  return Boolean(draft.cotizacionAdicional?.id);
}

/**
 * Regla de negocio: no se puede cerrar si hay presupuesto/requerimientos
 * adicionales sin cotización vinculada.
 *
 * Frontend: validar al cambiar status / guardar.
 * Backend: aplicar la misma regla cuando exista API de proyectos.
 */
export function canCerrarProyecto(
  draft: Pick<
    ProyectoDraft,
    "requierePresupuestoAdicional" | "requerimientosAdicionales" | "cotizacionAdicional"
  >
): { ok: boolean; message: string } {
  if (!proyectoRequiereCotizacionAdicional(draft)) {
    return { ok: true, message: "" };
  }
  if (proyectoTieneCotizacionAdicionalVinculada(draft)) {
    return { ok: true, message: "" };
  }
  return {
    ok: false,
    message:
      "No se puede cerrar el proyecto: hay presupuesto o requerimientos adicionales sin cotización vinculada.",
  };
}
