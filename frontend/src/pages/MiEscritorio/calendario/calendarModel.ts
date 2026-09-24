/**
 * Lógica pura del calendario: órdenes y proyectos como un solo tipo de
 * elemento, estados unificados, filtros, agenda y clasificación de pendientes.
 * Sin React ni FullCalendar (ver calendarModel.test.ts).
 */
import { displayOrdenFolio } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { displayProyectoFolio, filledFechasInicio } from "@/pages/Operacion/Proyectos/shared/proyectoFormUtils";
import { proyectoTeam, proyectoTiposLabels } from "@/pages/Operacion/Proyectos/shared/proyectoListUtils";
import type { ProyectoRow } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";

export type CalendarOrden = {
  id: number;
  idx?: number | null;
  folio?: string | null;
  cliente?: string | null;
  nombre_cliente?: string | null;
  direccion?: string | null;
  tecnico_asignado?: number | null;
  tecnico_asignado_full_name?: string | null;
  tecnico_asignado_username?: string | null;
  fecha_inicio?: string | null;
  hora_inicio?: string | null;
  fecha_finalizacion?: string | null;
  hora_termino?: string | null;
  fecha_creacion?: string | null;
  status?: string | null;
  problematica?: string | null;
};

export type ItemKind = "orden" | "proyecto";

/**
 * Estado unificado. Órdenes: pendiente/pausado/resuelto/cancelada.
 * Proyectos: en_proceso → pendiente, pausado, cerrado → resuelto, cancelado → cancelada.
 */
export type ItemStatus = "pendiente" | "pausado" | "resuelto" | "cancelada";
/** @deprecated Alias histórico. */
export type OrdenStatus = ItemStatus;

export const ITEM_STATUSES: ItemStatus[] = ["pendiente", "pausado", "resuelto", "cancelada"];
export const ORDEN_STATUSES = ITEM_STATUSES;

/** Etiquetas por tipo: un proyecto «en proceso» no es una orden «pendiente». */
export const STATUS_LABEL: Record<ItemKind, Record<ItemStatus, string>> = {
  orden: { pendiente: "Pendiente", pausado: "Pausada", resuelto: "Resuelta", cancelada: "Cancelada" },
  proyecto: { pendiente: "En proceso", pausado: "Pausado", resuelto: "Cerrado", cancelada: "Cancelado" },
};

export const STATUS_META: Record<ItemStatus, { label: string; plural: string }> = {
  pendiente: { label: "Por atender", plural: "Por atender" },
  pausado: { label: "Pausado", plural: "Pausados" },
  resuelto: { label: "Terminado", plural: "Terminados" },
  cancelada: { label: "Cancelado", plural: "Cancelados" },
};

export const KIND_META: Record<ItemKind, { label: string; plural: string }> = {
  orden: { label: "Orden", plural: "Órdenes" },
  proyecto: { label: "Proyecto", plural: "Proyectos" },
};

export type CalendarItem = {
  id: string;
  kind: ItemKind;
  /** id numérico del registro (orden o proyecto). */
  recordId: number;
  folio: string;
  cliente: string;
  tecnico: string;
  direccion: string;
  /** Problemática (orden) o tipos de trabajo (proyecto). */
  descripcion: string;
  status: ItemStatus;
  /** `YYYY-MM-DD` inclusivo. */
  start: string;
  /** `YYYY-MM-DD` inclusivo. */
  end: string;
  horaInicio: string;
  horaTermino: string;
  /** 0–100 (solo proyectos). */
  avance: number | null;
};

export function normalizeStatus(raw: string | null | undefined): ItemStatus {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "resuelto" || s === "cerrado") return "resuelto";
  if (s === "pausado") return "pausado";
  if (s === "cancelada" || s === "cancelado") return "cancelada";
  return "pendiente";
}

/** `YYYY-MM-DD` en hora local. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Suma días a una fecha `YYYY-MM-DD` sin pasar por UTC. */
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
}

function dateKey(raw: string | null | undefined): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(raw || ""));
  return m ? m[1] : "";
}

function hhmm(raw: string | null | undefined): string {
  const m = /^(\d{2}):(\d{2})/.exec(String(raw || ""));
  return m ? `${m[1]}:${m[2]}` : "";
}

export function ordenToItem(o: CalendarOrden): CalendarItem | null {
  const start = dateKey(o.fecha_inicio) || dateKey(o.fecha_creacion);
  if (!start) return null;
  let end = dateKey(o.fecha_finalizacion) || start;
  if (end < start) end = start;
  return {
    id: `orden-${o.id}`,
    kind: "orden",
    recordId: o.id,
    folio: displayOrdenFolio(o),
    cliente: String(o.cliente || o.nombre_cliente || "").trim() || "Sin cliente",
    tecnico: String(o.tecnico_asignado_full_name || o.tecnico_asignado_username || "").trim(),
    direccion: String(o.direccion || "").trim(),
    descripcion: String(o.problematica || "").trim(),
    status: normalizeStatus(o.status),
    start,
    end,
    horaInicio: hhmm(o.hora_inicio),
    horaTermino: hhmm(o.hora_termino),
    avance: null,
  };
}

