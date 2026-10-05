/**
 * Filtros y secciones del listado de cuentas Wialon.
 *
 * Secciones (en este orden): bloqueadas → sin unidades asignadas → con
 * unidades. Una cuenta bloqueada sin unidades se queda en «Bloqueadas».
 */
import type { WialonUnitSearchEntry, WialonUserRow } from "./wialonTypes";

export type CaaEstadoFiltro = "todas" | "activas" | "bloqueadas";
export type CaaUnidadesFiltro = "todas" | "con" | "sin";

export type CaaFiltros = {
  estado: CaaEstadoFiltro;
  unidades: CaaUnidadesFiltro;
  soloDistribuidores: boolean;
};

export const CAA_FILTROS_DEFAULT: CaaFiltros = { estado: "todas", unidades: "todas", soloDistribuidores: false };

export type CaaSeccionKey = "bloqueadas" | "sin_unidades" | "con_unidades";

export type CaaSeccion = { key: CaaSeccionKey; label: string; hint: string; rows: WialonUserRow[] };

const SECCIONES: { key: CaaSeccionKey; label: string; hint: string }[] = [
  { key: "bloqueadas", label: "Bloqueadas", hint: "Sin acceso a la plataforma" },
  { key: "sin_unidades", label: "Sin unidades", hint: "Activas, sin ninguna unidad asignada" },
  { key: "con_unidades", label: "Con unidades", hint: "Activas con flota asignada" },
];

export function esBloqueada(r: Pick<WialonUserRow, "status">): boolean {
  return r.status === "Bloqueado";
}

export function unidadesDe(r: Pick<WialonUserRow, "assigned_units">): number {
  const n = Number(r.assigned_units);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function seccionDe(r: WialonUserRow): CaaSeccionKey {
  if (esBloqueada(r)) return "bloqueadas";
  return unidadesDe(r) === 0 ? "sin_unidades" : "con_unidades";
}

/** Cuántos filtros difieren del valor por defecto (para el contador del botón). */
export function filtrosActivos(f: CaaFiltros): number {
  return Number(f.estado !== "todas") + Number(f.unidades !== "todas") + Number(f.soloDistribuidores);
}

export function pasaFiltros(r: WialonUserRow, f: CaaFiltros): boolean {
  if (f.estado === "activas" && esBloqueada(r)) return false;
  if (f.estado === "bloqueadas" && !esBloqueada(r)) return false;
  if (f.unidades === "con" && unidadesDe(r) === 0) return false;
  if (f.unidades === "sin" && unidadesDe(r) > 0) return false;
  if (f.soloDistribuidores && r.dealer_rights !== "Sí") return false;
  return true;
}

function porNombre(a: WialonUserRow, b: WialonUserRow): number {
  return (a.name || a.user_id || "").localeCompare(b.name || b.user_id || "", "es", { sensitivity: "base" });
}

/** Agrupa en secciones (solo las que tienen filas), cada una ordenada por nombre. */
export function agruparCuentas(rows: WialonUserRow[]): CaaSeccion[] {
  const map: Record<CaaSeccionKey, WialonUserRow[]> = { bloqueadas: [], sin_unidades: [], con_unidades: [] };
  for (const r of rows) map[seccionDe(r)].push(r);
  return SECCIONES.map((s) => ({ ...s, rows: map[s.key].sort(porNombre) })).filter((s) => s.rows.length > 0);
}

/* --------------------------------------------------------------------------
   Unidades: secciones Inactivas → Sin cuenta → Activas.
   Una unidad inactiva sin cuenta se queda en «Inactivas».
   -------------------------------------------------------------------------- */

export type CaaUnidadSeccionKey = "inactivas" | "sin_cuenta" | "activas";

export type CaaUnidadSeccion = { key: CaaUnidadSeccionKey; label: string; hint: string; rows: WialonUnitSearchEntry[] };

const SECCIONES_UNIDAD: { key: CaaUnidadSeccionKey; label: string; hint: string }[] = [
  { key: "inactivas", label: "Inactivas", hint: "Sin servicio activo en Wialon" },
  { key: "sin_cuenta", label: "Sin cuenta", hint: "Activas, sin ninguna cuenta asignada" },
  { key: "activas", label: "Activas", hint: "Con servicio y cuenta asignada" },
];

export function unidadActiva(u: Pick<WialonUnitSearchEntry, "status" | "is_active">): boolean {
  if (u.status === "Activo") return true;
  if (u.status === "Inactivo") return false;
  return u.is_active !== false;
}

export function seccionDeUnidad(u: WialonUnitSearchEntry): CaaUnidadSeccionKey {
  if (!unidadActiva(u)) return "inactivas";
  return (u.users?.length ?? 0) === 0 ? "sin_cuenta" : "activas";
}

/** Agrupa unidades en secciones (solo las que tienen filas); conserva el orden recibido. */
export function agruparUnidades(rows: WialonUnitSearchEntry[]): CaaUnidadSeccion[] {
  const map: Record<CaaUnidadSeccionKey, WialonUnitSearchEntry[]> = { inactivas: [], sin_cuenta: [], activas: [] };
  for (const u of rows) map[seccionDeUnidad(u)].push(u);
  return SECCIONES_UNIDAD.map((s) => ({ ...s, rows: map[s.key] })).filter((s) => s.rows.length > 0);
}
