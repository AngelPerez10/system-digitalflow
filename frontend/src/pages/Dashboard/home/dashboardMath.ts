/** Cálculos derivados del panel a partir de las series mensuales (índice 0–11). */

export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

export function sumHasta(serie: number[], mesIdx: number): number {
  let total = 0;
  for (let i = 0; i <= mesIdx && i < serie.length; i += 1) total += serie[i] || 0;
  return total;
}

export function acumulada(serie: number[]): number[] {
  let total = 0;
  return serie.map((n) => (total += n || 0));
}

/** Variación porcentual; `null` cuando no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

export function formatVariacion(pct: number): string {
  const abs = Math.abs(pct);
  const txt = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${txt}%`;
}

export function formatEntero(n: number): string {
  return Math.round(n).toLocaleString("es-MX");
}

const MXN_COMPACT = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** `$1.2 M` en ejes y tarjetas; `$1,234,567` en tooltips. */
export function formatMoneda(n: number, compact = true): string {
  return (compact ? MXN_COMPACT : MXN).format(n || 0);
}

export function porcentaje(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

/** Trazo suave (Catmull-Rom → Bézier) que pasa por todos los puntos. */
export function smoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
