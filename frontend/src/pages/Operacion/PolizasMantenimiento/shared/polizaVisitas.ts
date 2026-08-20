export type PolizaIntervaloMeses = 2 | 4;

export const POLIZA_INTERVALO_DEFAULT: PolizaIntervaloMeses = 4;

export function parseIntervaloMeses(value: unknown): PolizaIntervaloMeses {
  const n = Number(value);
  return n === 2 ? 2 : 4;
}

/** Suma meses a una fecha ISO (YYYY-MM-DD) sin depender de UTC. */
export function addMonthsIso(iso: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1 + months, day);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function visitDatesFromStart(
  startIso: string,
  intervalMonths: PolizaIntervaloMeses
): [string, string, string] {
  const start = startIso.trim();
  return [start, addMonthsIso(start, intervalMonths), addMonthsIso(start, intervalMonths * 2)];
}

export function inferIntervaloMeses(fecha1: string, fecha2: string): PolizaIntervaloMeses {
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha1.trim());
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha2.trim());
  if (!m1 || !m2) return POLIZA_INTERVALO_DEFAULT;
  const d1 = new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const d2 = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  const diffMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (diffMonths >= 1 && diffMonths <= 3) return 2;
  return 4;
}
