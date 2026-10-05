/**
 * «Sin asignar»: órdenes abiertas sin técnico y proyectos activos sin equipo,
 * de cualquier mes cargado (el día de la orden o la primera jornada del proyecto).
 */
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { proyectoTeam } from "../../Proyectos/shared/proyectoListUtils";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { ordenAbierta, ordenTecnicoId, proyectoActivo } from "./equipoGrouping";
import { ordenFecha, proyectoFechas } from "./equipoSemana";

export type EquipoPendiente =
  | { kind: "orden"; id: string; key: string; fecha: string; cliente: string; orden: Orden }
  | { kind: "proyecto"; id: string; key: string; fecha: string; fechas: string[]; cliente: string; row: ProyectoRow };

function proyectoSinEquipo(row: ProyectoRow): boolean {
  return !proyectoTeam(row).todos.some((m) => m.id != null && m.id > 0);
}

/** Pendientes sin técnico de todos los meses, ordenados por día y cliente. */
export function pendientesSinAsignar(ordenes: Orden[], proyectos: ProyectoRow[]): EquipoPendiente[] {
  const out: EquipoPendiente[] = [];
  for (const orden of ordenes) {
    if (ordenTecnicoId(orden) != null || !ordenAbierta(orden)) continue;
    const fecha = ordenFecha(orden);
    if (!fecha) continue;
    out.push({ kind: "orden", id: String(orden.id), key: `orden:${orden.id}`, fecha, cliente: orden.cliente || "", orden });
  }
  for (const row of proyectos) {
    if (!proyectoActivo(row) || !proyectoSinEquipo(row)) continue;
    const fechas = proyectoFechas(row);
    const fecha = [...fechas].sort()[0];
    if (!fecha) continue;
    out.push({ kind: "proyecto", id: String(row.id), key: `proyecto:${row.id}`, fecha, fechas, cliente: row.cliente || "", row });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cliente.localeCompare(b.cliente, "es", { sensitivity: "base" }));
}
