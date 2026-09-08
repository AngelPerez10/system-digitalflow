import { lightColors, type ThemeColors } from '@/theme/tokens';
import type { OrdenListItem, OrdenStatus, TipoOrden } from '@/types/orden';

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

/**
 * Algunas órdenes traen en `direccion` un enlace de Google Maps en vez de una
 * dirección legible (dato así capturado desde el web). Mostrar la URL cruda
 * se ve roto en la tarjeta; esto detecta el caso para renderizarlo distinto.
 */
export function esEnlaceUbicacion(direccion: string): boolean {
  return /^https?:\/\//i.test(direccion.trim());
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
