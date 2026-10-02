import { lightColors, type ThemeColors } from '@/theme/tokens';
import type {
  EquipoEstadoInstalacion,
  Proyecto,
  ProyectoEquipoLinea,
  ProyectoListItem,
  ProyectoStatus,
} from '@/types/proyecto';

/**
 * Si alguno de los tipos de trabajo del proyecto es "Alarmas" (el nombre viene libre del
 * catálogo de Servicios, sin un enum fijo — se compara sin distinguir mayúsculas/acentos,
 * igual que `proyectoTieneTipoAlarmas` del web `Operacion/Proyectos/shared/proyectoFormUtils`).
 */
export function proyectoTieneTipoAlarmas(
  tiposTrabajo: readonly { nombre?: string | null }[],
): boolean {
  return tiposTrabajo.some((t) =>
    String(t?.nombre || '')
      .trim()
      .toUpperCase()
      .includes('ALARMA'),
  );
}

export interface ProyectoEquipoAgrupado extends ProyectoEquipoLinea {
  /** Todas las `lineaId` originales que se colapsaron en esta fila. */
  lineaIds: string[];
}

/**
 * Colapsa líneas del mismo producto (modelo + marca + imagen) que además
 * comparten estatus de entrega/instalación en una sola fila con la cantidad
 * sumada — mismo criterio que `agruparEquiposPorProducto` de Órdenes. Llamar
 * por bloque de cotización, no sobre la lista completa, para no mezclar
 * cotizaciones distintas en una sola fila.
 */
export function agruparEquiposPorProducto(
  equipos: readonly ProyectoEquipoLinea[],
): ProyectoEquipoAgrupado[] {
  const grupos = new Map<string, ProyectoEquipoAgrupado>();
  const orden: string[] = [];
  for (const eq of equipos) {
    const key = [
      eq.modelo.trim().toLowerCase(),
      eq.modeloOriginal.trim().toLowerCase(),
      (eq.marca ?? '').trim().toLowerCase(),
      eq.imagenUrl ?? '',
      eq.equipoEntregado ? '1' : '0',
      eq.estadoInstalacion,
    ].join('|');
    const existente = grupos.get(key);
    if (existente) {
      existente.cantidad += eq.cantidad;
      existente.lineaIds.push(eq.lineaId);
    } else {
      grupos.set(key, { ...eq, lineaIds: [eq.lineaId] });
      orden.push(key);
    }
  }
  return orden.map((key) => grupos.get(key)!);
}

const STATUS_LABEL: Record<ProyectoStatus, string> = {
  en_proceso: 'En proceso',
  pausado: 'Pausado',
  saldo_pendiente: 'Saldo pendiente',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

/**
 * Tonos suaves por estatus sobre lienzo blanco (y chips en banda marina):
 * azul eléctrico para «en proceso» (marca SertelPro — el dorado se leía
 * terroso/sucio en el selector), índigo para pausado, verde para cerrado y
 * rojo para cancelado. `primaryDisabled` da un fill limpio; el dorado queda
 * reservado a acentos de «sin guardar» / viñetas, no al estatus activo.
 */
function toneMap(c: ThemeColors): Record<ProyectoStatus, { bg: string; text: string }> {
  return {
    en_proceso: { bg: c.primaryDisabled, text: c.primary },
    pausado: { bg: c.statusPausadoBg, text: c.statusPausadoText },
    saldo_pendiente: { bg: c.statusSaldoBg, text: c.statusSaldoText },
    cerrado: { bg: c.statusResueltoBg, text: c.statusResueltoText },
    cancelado: { bg: c.dangerBg, text: c.danger },
  };
}

export function statusTone(
  status: ProyectoStatus,
  palette: ThemeColors = lightColors,
): { bg: string; text: string } {
  return toneMap(palette)[status];
}

export function statusSolid(
  status: ProyectoStatus,
  palette: ThemeColors = lightColors,
): { bg: string; text: string } {
  return { bg: toneMap(palette)[status].text, text: '#FFFFFF' };
}

export function statusLabel(status: ProyectoStatus): string {
  return STATUS_LABEL[status];
}

const ESTADO_INSTALACION_LABEL: Record<EquipoEstadoInstalacion, string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
  no_instalado: 'No instalado',
  instalado: 'Instalado',
};

