/**
 * Lógica pura del listado de reportes de mantenimiento: mes, búsqueda, filtros
 * por técnico / evidencia, secciones y métricas. Sin React, con pruebas.
 *
 * Igual que Órdenes y Proyectos, el listado muestra un mes a la vez; con una
 * búsqueda de 2 o más caracteres se busca en todos los meses.
 */
import { FOLIO_SERIE, formatDocumentFolio, matchesDocumentFolio } from "@/utils/documentFolio";
import { countReporteFotos, type ReporteMantenimiento } from "../reporteTypes";
import { splitTecnicos } from "../reporteTecnicos";

export type EvidenciaFiltro = "" | "con" | "sin";

export type ReporteFiltros = {
  q: string;
  /** `YYYY-MM` del mes visible. */
  mes: string;
  /** Día exacto (`YYYY-MM-DD`) o vacío; con día elegido se ignora el mes. */
  fecha: string;
  /** Nombre exacto del técnico, o vacío para todos. */
  tecnico: string;
  evidencia: EvidenciaFiltro;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function mesActual(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function folioDe(row: Pick<ReporteMantenimiento, "folio" | "idx">): string {
  return row.folio || formatDocumentFolio(FOLIO_SERIE.reporte, row.idx);
}

/** `2026-09-30` → «30 sep 2026». */
export function formatFechaCorta(iso: string): string {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || !m || !d || mi < 0 || mi > 11) return iso || "—";
  return `${Number(d)} ${MESES[mi]} ${y}`;
}

/** La búsqueda se considera activa con 2 o más caracteres (y recorre todos los meses). */
export function busquedaActiva(q: string): boolean {
  return q.trim().length >= 2;
}

function matchesSearch(row: ReporteMantenimiento, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    matchesDocumentFolio(row.folio, term) ||
    matchesDocumentFolio(row.orden_folio, term) ||
    row.tecnico_nombre.toLowerCase().includes(term) ||
    row.orden_cliente.toLowerCase().includes(term) ||
    row.fecha_servicio.includes(term)
  );
}

export function tieneEvidencia(row: ReporteMantenimiento): boolean {
  return countReporteFotos(row.secciones) > 0;
}

/** Base del listado antes de segmentar por evidencia: mes (o todos si hay búsqueda), búsqueda y técnico. */
export function baseDelListado(rows: ReporteMantenimiento[], f: Pick<ReporteFiltros, "q" | "mes" | "tecnico" | "fecha">): ReporteMantenimiento[] {
  const buscando = busquedaActiva(f.q);
  const tec = f.tecnico.trim().toLowerCase();
  return rows.filter((row) => {
    if (f.fecha && !row.fecha_servicio.startsWith(f.fecha)) return false;
    if (!f.fecha && !buscando && f.mes && !row.fecha_servicio.startsWith(`${f.mes}-`)) return false;
    if (buscando && !matchesSearch(row, f.q)) return false;
    if (tec && !splitTecnicos(row.tecnico_nombre).some((n) => n.toLowerCase() === tec)) return false;
    return true;
  });
}

export function filtrarPorEvidencia(rows: ReporteMantenimiento[], evidencia: EvidenciaFiltro): ReporteMantenimiento[] {
  if (!evidencia) return rows;
  return rows.filter((r) => tieneEvidencia(r) === (evidencia === "con"));
}

/** Más recientes primero (fecha de servicio y, a igualdad, folio). */
export function ordenarReportes(rows: ReporteMantenimiento[]): ReporteMantenimiento[] {
  return [...rows].sort((a, b) => b.fecha_servicio.localeCompare(a.fecha_servicio) || b.idx - a.idx);
}

export type SeccionReportes = { key: "CON" | "SIN"; label: string; rows: ReporteMantenimiento[] };

/** Secciones del listado: con evidencia primero, sin evidencia después (sin secciones vacías). */
export function seccionesPorEvidencia(rows: ReporteMantenimiento[]): SeccionReportes[] {
  const con = rows.filter(tieneEvidencia);
  const sin = rows.filter((r) => !tieneEvidencia(r));
  const out: SeccionReportes[] = [];
  if (con.length) out.push({ key: "CON", label: "Con evidencia", rows: con });
  if (sin.length) out.push({ key: "SIN", label: "Sin evidencia", rows: sin });
  return out;
}

/** Técnicos que aparecen en los reportes, con su número de reportes (más activos primero). */
export function tecnicosDeReportes(rows: ReporteMantenimiento[]): { nombre: string; total: number }[] {
  const map = new Map<string, { nombre: string; total: number }>();
  for (const row of rows) {
    for (const nombre of splitTecnicos(row.tecnico_nombre)) {
      const key = nombre.toLowerCase();
      const prev = map.get(key);
      if (prev) prev.total += 1;
      else map.set(key, { nombre, total: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
}

/** Filtros del popover (técnico y día); la evidencia vive en la barra segmentada. */
export function filtrosSecundarios(f: Pick<ReporteFiltros, "tecnico" | "fecha">): number {
  return (f.tecnico ? 1 : 0) + (f.fecha ? 1 : 0);
}

export type ResumenReportes = {
  total: number;
  conEvidencia: number;
  sinEvidencia: number;
  totalFotos: number;
  tecnicos: number;
};

export function resumenReportes(rows: ReporteMantenimiento[]): ResumenReportes {
  let totalFotos = 0;
  let conEvidencia = 0;
  const tecnicos = new Set<string>();
  for (const row of rows) {
    const fotos = countReporteFotos(row.secciones);
    totalFotos += fotos;
    if (fotos > 0) conEvidencia += 1;
    for (const n of splitTecnicos(row.tecnico_nombre)) tecnicos.add(n.toLowerCase());
  }
  return { total: rows.length, conEvidencia, sinEvidencia: rows.length - conEvidencia, totalFotos, tecnicos: tecnicos.size };
}
