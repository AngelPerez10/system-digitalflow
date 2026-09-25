import type { ProyectoListItem, ProyectoStatus } from '@/types/proyecto';
import { statusLabel } from './proyectoFormat';

/** En proceso primero (lo que el técnico atiende hoy), cancelados al final. */
export const PROYECTO_STATUS_ORDER: readonly ProyectoStatus[] = [
  'en_proceso',
  'pausado',
  'saldo_pendiente',
  'cerrado',
  'cancelado',
];

export interface ProyectoSection {
  key: ProyectoStatus;
  title: string;
  data: ProyectoListItem[];
}

export function agruparPorStatus(proyectos: readonly ProyectoListItem[]): ProyectoSection[] {
  return PROYECTO_STATUS_ORDER.map((key) => ({
    key,
    title: statusLabel(key),
    data: proyectos.filter((p) => p.status === key),
  })).filter((section) => section.data.length > 0);
}

export function contarPorStatus(proyectos: readonly ProyectoListItem[]): Record<ProyectoStatus, number> {
  const counts: Record<ProyectoStatus, number> = {
    en_proceso: 0,
    pausado: 0,
    saldo_pendiente: 0,
    cerrado: 0,
    cancelado: 0,
  };
  for (const proyecto of proyectos) counts[proyecto.status] += 1;
  return counts;
}

/** Filtro de estatus del listado: `'todos'` deja pasar todas las secciones. */
export type FiltroProyecto = ProyectoStatus | 'todos';

export function filtrarPorStatus(
  secciones: readonly ProyectoSection[],
  filtro: FiltroProyecto,
): ProyectoSection[] {
  return filtro === 'todos' ? [...secciones] : secciones.filter((s) => s.key === filtro);
}

