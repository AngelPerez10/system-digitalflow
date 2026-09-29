/** Llamadas de reasignación del tablero Equipo que no viven en otro módulo. */
import { fetchApi } from "@/config/api";
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import type { ProyectoApiError } from "../../Proyectos/shared/proyectoApi";

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = String((err as ProyectoApiError).message || "").trim();
    if (m) return m;
  }
  return fallback;
}

/** Cambia el técnico y/o el día de una orden (solo se envía lo que cambia). */
export async function patchOrdenEquipo(
  id: number,
  cambios: { tecnico_asignado?: number | null; fecha_inicio?: string | null }
): Promise<Partial<Orden>> {
  const res = await fetchApi(`/api/ordenes/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const detail = data && typeof data.detail === "string" ? data.detail : null;
    const campo = (k: string) => (data && Array.isArray(data[k]) ? String((data[k] as unknown[])[0]) : null);
    throw { message: detail || campo("tecnico_asignado") || campo("fecha_inicio") || "No se pudo guardar el cambio de la orden." };
  }
  return (data ?? {}) as Partial<Orden>;
}
