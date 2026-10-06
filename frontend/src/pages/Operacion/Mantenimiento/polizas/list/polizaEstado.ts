/**
 * Estado, orden, totales y formato de fechas de las pólizas (funciones puras).
 */
import { daysBetween, proximaVisita, todayIso } from "../shared/polizaVisitas";
import type {
  PolizaAltaValues,
  PolizaEstado,
  PolizaEstadoFiltro,
  PolizaRow,
  PolizaStats,
  PolizaTipo,
} from "./polizaListTypes";

export const TIPO_CCTV: PolizaTipo = "cctv";

export const TIPO_LABEL: Record<PolizaTipo, string> = {
  cctv: "Videovigilancia CCTV",
};

/** Una póliza nueva arranca con una visita por capturar. */
export const EMPTY_POLIZA_VALUES: PolizaAltaValues = {
  clienteId: "",
  tipo: TIPO_CCTV,
  servicioTipo: "",
  equiposAtendidos: "",
  cotizacionId: "",
  visitas: [""],
};

/** Días de anticipación con los que una visita cuenta como «próxima». */
export const DIAS_PROXIMA_VISITA = 30;

export function computePolizaEstado(visitas: string[], today = todayIso()): PolizaEstado {
  const next = proximaVisita(visitas, today);
  if (!next) return visitas.some(Boolean) ? "vencida" : "vigente";
  const delta = daysBetween(today, next);
  return delta != null && delta <= DIAS_PROXIMA_VISITA ? "proxima_visita" : "vigente";
}

export const ESTADO_LABEL: Record<PolizaEstado, string> = {
  vigente: "Vigente",
  proxima_visita: "Próxima visita",
  vencida: "Vencida",
};

export function estadoPolizaLabel(estado: PolizaEstado): string {
  return ESTADO_LABEL[estado];
}

const ESTADO_RANK: Record<PolizaEstado, number> = { vencida: 0, proxima_visita: 1, vigente: 2 };

/**
 * Orden de trabajo: vencidas → próximas (la más cercana primero) → vigentes.
 * Entre vencidas, la que venció hace menos va arriba.
 */
export function sortPolizasPorUrgencia(rows: PolizaRow[], today = todayIso()): PolizaRow[] {
  const key = (r: PolizaRow) => proximaVisita(r.visitas, today) || r.visitas[r.visitas.length - 1] || "";
  return [...rows].sort((a, b) => {
    const rank = ESTADO_RANK[a.estado] - ESTADO_RANK[b.estado];
    if (rank !== 0) return rank;
    const ka = key(a);
    const kb = key(b);
    if (a.estado === "vencida") return kb.localeCompare(ka);
    return ka.localeCompare(kb) || b.idx - a.idx;
  });
}

export function filtrarPorEstado(rows: PolizaRow[], filtro: PolizaEstadoFiltro): PolizaRow[] {
  return filtro === "todas" ? rows : rows.filter((r) => r.estado === filtro);
}

export function computePolizaStats(rows: PolizaRow[]): PolizaStats {
  const stats: PolizaStats = { total: rows.length, vigentes: 0, proximaVisita: 0, vencidas: 0 };
  for (const r of rows) {
    if (r.estado === "vigente") stats.vigentes += 1;
    else if (r.estado === "proxima_visita") stats.proximaVisita += 1;
    else stats.vencidas += 1;
  }
  return stats;
}

export function valuesFromRow(row: PolizaRow): PolizaAltaValues {
  return {
    clienteId: row.clienteId,
    tipo: row.tipo,
    servicioTipo: row.servicioTipo,
    equiposAtendidos: row.equiposAtendidos,
    cotizacionId: row.cotizacionId,
    visitas: row.visitas.length ? [...row.visitas] : [""],
  };
}

export function nextPolizaIdx(rows: PolizaRow[]): number {
  return rows.reduce((acc, row) => Math.max(acc, row.idx), 10000) + 1;
}

/* ---------------------------------- Fechas --------------------------------- */

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function partes(iso: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  return y && m && d ? { y, m, d } : null;
}

/** 20/04/2026 */
export function formatPolizaFecha(iso: string): string {
  const p = partes(iso);
  if (!p) return "—";
  return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
}

/** 20 abr 2026 (o 20 abr si es del año en curso). */
export function formatFechaCorta(iso: string, today = todayIso()): string {
  const p = partes(iso);
  if (!p) return "—";
  const anio = p.y === Number(today.slice(0, 4)) ? "" : ` ${p.y}`;
  return `${p.d} ${MESES_CORTOS[p.m - 1]}${anio}`;
}

export function diaSemanaCorto(iso: string): string {
  const p = partes(iso);
  return p ? DIAS_CORTOS[new Date(p.y, p.m - 1, p.d).getDay()] : "";
}

export function mesCorto(iso: string): string {
  const p = partes(iso);
  return p ? MESES_CORTOS[p.m - 1] : "";
}

/** «hoy», «mañana», «en 5 días», «hace 3 días». */
export function fechaRelativa(iso: string, today = todayIso()): string {
  const delta = daysBetween(today, iso);
  if (delta == null) return "";
  if (delta === 0) return "hoy";
  if (delta === 1) return "mañana";
  if (delta === -1) return "ayer";
  return delta > 0 ? `en ${delta} días` : `hace ${-delta} días`;
}
