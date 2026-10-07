import type { OrdenListItem } from '@/types/orden';
import type { ProyectoListItem } from '@/types/proyecto';
import { primeraFechaInicio } from '@/features/proyectos/proyectoFormat';
import { formatHora } from '@/utils/fecha';

export type AgendaKind = 'orden' | 'proyecto';

/** Ítem unificado para la franja horaria del día. */
export interface AgendaItem {
  key: string;
  kind: AgendaKind;
  id: number;
  titulo: string;
  subtitulo: string;
  ubicacion: string | null;
  persona: string | null;
  avatarUrl: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  /** `YYYY-MM-DD` de anclaje en el calendario. */
  fecha: string;
  /** Destaca la tarjeta activa (verde en el diseño de referencia). */
  destacado: boolean;
  status: string;
}

const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const MESES_CORTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export interface DiaSemana {
  fecha: string;
  letra: string;
  diaNumero: number;
  esHoy: boolean;
}

function pad2(n: number): string {
  return `${n}`.padStart(2, '0');
}

export function fechaISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISOFecha(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Domingo → sábado que contiene `fechaISO` (calendario local). */
export function semanaDe(fecha: string, hoy: string = fechaISO(new Date())): DiaSemana[] {
  const base = parseISOFecha(fecha);
  if (!base) return [];
  const domingo = new Date(base);
  domingo.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo);
    d.setDate(domingo.getDate() + i);
    const iso = fechaISO(d);
    return {
      fecha: iso,
      letra: DIAS_LETRA[i] ?? '',
      diaNumero: d.getDate(),
      esHoy: iso === hoy,
    };
  });
}

export function etiquetaDiaCabecera(fecha: string): { numero: string; dia: string; mesAnio: string } {
  const d = parseISOFecha(fecha);
  if (!d) return { numero: '—', dia: '', mesAnio: '' };
  return {
    numero: `${d.getDate()}`,
    dia: DIAS_CORTO[d.getDay()] ?? '',
    mesAnio: `${MESES_CORTO[d.getMonth()] ?? ''} ${d.getFullYear()}`,
  };
}

export function mesDeFecha(fecha: string): string {
  return fecha.slice(0, 7);
}

function fechaOrden(orden: OrdenListItem): string | null {
  const inicio = (orden.fecha_inicio ?? '').slice(0, 10);
  if (inicio) return inicio;
  const creacion = (orden.fecha_creacion ?? '').slice(0, 10);
  return creacion || null;
}

function fechasProyecto(proyecto: ProyectoListItem): string[] {
  const fechas = proyecto.fechas_inicio.map((f) => f.slice(0, 10)).filter(Boolean);
  if (fechas.length > 0) return [...new Set(fechas)];
  const creada = (proyecto.created_at ?? '').slice(0, 10);
  return creada ? [creada] : [];
}

function ordenAItem(orden: OrdenListItem, fecha: string): AgendaItem {
  const folio = orden.folio?.trim() || (orden.idx != null ? `OS-${orden.idx}` : `Orden #${orden.id}`);
  const cliente = orden.cliente_nombre?.trim() || orden.cliente?.trim() || null;
  return {
    key: `orden-${orden.id}`,
    kind: 'orden',
    id: orden.id,
    titulo: folio,
    subtitulo: orden.problematica?.trim() || cliente || 'Servicio técnico',
    ubicacion: orden.direccion?.trim() || null,
    persona: orden.tecnico_asignado_full_name?.trim() || orden.nombre_encargado?.trim() || cliente,
    avatarUrl: orden.tecnico_asignado_avatar_url,
    horaInicio: formatHora(orden.hora_inicio) === '—' ? null : formatHora(orden.hora_inicio),
    horaFin: formatHora(orden.hora_termino) === '—' ? null : formatHora(orden.hora_termino),
    fecha,
    destacado: false,
    status: orden.status,
  };
}

function proyectoAItem(proyecto: ProyectoListItem, fecha: string): AgendaItem {
  const folio = proyecto.folio?.trim() || (proyecto.idx != null ? `PRJ-${proyecto.idx}` : `Proyecto #${proyecto.id}`);
  const responsable =
    proyecto.tecnicos.find((t) => t.responsable)?.nombre?.trim() ||
    proyecto.tecnicos[0]?.nombre?.trim() ||
    null;
  const avatar =
    proyecto.tecnicos.find((t) => t.responsable)?.avatar_url ??
    proyecto.tecnicos[0]?.avatar_url ??
    null;
  return {
    key: `proyecto-${proyecto.id}-${fecha}`,
    kind: 'proyecto',
    id: proyecto.id,
    titulo: folio,
    subtitulo: proyecto.tipo_trabajo_nombre?.trim() || proyecto.cliente_nombre?.trim() || 'Proyecto',
    ubicacion: proyecto.cliente_nombre?.trim() || null,
    persona: responsable,
    avatarUrl: typeof avatar === 'string' ? avatar : null,
    horaInicio: formatHora(proyecto.hora_llegada) === '—' ? null : formatHora(proyecto.hora_llegada),
    horaFin: formatHora(proyecto.hora_salida) === '—' ? null : formatHora(proyecto.hora_salida),
    fecha,
    destacado: false,
    status: proyecto.status,
  };
}

function claveOrden(item: AgendaItem): string {
  return `${item.horaInicio ?? '99:99'} ${item.key}`;
}

function esActivo(item: AgendaItem): boolean {
  if (item.kind === 'orden') return item.status === 'pendiente' || item.status === 'pausado';
  return item.status === 'en_proceso' || item.status === 'pausado';
}

/**
 * Une órdenes y proyectos del día `fecha`, ordenados por hora.
 * La primera actividad «en curso» (o la primera del día) queda destacada.
 */
export function construirAgendaDia(
  fecha: string,
  ordenes: readonly OrdenListItem[],
  proyectos: readonly ProyectoListItem[],
): AgendaItem[] {
  const items: AgendaItem[] = [];

  for (const orden of ordenes) {
    if (fechaOrden(orden) === fecha) items.push(ordenAItem(orden, fecha));
  }
  for (const proyecto of proyectos) {
    if (fechasProyecto(proyecto).includes(fecha)) items.push(proyectoAItem(proyecto, fecha));
  }

  items.sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));

  const destacadoIdx = items.findIndex(esActivo);
  const idx = destacadoIdx >= 0 ? destacadoIdx : items.length > 0 ? 0 : -1;
  return items.map((item, i) => (i === idx ? { ...item, destacado: true } : item));
}

/** ¿El proyecto tiene alguna jornada en `fecha`? */
export function proyectoEnFecha(proyecto: ProyectoListItem, fecha: string): boolean {
  return fechasProyecto(proyecto).includes(fecha);
}

export function ordenEnFecha(orden: OrdenListItem, fecha: string): boolean {
  return fechaOrden(orden) === fecha;
}

/** Primera fecha de un proyecto (para tests / debug). */
export function anclaProyecto(proyecto: ProyectoListItem): string | null {
  const inicio = primeraFechaInicio(proyecto)?.slice(0, 10);
  if (inicio) return inicio;
  const creada = (proyecto.created_at ?? '').slice(0, 10);
  return creada || null;
}