/** Periodo del proyecto: sus jornadas de campo; si no tiene, la fecha de autorización. */
export function proyectoToItem(row: ProyectoRow): CalendarItem | null {
  const recordId = Number(row.id);
  if (!Number.isFinite(recordId)) return null;
  const jornadas = filledFechasInicio(row.draft?.fechasInicio ?? []);
  const start = jornadas[0] || dateKey(row.fecha) || dateKey(row.draft?.fechaAutorizacion);
  if (!start) return null;
  const end = jornadas.length ? jornadas[jornadas.length - 1] : start;
  const team = proyectoTeam(row);
  return {
    id: `proyecto-${recordId}`,
    kind: "proyecto",
    recordId,
    folio: displayProyectoFolio(row.folio),
    cliente: String(row.cliente || "").trim() || "Sin cliente",
    tecnico: team.responsable?.nombre ?? "",
    direccion: "",
    descripcion: proyectoTiposLabels(row).join(" · "),
    status: normalizeStatus(row.estado),
    start,
    end: end < start ? start : end,
    horaInicio: hhmm(row.draft?.horaLlegada),
    horaTermino: hhmm(row.draft?.horaSalida),
    avance: Math.round(Number(row.draft?.porcentajeAvance) || 0),
  };
}

export function statusLabel(item: Pick<CalendarItem, "kind" | "status">): string {
  return STATUS_LABEL[item.kind][item.status];
}

/** ¿Sigue requiriendo trabajo? (por atender o pausado). */
export function isOpen(item: Pick<CalendarItem, "status">): boolean {
  return item.status === "pendiente" || item.status === "pausado";
}

/** ¿El evento toca el rango `[from, toExclusive)`? */
export function overlapsRange(item: Pick<CalendarItem, "start" | "end">, from: string, toExclusive: string): boolean {
  return item.start < toExclusive && item.end >= from;
}

export function countByStatus(items: CalendarItem[]): Record<ItemStatus, number> {
  const c: Record<ItemStatus, number> = { pendiente: 0, pausado: 0, resuelto: 0, cancelada: 0 };
  for (const it of items) c[it.status] += 1;
  return c;
}

export function countByKind(items: CalendarItem[]): Record<ItemKind, number> {
  const c: Record<ItemKind, number> = { orden: 0, proyecto: 0 };
  for (const it of items) c[it.kind] += 1;
  return c;
}

export type PendientesBuckets = {
  /** Abiertos cuya fecha de término ya pasó (vencido más reciente primero). */
  atrasados: CalendarItem[];
  /** Abiertos que tocan hoy. */
  hoy: CalendarItem[];
  /** Abiertos que empiezan en los próximos `dias` días (sin contar hoy). */
  proximos: CalendarItem[];
};

/** Clasifica lo pendiente respecto a hoy: lo que el usuario debe atender primero. */
export function pendientesBuckets(items: CalendarItem[], today: Date = new Date(), dias = 7): PendientesBuckets {
  const t = toDateKey(today);
  const limite = addDaysKey(t, dias);
  const atrasados: CalendarItem[] = [];
  const hoy: CalendarItem[] = [];
  const proximos: CalendarItem[] = [];
  for (const it of items) {
    if (!isOpen(it)) continue;
    if (it.end < t) atrasados.push(it);
    else if (it.start <= t) hoy.push(it);
    else if (it.start <= limite) proximos.push(it);
  }
  const byStart = (a: CalendarItem, b: CalendarItem) =>
    a.start.localeCompare(b.start) || (a.horaInicio || "99").localeCompare(b.horaInicio || "99") || a.folio.localeCompare(b.folio);
  // Atrasados: primero lo que venció más recientemente (lo más accionable).
  atrasados.sort((a, b) => b.end.localeCompare(a.end) || a.folio.localeCompare(b.folio));
  hoy.sort(byStart);
  proximos.sort(byStart);
  return { atrasados, hoy, proximos };
}

/** Días completos de atraso respecto a hoy (0 si no está atrasado). */
export function diasAtraso(item: Pick<CalendarItem, "end">, today: Date = new Date()): number {
  const [y, m, d] = item.end.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((t.getTime() - end.getTime()) / 86_400_000));
}

export type AgendaDay = { key: string; items: CalendarItem[] };

/**
 * Agrupa por día dentro del rango visible. Un evento de varios días aparece
 * en su primer día visible (no se repite en cada jornada).
 */
export function groupAgenda(items: CalendarItem[], from: string, toExclusive: string): AgendaDay[] {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) {
    if (!overlapsRange(it, from, toExclusive)) continue;
    const key = it.start < from ? from : it.start;
    const list = map.get(key);
    if (list) list.push(it);
    else map.set(key, [it]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      items: list.sort((a, b) => (a.horaInicio || "99").localeCompare(b.horaInicio || "99") || a.folio.localeCompare(b.folio)),
    }));
}

export function dayLabel(key: string, today: Date = new Date()): string {
  const t = toDateKey(today);
  if (key === t) return "Hoy";
  if (key === addDaysKey(t, 1)) return "Mañana";
  if (key === addDaysKey(t, -1)) return "Ayer";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" }).replace(/\./g, "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function rangeLabel(item: Pick<CalendarItem, "start" | "end">): string {
  const fmt = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(/\./g, "");
  };
  return item.start === item.end ? fmt(item.start) : `${fmt(item.start)} – ${fmt(item.end)}`;
}

/** Rutas de destino según el tipo. */
export function itemPaths(item: Pick<CalendarItem, "kind" | "recordId">): { list: string; pdf: string } {
  return item.kind === "orden"
    ? { list: "/ordenes", pdf: `/ordenes/${item.recordId}/pdf` }
    : { list: "/proyectos", pdf: `/proyectos/${item.recordId}/pdf` };
}
