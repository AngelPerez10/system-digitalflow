/** Etiquetas de mes en español (cortas) para gráficas del panel. */
export const MESES_CORTOS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export function normalizeApiList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

export function parseRecordDate(record: Record<string, unknown>, fields: string[]): Date | null {
  for (const field of fields) {
    const raw = record[field];
    if (raw == null || raw === "") continue;
    const d = new Date(String(raw));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function currentYearMonth(): { year: number; month: number; key: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return { year, month, key: `${year}-${String(month + 1).padStart(2, "0")}` };
}

/** Cuenta registros por mes (índice 0–11) para un año dado. */
export function countByMonthInYear(
  items: Record<string, unknown>[],
  year: number,
  dateFields: string[],
  filter?: (item: Record<string, unknown>) => boolean
): number[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const item of items) {
    if (filter && !filter(item)) continue;
    const d = parseRecordDate(item, dateFields);
    if (!d || d.getFullYear() !== year) continue;
    counts[d.getMonth()] += 1;
  }
  return counts;
}

export function countInCurrentMonth(
  items: Record<string, unknown>[],
  dateFields: string[],
  filter?: (item: Record<string, unknown>) => boolean
): number {
  const { year, month } = currentYearMonth();
  let n = 0;
  for (const item of items) {
    if (filter && !filter(item)) continue;
    const d = parseRecordDate(item, dateFields);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) continue;
    n += 1;
  }
  return n;
}

export function isOrdenResuelta(item: Record<string, unknown>): boolean {
  return String(item.status ?? "").toLowerCase() === "resuelto";
}

const COTIZACION_DATE_FIELDS = ["fecha_creacion", "fecha", "fecha_actualizacion"];
const ORDEN_DATE_FIELDS = ["fecha_finalizacion", "fecha_inicio", "fecha_creacion"];

export function buildCotizacionesYearSeries(items: Record<string, unknown>[]) {
  const year = new Date().getFullYear();
  return {
    year,
    previousYear: year - 1,
    current: countByMonthInYear(items, year, COTIZACION_DATE_FIELDS),
    previous: countByMonthInYear(items, year - 1, COTIZACION_DATE_FIELDS),
  };
}

export function buildOrdenesCompletadasYearSeries(items: Record<string, unknown>[]) {
  const year = new Date().getFullYear();
  return countByMonthInYear(items, year, ORDEN_DATE_FIELDS, isOrdenResuelta);
}

export function buildMesActualMetrics(items: {
  ordenes: Record<string, unknown>[];
  cotizaciones: Record<string, unknown>[];
}) {
  return {
    cotizacionesMes: countInCurrentMonth(items.cotizaciones, COTIZACION_DATE_FIELDS),
    ordenesMes: countInCurrentMonth(items.ordenes, ORDEN_DATE_FIELDS),
    monthLabel: new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
  };
}