export function estadoInstalacionLabel(estado: EquipoEstadoInstalacion): string {
  return ESTADO_INSTALACION_LABEL[estado];
}

export function estadoInstalacionTone(
  estado: EquipoEstadoInstalacion,
  palette: ThemeColors = lightColors,
): { bg: string; text: string } {
  switch (estado) {
    case 'instalado':
      return { bg: palette.statusPausadoBg, text: palette.statusPausadoText };
    case 'no_instalado':
      return { bg: palette.dangerBg, text: palette.danger };
    case 'entregado':
      return { bg: palette.statusResueltoBg, text: palette.statusResueltoText };
    default:
      return { bg: palette.surfaceSunken, text: palette.inkSubtle };
  }
}

/** Folio de negocio (`PRY-2001`); si falta, el consecutivo `idx`. */
export function folioDisplay(proyecto: Pick<ProyectoListItem, 'folio' | 'idx' | 'id'>): string {
  const folio = proyecto.folio?.trim();
  if (folio) return folio;
  if (proyecto.idx !== null) return `#${proyecto.idx}`;
  return `#${proyecto.id}`;
}

export function clienteDisplay(proyecto: Pick<ProyectoListItem, 'cliente_nombre'>): string {
  return proyecto.cliente_nombre?.trim() || 'Sin cliente';
}

/** Nombre del técnico responsable, o el primero de la lista si nadie quedó marcado. */
export function tecnicoResponsableDisplay(
  proyecto: Pick<ProyectoListItem, 'tecnicos'>,
): string {
  const responsable = proyecto.tecnicos.find((t) => t.responsable) ?? proyecto.tecnicos[0];
  return responsable?.nombre.trim() || 'Sin técnico asignado';
}

/** Fecha de inicio de trabajo más antigua registrada (primer día de jornada). */
export function primeraFechaInicio(proyecto: Pick<ProyectoListItem, 'fechas_inicio'>): string | null {
  const fechas = [...proyecto.fechas_inicio].filter(Boolean).sort();
  return fechas[0] ?? null;
}

/**
 * ¿El proyecto cae en `mes` (`YYYY-MM`)? Mismo criterio que el filtro `mes`
 * del backend de Órdenes: si alguna jornada de `fechas_inicio` cae en ese
 * mes cuenta; si el proyecto no tiene fechas aún, se usa `created_at`.
 */
export function perteneceAlMes(
  proyecto: Pick<ProyectoListItem, 'fechas_inicio' | 'created_at'>,
  mes: string,
): boolean {
  const fechas = proyecto.fechas_inicio.filter(Boolean);
  if (fechas.length > 0) return fechas.some((f) => f.slice(0, 7) === mes);
  return (proyecto.created_at ?? '').slice(0, 7) === mes;
}

/** Búsqueda local sobre los campos que el técnico reconoce a simple vista. */
export function coincideBusqueda(proyecto: ProyectoListItem, termino: string): boolean {
  const q = termino.trim().toLowerCase();
  if (!q) return true;
  const campos = [
    folioDisplay(proyecto),
    clienteDisplay(proyecto),
    proyecto.tipo_trabajo_nombre ?? '',
    tecnicoResponsableDisplay(proyecto),
  ];
  return campos.some((campo) => campo.toLowerCase().includes(q));
}

/**
 * Personas del proyecto para la fila de avatares: responsable primero, luego
 * el resto de técnicos y los auxiliares. `titulo` es el nombre a mostrar y
 * `extra` cuántos más hay («Luis Díaz +2»).
 */
export function resumenEquipo(proyecto: Pick<ProyectoListItem, 'tecnicos' | 'auxiliares'>): {
  nombres: string[];
  titulo: string;
  extra: number;
} {
  const tecnicos = [...proyecto.tecnicos].sort((a, b) => Number(b.responsable) - Number(a.responsable));
  const nombres = [...tecnicos, ...proyecto.auxiliares].map((p) => p.nombre.trim()).filter(Boolean);
  return {
    nombres,
    titulo: nombres[0] ?? 'Sin técnico asignado',
    extra: Math.max(0, nombres.length - 1),
  };
}

