/** Mes calendario local en formato YYYY-MM */
export function getCurrentMonthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): { y: number; m: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || "").trim());
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

export function shiftMonthKey(key: string, deltaMonths: number): string {
  const p = parseMonthKey(key);
  if (!p) return getCurrentMonthKey();
  const d = new Date(p.y, p.m - 1 + deltaMonths, 1);
  return getCurrentMonthKey(d);
}

/** Ej. "Abril de 2026" */
export function formatMonthLabelEs(key: string): string {
  const p = parseMonthKey(key);
  if (!p) return key;
  const s = new Date(p.y, p.m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
