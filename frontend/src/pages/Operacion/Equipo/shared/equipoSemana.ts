/**
 * Semana del tablero Equipo (lógica pura): fechas de lunes a domingo, qué
 * órdenes/proyectos caen en la semana y cómo se reparten en tarjetas por
 * técnico y día.
 */
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { filledFechasInicio } from "../../Proyectos/shared/proyectoFormUtils";
import { proyectoRowFecha } from "../../Proyectos/shared/proyectoListUtils";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { columnKey, itemKey } from "./equipoDnd";
import { ordenAbierta, proyectoActivo, type EquipoSeccion, type EquipoTecnico } from "./equipoGrouping";

/* --------------------------------------------------------------------------
   Fechas (hora local, formato `YYYY-MM-DD`)
   -------------------------------------------------------------------------- */

export function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toYmd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

/** Lunes de la semana que contiene `ymd`. */
export function lunesDe(ymd: string): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toYmd(d);
}

/** Días de `a` a `b` (negativo si `b` es anterior). */
export function diffDias(a: string, b: string): number {
  const da = parseYmd(a);
  const db = parseYmd(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** 0 = lunes … 6 = domingo. */
export function diaSemana(ymd: string): number {
  const d = parseYmd(ymd);
  return d ? (d.getDay() + 6) % 7 : 0;
}

/** Los 7 días (lun → dom) de la semana que empieza en `lunes`. */
export function diasDeSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
}

/** Meses `YYYY-MM` que toca la semana (uno o dos). */
export function mesesDeSemana(lunes: string): string[] {
  return [...new Set([lunes.slice(0, 7), addDays(lunes, 6).slice(0, 7)])];
}

export function enSemana(ymd: string, lunes: string): boolean {
  return !!ymd && ymd >= lunes && ymd <= addDays(lunes, 6);
}

/* --------------------------------------------------------------------------
   Fechas de los trabajos
   -------------------------------------------------------------------------- */

/** Misma regla que el backend: `fecha_inicio`, o la de creación si no hay. */
export function ordenFecha(orden: Pick<Orden, "fecha_inicio" | "fecha_creacion">): string {
  const f = String(orden.fecha_inicio || orden.fecha_creacion || "").slice(0, 10);
  return parseYmd(f) ? f : "";
}

/**
 * Días de trabajo de un proyecto: las jornadas programadas (`fechasInicio`);
 * si no tiene, la fecha del proyecto (autorización).
 */
export function proyectoFechas(row: ProyectoRow): string[] {
  const jornadas = [...new Set(filledFechasInicio(row.draft?.fechasInicio ?? []))].filter((f) => parseYmd(f));
  if (jornadas.length) return jornadas;
  const f = proyectoRowFecha(row);
  return parseYmd(f) ? [f] : [];
}

/**
 * Jornadas del proyecto recorridas al mover una tarjeta de `desde` a `hasta`:
 * todas se desplazan los mismos días (el proyecto conserva su duración).
 */
export function recorrerJornadas(row: ProyectoRow, desde: string, hasta: string): string[] {
  const delta = diffDias(desde, hasta);
  return proyectoFechas(row).map((f) => addDays(f, delta));
}

export function proyectoEnSemana(row: ProyectoRow, lunes: string): boolean {
  return proyectoFechas(row).some((f) => enSemana(f, lunes));
}

/* --------------------------------------------------------------------------
   Tarjetas
   -------------------------------------------------------------------------- */

type TarjetaBase = {
  /**
   * Llave del trabajo en la columna del técnico (tipo + id + columna). Un
   * proyecto de varios días comparte `key` en todas sus tarjetas: se
   * arrastra y se resalta como uno solo.
   */
  key: string;
  /** Llave única de la tarjeta (incluye el día). */
  uid: string;
  fecha: string;
  abierta: boolean;
  cliente: string;
  tecnico: EquipoTecnico;
};

export type EquipoTarjeta =
  | (TarjetaBase & { kind: "orden"; orden: Orden })
  | (TarjetaBase & {
      kind: "proyecto";
      row: ProyectoRow;
      /** Jornada de este día dentro del proyecto (p. ej. día 2 de 4). */
      jornada: { n: number; total: number } | null;
    });

const porCliente = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

/** En un día: abiertas primero, órdenes antes que proyectos, luego por cliente. */
function compararTarjetas(a: EquipoTarjeta, b: EquipoTarjeta): number {
  const open = Number(b.abierta) - Number(a.abierta);
  if (open !== 0) return open;
  if (a.kind !== b.kind) return a.kind === "orden" ? -1 : 1;
  return porCliente(a.cliente, b.cliente);
}

/** Tarjetas de un técnico repartidas en los 7 días de la semana. */
export function tarjetasPorDia(seccion: EquipoSeccion, lunes: string): EquipoTarjeta[][] {
  const col = columnKey(seccion.tecnico.id);
  const dias: EquipoTarjeta[][] = Array.from({ length: 7 }, () => []);
  for (const orden of seccion.ordenes) {
    const fecha = ordenFecha(orden);
    if (!enSemana(fecha, lunes)) continue;
    const key = itemKey("orden", orden.id, col);
    dias[diaSemana(fecha)].push({
      kind: "orden",
      key,
      uid: key,
      fecha,
      abierta: ordenAbierta(orden),
      cliente: orden.cliente || "",
      tecnico: seccion.tecnico,
      orden,
    });
  }
  for (const row of seccion.proyectos) {
    const fechas = proyectoFechas(row);
    const key = itemKey("proyecto", row.id, col);
    fechas.forEach((fecha, i) => {
      if (!enSemana(fecha, lunes)) return;
      dias[diaSemana(fecha)].push({
        kind: "proyecto",
        key,
        uid: `${key}#${fecha}`,
        fecha,
        abierta: proyectoActivo(row),
        cliente: row.cliente || "",
        tecnico: seccion.tecnico,
        row,
        jornada: fechas.length > 1 ? { n: i + 1, total: fechas.length } : null,
      });
    });
  }
  return dias.map((d) => d.sort(compararTarjetas));
}

export type EquipoResumenSemana = {
  trabajos: number;
  ordenes: number;
  proyectos: number;
  abiertos: number;
  cerrados: number;
  sinAsignar: number;
  tecnicosConTrabajo: number;
  tecnicos: number;
  /** Trabajos únicos por día (lun → dom). */
  porDia: number[];
};

/** Totales de la semana; un proyecto con varios técnicos cuenta una vez. */
export function resumenSemana(secciones: EquipoSeccion[], lunes: string): EquipoResumenSemana {
  const todos = new Set<string>();
  const ordenes = new Set<string>();
  const proyectos = new Set<string>();
  const abiertos = new Set<string>();
  const sinAsignar = new Set<string>();
  const porDia = Array.from({ length: 7 }, () => new Set<string>());
  let tecnicosConTrabajo = 0;
  let tecnicos = 0;

  for (const s of secciones) {
    if (s.tecnico.id != null) tecnicos += 1;
    let tiene = false;
    for (const dia of tarjetasPorDia(s, lunes)) {
      for (const t of dia) {
        const id = t.kind === "orden" ? `o${t.orden.id}` : `p${t.row.id}`;
        tiene = true;
        todos.add(id);
        (t.kind === "orden" ? ordenes : proyectos).add(id);
        if (t.abierta) abiertos.add(id);
        if (s.tecnico.id == null && t.abierta) sinAsignar.add(id);
        porDia[diaSemana(t.fecha)].add(id);
      }
    }
    if (tiene && s.tecnico.id != null) tecnicosConTrabajo += 1;
  }

  return {
    trabajos: todos.size,
    ordenes: ordenes.size,
    proyectos: proyectos.size,
    abiertos: abiertos.size,
    cerrados: todos.size - abiertos.size,
    sinAsignar: sinAsignar.size,
    tecnicosConTrabajo,
    tecnicos,
    porDia: porDia.map((d) => d.size),
  };
}

/* --------------------------------------------------------------------------
   Etiquetas
   -------------------------------------------------------------------------- */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** «22 – 28 sep 2026», «29 sep – 5 oct 2026», «29 dic 2025 – 4 ene 2026». */
export function rangoSemana(lunes: string): string {
  const a = parseYmd(lunes);
  const b = parseYmd(addDays(lunes, 6));
  if (!a || !b) return "";
  if (a.getFullYear() !== b.getFullYear())
    return `${a.getDate()} ${MESES[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MESES[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} – ${b.getDate()} ${MESES[b.getMonth()]} ${b.getFullYear()}`;
}

/** Número de semana ISO 8601 (la semana del jueves). */
export function semanaIso(lunes: string): number {
  const jueves = parseYmd(addDays(lunes, 3));
  if (!jueves) return 0;
  const inicioAnio = new Date(jueves.getFullYear(), 0, 1);
  // `round`: un cambio de horario deja la diferencia a ±1 h de un día exacto.
  const dias = Math.round((jueves.getTime() - inicioAnio.getTime()) / 86_400_000);
  return Math.floor(dias / 7) + 1;
}
