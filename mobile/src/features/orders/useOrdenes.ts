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

export interface UseOrdenesResult {
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

  const fetcher = useCallback((signal: AbortSignal) => listOrdenes({ mes, signal }), [mes]);
  const { items, cargando, refrescando, error, recargar } = useEntityList<OrdenListItem>({
    fetcher,
  });

  const filtradas = useMemo(
    () => items.filter((orden) => coincideBusqueda(orden, busqueda)),
    [items, busqueda],
  );

  return {
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
