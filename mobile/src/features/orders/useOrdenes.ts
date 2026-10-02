import { useCallback, useMemo, useState } from 'react';
import { listOrdenes } from '@/api/ordenesApi';
import { useEntityList } from '@/hooks/useEntityList';
import type { OrdenListItem } from '@/types/orden';
import { mesActual } from '@/utils/fecha';
import {
  agruparPorStatus,
  contarPorStatus,
  filtrarPorStatus,
  type FiltroStatus,
  type OrdenSection,
} from './agrupar';
import { coincideBusqueda } from './ordenFormat';

/** Fecha de la orden (inicio, o creación si falta) para ordenar: `YYYY-MM-DD HH:MM`. */
function claveFecha(orden: OrdenListItem): string {
  const fecha = (orden.fecha_inicio ?? orden.fecha_creacion ?? '').slice(0, 10);
  const hora = orden.fecha_inicio ? (orden.hora_inicio ?? '').slice(0, 5) : '';
  return `${fecha} ${hora}`;
}

function masRecientesPrimero(ordenes: OrdenListItem[]): OrdenListItem[] {
  return [...ordenes].sort(
    (a, b) => claveFecha(b).localeCompare(claveFecha(a)) || (b.idx ?? b.id) - (a.idx ?? a.id),
  );
}

export interface UseOrdenesResult {
  /** Hay búsqueda: el listado abarca todos los meses, no solo `mes`. */
  global: boolean;
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  filtro: FiltroStatus;
  setFiltro: (filtro: FiltroStatus) => void;
  secciones: OrdenSection[];
  /** Órdenes que pasan la búsqueda (antes del filtro de estatus). */
  total: number;
  /** Conteo por estatus tras la búsqueda — alimenta los filtros. */
  conteos: ReturnType<typeof contarPorStatus>;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Listado del mes. El servidor ya recorta a «mis órdenes» cuando el usuario
 * tiene `own_only`; aquí no se filtra por técnico para no duplicar la regla.
 */
export function useOrdenes(): UseOrdenesResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroStatus>('todas');

  // Con texto en el buscador se trae todo el historial (sin `mes`); el fetcher
  // solo cambia al pasar de vacío a con texto, no en cada tecla.
  const global = busqueda.trim().length > 0;
  const fetcher = useCallback(
    (signal: AbortSignal) => listOrdenes({ mes: global ? undefined : mes, signal }),
    [mes, global],
  );
  const { items, cargando, refrescando, error, recargar } = useEntityList<OrdenListItem>({
    fetcher,
  });

  const filtradas = useMemo(() => {
    const coinciden = items.filter((orden) => coincideBusqueda(orden, busqueda));
    return global ? masRecientesPrimero(coinciden) : coinciden;
  }, [items, busqueda, global]);

  return {
    global,
    mes,
    setMes,
    busqueda,
    setBusqueda,
    filtro,
    setFiltro,
    secciones: useMemo(() => filtrarPorStatus(agruparPorStatus(filtradas), filtro), [filtradas, filtro]),
    total: filtradas.length,
    conteos: useMemo(() => contarPorStatus(filtradas), [filtradas]),
    cargando,
    refrescando,
    error,
    recargar,
  };
}