/**
 * Días de trabajo del proyecto. `fechas_inicio` (el rango programado) y
 * `notas_por_dia` (los días registrados en bitácora) se capturan por separado:
 * un técnico puede agregar el día 3 a la bitácora sin extender el rango. Se
 * toma el mayor para que el conteo nunca contradiga a la bitácora.
 */
export function diasDeTrabajo(proyecto: Pick<ProyectoListItem, 'fechas_inicio' | 'notas_por_dia'>): {
  programados: number;
  enBitacora: number;
  total: number;
} {
  const programados = new Set(proyecto.fechas_inicio.map((f) => f.trim().slice(0, 10)).filter(Boolean)).size;
  const enBitacora = proyecto.notas_por_dia.length;
  return { programados, enBitacora, total: Math.max(programados, enBitacora) };
}

export type RolEquipo = 'responsable' | 'tecnico' | 'auxiliar';

export interface PersonaEquipo {
  key: string;
  nombre: string;
  avatar: string | null;
  rol: RolEquipo;
}

export const ROL_EQUIPO_LABEL: Record<RolEquipo, string> = {
  responsable: 'Responsable',
  tecnico: 'Técnico',
  auxiliar: 'Auxiliar',
};

/** Responsable primero, luego técnicos y auxiliares (misma regla que la tarjeta del listado). */
export function personasDelEquipo(proyecto: Pick<Proyecto, 'tecnicos' | 'auxiliares'>): PersonaEquipo[] {
  const tecnicos = [...proyecto.tecnicos].sort((a, b) => Number(b.responsable) - Number(a.responsable));
  return [
    ...tecnicos.map((t, i) => ({
      key: `t-${t.id ?? i}`,
      nombre: t.nombre.trim() || 'Sin nombre',
      avatar: t.avatar_url?.trim() || null,
      rol: (t.responsable ? 'responsable' : 'tecnico') as RolEquipo,
    })),
    ...proyecto.auxiliares.map((a, i) => ({
      key: `a-${a.id ?? i}`,
      nombre: a.nombre.trim() || 'Sin nombre',
      avatar: a.avatar_url?.trim() || null,
      rol: 'auxiliar' as RolEquipo,
    })),
  ];
}

export type EstadoJornada = 'hecha' | 'hoy' | 'proxima';

export interface Jornada {
  iso: string;
  /** 1..n en orden de calendario. */
  numero: number;
  estado: EstadoJornada;
  /** La bitácora tiene nota o fotos para esta jornada (se emparejan por posición, como en `BitacoraTimeline`). */
  conBitacora: boolean;
}

export interface ResumenJornadas {
  jornadas: Jornada[];
  /** Jornadas ya trabajadas (pasadas + hoy). */
  hechas: number;
  /** Índice de la jornada de hoy, o `null` si hoy no se trabaja. */
  indiceHoy: number | null;
  /** Próxima jornada después de hoy. */
  siguiente: Jornada | null;
}

/** Jornadas programadas con su estado respecto a `hoy` (`YYYY-MM-DD`). */
export function jornadasDelProyecto(
  proyecto: Pick<ProyectoListItem, 'fechas_inicio' | 'notas_por_dia'>,
  hoy: string,
): ResumenJornadas {
  const fechas = [...new Set(proyecto.fechas_inicio.map((f) => f.trim().slice(0, 10)).filter(Boolean))].sort();
  const jornadas: Jornada[] = fechas.map((iso, i) => {
    const nota = proyecto.notas_por_dia[i];
    return {
      iso,
      numero: i + 1,
      estado: iso < hoy ? 'hecha' : iso === hoy ? 'hoy' : 'proxima',
      conBitacora: Boolean(nota && (nota.nota.trim() || nota.imagenesUrls.length > 0)),
    };
  });
  const indice = jornadas.findIndex((j) => j.estado === 'hoy');
  return {
    jornadas,
    hechas: jornadas.filter((j) => j.estado !== 'proxima').length,
    indiceHoy: indice >= 0 ? indice : null,
    siguiente: jornadas.find((j) => j.estado === 'proxima') ?? null,
  };
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Partes de un `YYYY-MM-DD` para la ficha del día (sin zona horaria). */
export function partesFecha(iso: string): { dia: string; numero: number; mes: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return { dia: DIAS_CORTOS[fecha.getDay()]!, numero: fecha.getDate(), mes: MESES_CORTOS[fecha.getMonth()]! };
}
