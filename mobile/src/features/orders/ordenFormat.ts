import { lightColors, type ThemeColors } from '@/theme/tokens';
import type { EquipoInventarioItem, OrdenListItem, OrdenStatus, TipoOrden } from '@/types/orden';

export interface EquipoInventarioAgrupado extends EquipoInventarioItem {
  /** Todas las `lineaId` originales que se colapsaron en esta fila. */
  lineaIds: string[];
}

/**
 * Colapsa líneas del mismo producto (nombre + marca + modelo + imagen) que
 * además comparten estatus de entrega/instalación en una sola fila con la
 * cantidad sumada — el ERP a veces manda una línea por unidad en vez de una
 * con `cantidad: 8`, y verlas repetidas 8 veces parecía un error de captura.
 * Si el estatus difiere entre unidades del mismo producto, se muestran en
 * filas separadas (no se oculta esa diferencia).
 */
export function agruparEquiposPorProducto(
  equipos: readonly EquipoInventarioItem[],
): EquipoInventarioAgrupado[] {
  const grupos = new Map<string, EquipoInventarioAgrupado>();
  const orden: string[] = [];
  for (const eq of equipos) {
    const key = [
      eq.nombre.trim().toLowerCase(),
      eq.marca.trim().toLowerCase(),
      eq.modelo.trim().toLowerCase(),
      eq.imagenUrl,
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

const STATUS_LABEL: Record<OrdenStatus, string> = {
  pendiente: 'Pendiente',
  pausado: 'Pausado',
  resuelto: 'Resuelto',
};

function toneMap(c: ThemeColors): Record<OrdenStatus, { bg: string; text: string }> {
  return {
    pendiente: { bg: c.statusPendienteBg, text: c.statusPendienteText },
    pausado: { bg: c.statusPausadoBg, text: c.statusPausadoText },
    resuelto: { bg: c.statusResueltoBg, text: c.statusResueltoText },
  };
}

/** Fuente única del color por estatus. Pasar `palette` del tema activo. */
export function statusTone(
  status: OrdenStatus,
  palette: ThemeColors = lightColors,
): { bg: string; text: string } {
  return toneMap(palette)[status];
}

/**
 * Versión sólida del mismo tono: el color de texto de `statusTone()` pasa a
 * ser el fondo, con texto blanco encima.
 */
export function statusSolid(
  status: OrdenStatus,
  palette: ThemeColors = lightColors,
): { bg: string; text: string } {
  return { bg: toneMap(palette)[status].text, text: '#FFFFFF' };
}

const TIPO_LABEL: Record<TipoOrden, string> = {
  servicio_tecnico: 'Servicio técnico',
  levantamiento: 'Levantamiento',
  instalaciones: 'Instalación',
};

export type Prioridad = 'alta' | 'media' | 'baja';

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

/** Normaliza el string crudo del backend a un nivel conocido (fallback 'media'). */
export function normalizarPrioridad(valor: string | null | undefined): Prioridad {
  const v = (valor ?? '').trim().toLowerCase();
  return v === 'alta' || v === 'baja' ? v : 'media';
}

export function prioridadLabel(valor: string | null | undefined): string {
  return PRIORIDAD_LABEL[normalizarPrioridad(valor)];
}

/** Tono por nivel de prioridad. Misma familia visual que `statusTone`. */
export function prioridadTone(
  valor: string | null | undefined,
  palette: ThemeColors = lightColors,
): { bg: string; text: string } {
  switch (normalizarPrioridad(valor)) {
    case 'alta':
      return { bg: palette.dangerBg, text: palette.danger };
    case 'baja':
      return { bg: palette.surfaceSunken, text: palette.inkSubtle };
    case 'media':
    default:
      return { bg: palette.goldSoftBg, text: palette.goldSoftText };
  }
}

export function statusLabel(status: OrdenStatus): string {
  return STATUS_LABEL[status];
}

const ACCION_LABEL: Record<OrdenStatus, string> = {
  pendiente: 'Atender orden',
  pausado: 'Reanudar orden',
  resuelto: 'Ver reporte',
};

/** Texto del botón de acción de la tarjeta — mismo destino (el detalle) en
 *  los tres casos, pero nombrado según lo que el técnico va a hacer ahí. */
export function accionLabel(status: OrdenStatus): string {
  return ACCION_LABEL[status];
}

export function tipoOrdenLabel(tipo: TipoOrden): string {
  return TIPO_LABEL[tipo];
}

/** Folio de negocio (`ODT-5001`); si falta, el consecutivo `idx`. */
export function folioDisplay(orden: Pick<OrdenListItem, 'folio' | 'idx' | 'id'>): string {
  const folio = orden.folio?.trim();
  if (folio) return folio;
  if (orden.idx !== null) return `#${orden.idx}`;
  return `#${orden.id}`;
}

export function clienteDisplay(orden: Pick<OrdenListItem, 'cliente_nombre' | 'cliente'>): string {
  return orden.cliente_nombre?.trim() || orden.cliente?.trim() || 'Sin cliente';
}

/** Búsqueda local sobre los campos que el técnico reconoce a simple vista. */
export function coincideBusqueda(orden: OrdenListItem, termino: string): boolean {
  const q = termino.trim().toLowerCase();
  if (!q) return true;
  const campos = [
    folioDisplay(orden),
    clienteDisplay(orden),
    orden.direccion ?? '',
    orden.problematica ?? '',
    orden.nombre_cliente ?? '',
  ];
  return campos.some((campo) => campo.toLowerCase().includes(q));
}

function minutosDesdeEpoch(fecha: string | null, hora: string | null): number | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? '');
  const h = /^(\d{2}):(\d{2})/.exec(hora ?? '');
  if (!f || !h) return null;
  // UTC puro: solo interesa la diferencia, así no influyen zona horaria ni horario de verano.
  return Date.UTC(Number(f[1]), Number(f[2]) - 1, Number(f[3]), Number(h[1]), Number(h[2])) / 60000;
}

/**
 * Tiempo entre inicio y fin del servicio («2 h 30 min»). `null` si falta
 * alguno de los cuatro datos o el fin no es posterior al inicio.
 */
export function duracionServicio(
  orden: Pick<OrdenListItem, 'fecha_inicio' | 'hora_inicio' | 'fecha_finalizacion' | 'hora_termino'>,
): string | null {
  const inicio = minutosDesdeEpoch(orden.fecha_inicio, orden.hora_inicio);
  const fin = minutosDesdeEpoch(orden.fecha_finalizacion, orden.hora_termino);
  if (inicio == null || fin == null || fin <= inicio) return null;
  const total = fin - inicio;
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const minutos = total % 60;
  const partes = [
    dias ? `${dias} d` : null,
    horas ? `${horas} h` : null,
    minutos && !dias ? `${minutos} min` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(' ') : null;
}

/**
 * Tiempo relativo corto desde un ISO del backend («hace 5 min», «hace 3 h»,
 * «hace 2 d»). `null` si falta o no se puede leer. Futuro cercano = «ahora».
 */
export function haceCuanto(iso: string | null | undefined, ahora: Date = new Date()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const min = Math.floor((ahora.getTime() - t) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

