import type { OrdenListItem, OrdenStatus } from '@/types/orden';
import { statusLabel } from './ordenFormat';

/** Mismo orden que el listado web: Pendientes → Pausados → Resueltas. */
export const ORDEN_STATUS_ORDER: readonly OrdenStatus[] = ['pendiente', 'pausado', 'resuelto'];

export interface OrdenSection {
  key: OrdenStatus;
  title: string;
  data: OrdenListItem[];
}

export function agruparPorStatus(ordenes: readonly OrdenListItem[]): OrdenSection[] {
  return ORDEN_STATUS_ORDER.map((key) => ({
    key,
    title: `${statusLabel(key)}s`,
    data: ordenes.filter((orden) => orden.status === key),
  })).filter((section) => section.data.length > 0);
}

export function contarPorStatus(ordenes: readonly OrdenListItem[]): Record<OrdenStatus, number> {
  const counts: Record<OrdenStatus, number> = { pendiente: 0, pausado: 0, resuelto: 0 };
  for (const orden of ordenes) counts[orden.status] += 1;
  return counts;
}
