/**
 * Reglas de las visitas de una póliza: de 1 a 4 al año, fechas libres (pueden
 * repetirse el mismo día) y todas dentro de 12 meses desde la primera. Mismas
 * reglas que valida el backend.
 */

export const MAX_VISITAS = 4;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIso(iso: string): Date | null {
  const m = ISO_RE.exec(iso.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

/** Días de `from` a `to` (negativo si `to` ya pasó). */
export function daysBetween(from: string, to: string): number | null {
  const a = parseIso(from);
  const b = parseIso(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Un año después, con el 29 de febrero cayendo en 28 (igual que el backend). */
export function unAnioDespues(iso: string): string {
  const d = parseIso(iso);
  if (!d) return iso;
  const y = d.getFullYear() + 1;
  const m = d.getMonth();
  const day = m === 1 && d.getDate() === 29 ? 28 : d.getDate();
  return toIso(new Date(y, m, day));
}

/** Quita vacías y ordena; es lo que se guarda. */
export function normalizarVisitas(visitas: string[]): string[] {
  return visitas.map((v) => v.trim()).filter(Boolean).sort();
}

/** Primer problema de las visitas capturadas, o null si están bien. */
export function validarVisitas(visitas: string[]): string | null {
  if (!visitas.length || visitas.every((v) => !v.trim())) return "Agrega al menos una visita.";
  if (visitas.some((v) => !v.trim())) return "Elige la fecha de cada visita o quita las vacías.";
  if (visitas.length > MAX_VISITAS) return `Máximo ${MAX_VISITAS} visitas al año.`;
  const orden = normalizarVisitas(visitas);
  if (orden[orden.length - 1] > unAnioDespues(orden[0])) {
    return "Las visitas deben caer dentro de 12 meses desde la primera.";
  }
  return null;
}

/** Próxima visita desde hoy (incluida), o "" si ya pasaron todas. */
export function proximaVisita(visitas: string[], today = todayIso()): string {
  return normalizarVisitas(visitas).find((d) => d >= today) || "";
}

/** Visitas cuya fecha ya pasó. */
export function visitasRealizadas(visitas: string[], today = todayIso()): number {
  return visitas.filter((d) => d && d < today).length;
}

/** Suma meses a una fecha ISO sin depender de UTC (31 ene + 1 → 3 mar). */
export function addMonthsIso(iso: string, months: number): string {
  const d = parseIso(iso);
  if (!d) return iso;
  return toIso(new Date(d.getFullYear(), d.getMonth() + months, d.getDate()));
}

/** Plan de visitas: cuántas al año (repartidas parejo) o fechas libres. */
export type PlanVisitas = 1 | 2 | 3 | 4 | "libre";

/** Meses entre visitas de un plan fijo: 1 → 12, 2 → 6, 3 → 4, 4 → 3. */
export const mesesEntreVisitas = (n: 1 | 2 | 3 | 4) => 12 / n;

/** Las `n` visitas del año repartidas parejo desde `inicio`. */
export function visitasProgramadas(inicio: string, n: 1 | 2 | 3 | 4): string[] {
  if (!parseIso(inicio)) return [];
  return Array.from({ length: n }, (_, i) => addMonthsIso(inicio, i * mesesEntreVisitas(n)));
}

/** Qué plan describen unas visitas guardadas (para abrir una póliza en edición). */
export function detectarPlan(visitas: string[]): PlanVisitas {
  const v = visitas.filter(Boolean);
  if (!v.length || v.length > MAX_VISITAS) return "libre";
  const n = v.length as 1 | 2 | 3 | 4;
  return visitasProgramadas(v[0], n).join() === v.join() ? n : "libre";
}
