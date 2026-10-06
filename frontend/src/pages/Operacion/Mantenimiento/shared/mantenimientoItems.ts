/**
 * Lógica pura de la vista Mantenimiento: pólizas y reportes en un solo listado.
 * Sin React, con pruebas.
 *
 * - Cada fila es una póliza o un reporte con campos comunes (folio, cliente,
 *   fecha) para buscar, filtrar y ordenar todo junto.
 * - Orden: primero lo que pide atención (pólizas vencidas y con visita en los
 *   próximos 30 días, por urgencia); después todo lo demás, lo más reciente arriba.
 */
import { matchesDocumentFolio } from "@/utils/documentFolio";
import { estadoPolizaLabel, sortPolizasPorUrgencia } from "../polizas/list/polizaEstado";
import type { PolizaEstado, PolizaRow } from "../polizas/list/polizaListTypes";
import { proximaVisita, todayIso } from "../polizas/shared/polizaVisitas";
import { folioDe, tieneEvidencia } from "../reportes/list/reporteListUtils";
import { splitTecnicos } from "../reportes/reporteTecnicos";
import type { ReporteMantenimiento } from "../reportes/reporteTypes";

export type MantenimientoTipo = "poliza" | "reporte";
export type MantenimientoTipoFiltro = "todo" | MantenimientoTipo;
export type EstadoPolizaFiltro = "" | PolizaEstado;
export type EvidenciaFiltro = "" | "con" | "sin";

export type MantenimientoItem =
  | { kind: "poliza"; key: string; folio: string; cliente: string; fecha: string; row: PolizaRow }
  | { kind: "reporte"; key: string; folio: string; cliente: string; fecha: string; row: ReporteMantenimiento };

export type MantenimientoFiltros = {
  q: string;
  tipo: MantenimientoTipoFiltro;
  estadoPoliza: EstadoPolizaFiltro;
  evidencia: EvidenciaFiltro;
  /** Nombre exacto del técnico (solo reportes), o vacío. */
  tecnico: string;
};

export const FILTROS_VACIOS: MantenimientoFiltros = { q: "", tipo: "todo", estadoPoliza: "", evidencia: "", tecnico: "" };

/** Fecha de una póliza en el listado: su próxima visita o, si ya pasaron todas, la última. */
export function fechaPoliza(row: PolizaRow, today = todayIso()): string {
  return proximaVisita(row.visitas, today) || row.visitas[row.visitas.length - 1] || "";
}

export function buildItems(polizas: PolizaRow[], reportes: ReporteMantenimiento[], today = todayIso()): MantenimientoItem[] {
  return [
    ...polizas.map(
      (row): MantenimientoItem => ({ kind: "poliza", key: `p-${row.id}`, folio: row.folio, cliente: row.cliente, fecha: fechaPoliza(row, today), row }),
    ),
    ...reportes.map(
      (row): MantenimientoItem => ({ kind: "reporte", key: `r-${row.id}`, folio: folioDe(row), cliente: row.orden_cliente, fecha: row.fecha_servicio, row }),
    ),
  ];
}

function polizaCoincide(row: PolizaRow, q: string): boolean {
  return (
    matchesDocumentFolio(row.folio, q) ||
    matchesDocumentFolio(row.cotizacionFolio, q) ||
    row.cliente.toLowerCase().includes(q) ||
    row.servicioTipo.toLowerCase().includes(q) ||
    row.equiposAtendidos.toLowerCase().includes(q) ||
    estadoPolizaLabel(row.estado).toLowerCase().includes(q)
  );
}

function reporteCoincide(row: ReporteMantenimiento, q: string): boolean {
  return (
    matchesDocumentFolio(row.folio, q) ||
    matchesDocumentFolio(folioDe(row), q) ||
    matchesDocumentFolio(row.orden_folio, q) ||
    row.tecnico_nombre.toLowerCase().includes(q) ||
    row.orden_cliente.toLowerCase().includes(q) ||
    row.fecha_servicio.includes(q)
  );
}

/** Búsqueda en ambos tipos (folio, cliente, cotización/origen, técnico, estado). */
export function coincideBusqueda(item: MantenimientoItem, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return item.kind === "poliza" ? polizaCoincide(item.row, term) : reporteCoincide(item.row, term);
}

/**
 * Filtros propios de cada tipo: el estado solo aplica a pólizas y la evidencia /
 * técnico solo a reportes. Si hay un filtro de un tipo, el otro tipo queda fuera.
 */
function coincideFiltrosDeTipo(item: MantenimientoItem, f: MantenimientoFiltros): boolean {
  const dePoliza = f.estadoPoliza !== "";
  const deReporte = f.evidencia !== "" || f.tecnico !== "";
  if (item.kind === "poliza") {
    if (deReporte) return false;
    return !dePoliza || item.row.estado === f.estadoPoliza;
  }
  if (dePoliza) return false;
  if (f.evidencia && tieneEvidencia(item.row) !== (f.evidencia === "con")) return false;
  const tec = f.tecnico.trim().toLowerCase();
  return !tec || splitTecnicos(item.row.tecnico_nombre).some((n) => n.toLowerCase() === tec);
}

/** Todo menos el tipo (sirve para los conteos de «Todo · Pólizas · Reportes»). */
export function filtrarSinTipo(items: MantenimientoItem[], f: MantenimientoFiltros): MantenimientoItem[] {
  return items.filter((it) => coincideBusqueda(it, f.q) && coincideFiltrosDeTipo(it, f));
}

export function filtrarItems(items: MantenimientoItem[], f: MantenimientoFiltros): MantenimientoItem[] {
  return filtrarSinTipo(items, f).filter((it) => f.tipo === "todo" || it.kind === f.tipo);
}

export function contarPorTipo(items: MantenimientoItem[]): { todo: number; poliza: number; reporte: number } {
  const poliza = items.filter((it) => it.kind === "poliza").length;
  return { todo: items.length, poliza, reporte: items.length - poliza };
}

/** Filtros del popover activos (estado, evidencia, técnico). */
export function filtrosSecundariosActivos(f: MantenimientoFiltros): number {
  return Number(f.estadoPoliza !== "") + Number(f.evidencia !== "") + Number(f.tecnico !== "");
}

/** Urgentes primero (pólizas vencidas o con visita cercana); después lo más reciente. */
export function ordenarItems(items: MantenimientoItem[], today = todayIso()): MantenimientoItem[] {
  const urgente = (it: MantenimientoItem) => it.kind === "poliza" && it.row.estado !== "vigente";
  const urgentesRows = sortPolizasPorUrgencia(
    items.filter(urgente).map((it) => it.row as PolizaRow),
    today,
  );
  const porId = new Map(items.filter(urgente).map((it) => [it.row.id, it]));
  const urgentes = urgentesRows.map((r) => porId.get(r.id)!);
  const resto = items
    .filter((it) => !urgente(it))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.row.idx - a.row.idx || a.kind.localeCompare(b.kind));
  return [...urgentes, ...resto];
}

/** Reportes cuyo servicio cae en el mes `YYYY-MM`. */
export function reportesDelMes(reportes: ReporteMantenimiento[], mes: string): number {
  return reportes.filter((r) => r.fecha_servicio.startsWith(`${mes}-`)).length;
}
