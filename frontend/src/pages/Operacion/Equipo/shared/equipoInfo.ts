/**
 * Datos de presentación de un trabajo (orden o proyecto) para el tablero y la
 * bandeja «Sin asignar»: un mismo formato para los dos tipos, sin JSX.
 */
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { getOrdenPrioridadSectionStyles, ordenPrioridadListBadge } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenPrioridadSections";
import { displayOrdenFolio } from "../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { displayProyectoFolio } from "../../Proyectos/shared/proyectoFormUtils";
import { proyectoTeam, proyectoTiposLabels } from "../../Proyectos/shared/proyectoListUtils";
import { toneForEstado } from "../../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { ordenTone } from "./equipoTokens";

export type EquipoInfo = {
  folio: string;
  cliente: string;
  estadoLabel: string;
  estadoDot: string;
  estadoPill: string;
  /** Sucursal (orden). */
  sucursal: string;
  /** Domicilio (orden). */
  direccion: string;
  /** «09:00 – 11:30», «09:00» o vacío. */
  horario: string;
  /** Servicios de la orden o tipos de trabajo del proyecto. */
  servicios: string[];
  /** Problemática (orden) o incidencias (proyecto). */
  detalle: string;
  /** «Problemática» u «Incidencias», según el tipo. */
  detalleLabel: string;
  /** Comentario del técnico (orden) o nota de bitácora de la jornada (proyecto). */
  comentario: string;
  telefono: string;
  /** Persona de contacto en sitio. */
  contacto: string;
  prio: { label: string; title: string; dot: string } | null;
  /** Avance 0–100 (proyecto) o `null`. */
  avance: number | null;
  avanceBar: string;
  /** Equipos instalados / total (proyecto con equipos). */
  equipos: { instalados: number; total: number } | null;
  /** Otros integrantes del equipo (proyecto). */
  equipoExtra: number;
  equipoNombres: string;
};

/** «HH:MM:SS» → «HH:MM». */
export function horaCorta(h: unknown): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(h ?? "").trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

export function rangoHoras(a: unknown, b: unknown): string {
  const x = horaCorta(a);
  const y = horaCorta(b);
  if (x && y) return `${x} – ${y}`;
  return x || y;
}

function limpiar(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

export function infoOrden(orden: Orden, abierta: boolean): EquipoInfo {
  const tone = ordenTone(orden.status);
  const prio = ordenPrioridadListBadge(orden);
  return {
    folio: displayOrdenFolio(orden),
    cliente: limpiar(orden.cliente) || "Sin cliente",
    estadoLabel: tone.label,
    estadoDot: tone.dot,
    estadoPill: tone.pill,
    sucursal: limpiar(orden.cliente_direccion_etiqueta),
    direccion: limpiar(orden.direccion),
    horario: rangoHoras(orden.hora_inicio, orden.hora_termino),
    servicios: (Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : []).map(limpiar).filter(Boolean),
    detalle: limpiar(orden.problematica),
    detalleLabel: "Problemática",
    comentario: limpiar(orden.comentario_tecnico),
    telefono: limpiar(orden.telefono_cliente),
    contacto: limpiar(orden.nombre_encargado || orden.nombre_cliente),
    prio: abierta ? { label: prio.visibleLabel, title: prio.title, dot: getOrdenPrioridadSectionStyles(prio.assignedKey).dot } : null,
    avance: null,
    avanceBar: "",
    equipos: null,
    equipoExtra: 0,
    equipoNombres: "",
  };
}

/** Una nota de la bitácora del proyecto con la fecha de su jornada. */
export type EquipoNotaDia = { n: number; fecha: string; nota: string };

/**
 * Bitácora del proyecto: `notasPorDia[i]` corresponde a `fechasInicio[i]`
 * (mismo índice, tal como se capturan en el formulario). Solo notas escritas.
 */
export function bitacoraProyecto(row: ProyectoRow): EquipoNotaDia[] {
  const notas = Array.isArray(row.draft?.notasPorDia) ? row.draft.notasPorDia : [];
  const fechas = Array.isArray(row.draft?.fechasInicio) ? row.draft.fechasInicio : [];
  return notas
    .map((x, i) => ({ n: i + 1, fecha: String(fechas[i] ?? "").slice(0, 10), nota: limpiar(x?.nota) }))
    .filter((x) => x.nota !== "");
}

/**
 * Nota del técnico para una tarjeta de proyecto: la de la jornada de `fecha`
 * o, si ese día no tiene nota (o no se indica día), la última escrita.
 */
export function notaTecnicoProyecto(row: ProyectoRow, fecha?: string | null): string {
  const bitacora = bitacoraProyecto(row);
  if (fecha) {
    const delDia = bitacora.find((x) => x.fecha === fecha);
    if (delDia) return delDia.nota;
  }
  return bitacora[bitacora.length - 1]?.nota ?? "";
}

export function infoProyecto(row: ProyectoRow, tecnicoId: number | null, fecha?: string | null): EquipoInfo {
  const tone = toneForEstado(row.estado);
  const team = proyectoTeam(row).todos.filter((m) => m.id != null && m.id !== tecnicoId);
  const total = Math.max(0, Number(row.equiposTotal) || 0);
  return {
    folio: displayProyectoFolio(row.folio),
    cliente: limpiar(row.cliente) || "Sin cliente",
    estadoLabel: tone.label,
    estadoDot: tone.dot,
    estadoPill: tone.pill,
    sucursal: "",
    direccion: "",
    horario: rangoHoras(row.draft?.horaLlegada, row.draft?.horaSalida),
    servicios: proyectoTiposLabels(row),
    detalle: limpiar(row.draft?.incidencias),
    detalleLabel: "Incidencias",
    comentario: notaTecnicoProyecto(row, fecha),
    telefono: "",
    contacto: "",
    prio: null,
    avance: Math.max(0, Math.min(100, Math.round(Number(row.draft?.porcentajeAvance) || 0))),
    avanceBar: tone.bar,
    equipos: total > 0 ? { instalados: Math.max(0, Number(row.equiposInstalados) || 0), total } : null,
    equipoExtra: team.length,
    equipoNombres: team.map((m) => m.nombre).join(", "),
  };
}
