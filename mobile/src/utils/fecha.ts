/** Utilidades de fecha/hora en formato del backend (`YYYY-MM-DD`, `HH:MM[:SS]`). */

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function mesActual(today: Date = new Date()): string {
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

/** Desplaza un `YYYY-MM` en `delta` meses. */
export function desplazarMes(mes: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return mes;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1 + delta;
  const date = new Date(year, monthIndex, 1);
  return mesActual(date);
}

export function etiquetaMes(mes: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return mes;
  const nombre = MESES[Number(match[2]) - 1] ?? mes;
  return `${nombre} ${match[1]}`;
}

/** `2026-08-26` → `26/08/2026`. Devuelve `—` si no hay fecha. */
export function formatFecha(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** `14:30:00` → `14:30`. */
export function formatHora(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

export function hoyISO(today: Date = new Date()): string {
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function horaActual(now: Date = new Date()): string {
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
}

/** Convierte `YYYY-MM-DD` a `Date` local. `null` si el valor no es una fecha válida. */
export function parseFechaToDate(value: string): Date | null {
  if (!esFechaValida(value)) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

/** Convierte `HH:MM` a `Date` local (hoy + esa hora). `null` si no es hora válida. */
export function parseHoraToDate(value: string, base: Date = new Date()): Date | null {
  if (!esHoraValida(value)) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToFechaISO(date: Date): string {
  return hoyISO(date);
}

export function dateToHoraISO(date: Date): string {
  return horaActual(date);
}

/** Valida lo que el usuario teclea antes de mandarlo al backend. */
export function esFechaValida(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function esHoraValida(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}
