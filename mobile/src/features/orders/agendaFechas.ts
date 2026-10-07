import { hoyISO, parseFechaToDate } from '@/utils/fecha';

/** Textos de la sección «Agenda» de Nueva orden: tira de días y resumen. */

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Regla de «Hora de llegada»: de 06:00 a 21:00 en pasos de 15 minutos. */
export const REGLA_INICIO = 6 * 60;
export const REGLA_FIN = 21 * 60;
export const REGLA_PASO = 15;
export const REGLA_MARCAS = (REGLA_FIN - REGLA_INICIO) / REGLA_PASO + 1;

export interface DiaAgenda {
  iso: string;
  /** «Hoy» para el primero; si no, abreviatura («Mar»). */
  etiqueta: string;
  dia: number;
  mesCorto: string;
  esHoy: boolean;
}

export interface FechaDescrita {
  diaSemana: string;
  /** «7 de octubre», con año solo si no es el actual. */
  fecha: string;
  /** «Hoy», «Mañana», «En 3 días», «Hace 2 días». */
  relativo: string;
  dia: number;
  mesCorto: string;
}

/** Días naturales entre dos fechas locales, sin tropezar con el horario de verano. */
function diferenciaDias(desde: Date, hasta: Date): number {
  const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** `n` días a partir de hoy (incluido). */
export function diasProximos(n: number, hoy: Date = new Date()): DiaAgenda[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    return {
      iso: hoyISO(d),
      etiqueta: i === 0 ? 'Hoy' : (DIAS_CORTO[d.getDay()] ?? ''),
      dia: d.getDate(),
      mesCorto: MESES_CORTO[d.getMonth()] ?? '',
      esHoy: i === 0,
    };
  });
}

export function relativoDias(dias: number): string {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`;
}

/** `null` si `iso` no es una fecha válida. */
export function describirFecha(iso: string, hoy: Date = new Date()): FechaDescrita | null {
  const d = parseFechaToDate(iso);
  if (!d) return null;
  const anio = d.getFullYear() === hoy.getFullYear() ? '' : ` de ${d.getFullYear()}`;
  return {
    diaSemana: DIAS_LARGO[d.getDay()] ?? '',
    fecha: `${d.getDate()} de ${MESES[d.getMonth()] ?? ''}${anio}`,
    relativo: relativoDias(diferenciaDias(hoy, d)),
    dia: d.getDate(),
    mesCorto: MESES_CORTO[d.getMonth()] ?? '',
  };
}

/** Primer nombre para frases cortas («Ana recibirá…»). */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

/** `HH:MM` → minutos del día; `null` si no es una hora válida. */
export function horaAMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Marca de la regla más cercana a una hora (las que caen fuera se pegan al borde). */
export function marcaDeHora(hhmm: string): number | null {
  const min = horaAMinutos(hhmm);
  if (min === null) return null;
  const i = Math.round((min - REGLA_INICIO) / REGLA_PASO);
  return Math.min(Math.max(i, 0), REGLA_MARCAS - 1);
}

export function horaDeMarca(indice: number): string {
  return minutosAHora(REGLA_INICIO + indice * REGLA_PASO);
}

/** «Por la mañana», «Al mediodía», «Por la tarde», «Por la noche». */
export function franjaDelDia(hhmm: string): string {
  const min = horaAMinutos(hhmm);
  if (min === null) return '';
  if (min < 12 * 60) return 'Por la mañana';
  if (min < 14 * 60) return 'Al mediodía';
  if (min < 19 * 60) return 'Por la tarde';
  return 'Por la noche';
}
