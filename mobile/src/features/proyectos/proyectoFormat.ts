import { lightColors, type ThemeColors } from '@/theme/tokens';
import type {
  EquipoEstadoInstalacion,
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
