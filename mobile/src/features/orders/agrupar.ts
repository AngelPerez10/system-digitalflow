import type { OrdenListItem, OrdenStatus } from '@/types/orden';
import { normalizarPrioridad, statusLabelPlural, type Prioridad } from './ordenFormat';

/** Mismo orden que el listado web: Pendientes → Pausados → Saldo pendiente → Resueltas. */
export const ORDEN_STATUS_ORDER: readonly OrdenStatus[] = ['pendiente', 'pausado', 'saldo_pendiente', 'resuelto'];

export interface OrdenSection {
  key: OrdenStatus;
  title: string;
  data: OrdenListItem[];
}

export function agruparPorStatus(ordenes: readonly OrdenListItem[]): OrdenSection[] {
  return ORDEN_STATUS_ORDER.map((key) => ({
    key,
    title: statusLabelPlural(key),
    data: ordenes.filter((orden) => orden.status === key),
  })).filter((section) => section.data.length > 0);
}

export function contarPorStatus(ordenes: readonly OrdenListItem[]): Record<OrdenStatus, number> {
  const counts: Record<OrdenStatus, number> = { pendiente: 0, pausado: 0, saldo_pendiente: 0, resuelto: 0 };
  for (const orden of ordenes) counts[orden.status] += 1;
  return counts;
}

/** Filtro de estatus del listado: `'todas'` deja pasar todas las secciones. */
export type FiltroStatus = OrdenStatus | 'todas';

export function filtrarPorStatus(
  secciones: readonly OrdenSection[],
  filtro: FiltroStatus,
): OrdenSection[] {
  return filtro === 'todas' ? [...secciones] : secciones.filter((s) => s.key === filtro);
}

/** Conteo de la bolsa por prioridad (alta / media / baja), normalizando el string del backend. */
export function contarPorPrioridad(ordenes: readonly OrdenListItem[]): Record<Prioridad, number> {
  const counts: Record<Prioridad, number> = { alta: 0, media: 0, baja: 0 };
  for (const orden of ordenes) counts[normalizarPrioridad(orden.prioridad_pool)] += 1;
  return counts;
}
