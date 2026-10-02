/**
 * Pasos del alta/edición de cliente y su estado (completo / con errores).
 * Puro y probado; etiquetas e íconos viven en `form/clienteStepMeta.ts`.
 */
import type { ClienteFormTab } from "./clienteTipos";
import { CLIENTE_FIELD_TAB, type ClienteFieldErrors } from "./clienteValidation";

export type ClienteStepState = "idle" | "done" | "error";

/** Orden de los pasos del formulario (la presentación vive en `form/clienteStepMeta.ts`). */
export const CLIENTE_STEP_ORDER: ClienteFormTab[] = ["general", "contacto", "more"];

const filled = (v: unknown) => String(v ?? "").trim().length > 0;

/**
 * - Error: algún campo de ese paso no pasa la validación.
 * - Completo: lo esencial del paso está capturado (al editar, Contacto y
 *   Domicilio viven en sus libretas y cuentan como completos).
 */
export function clienteStepState(
  formData: Record<string, unknown>,
  errors: ClienteFieldErrors,
  editingSaved: boolean,
): Record<ClienteFormTab, ClienteStepState> {
  const hasError = (tab: ClienteFormTab) =>
    (Object.keys(errors) as (keyof ClienteFieldErrors)[]).some((k) => errors[k] && CLIENTE_FIELD_TAB[k] === tab);

  const telefono = String(formData.telefono ?? "").replace(/\D/g, "");
  const done: Record<ClienteFormTab, boolean> = {
    general: filled(formData.nombre) && telefono.length === 10,
    contacto: editingSaved || filled(formData.contacto_nombre),
    more:
      (filled(formData.razon_social) || filled(formData.regimen_fiscal)) &&
      (editingSaved || filled(formData.direccion) || filled(formData.calle)),
  };

  const out = {} as Record<ClienteFormTab, ClienteStepState>;
  for (const tab of CLIENTE_STEP_ORDER) out[tab] = hasError(tab) ? "error" : done[tab] ? "done" : "idle";
  return out;
}
