import { useCallback, useMemo, useState } from 'react';
import { listReportes } from '@/api/reportesApi';
import { useEntityList } from '@/hooks/useEntityList';
import type { Reporte } from '@/types/reporte';
import { mesActual } from '@/utils/fecha';
import {
  agruparPorEvidencia,
  coincideBusqueda,
  contarPorEvidencia,
  filtrarSecciones,
  perteneceAlMes,
  type FiltroReporte,
  type ReporteSection,
} from './reporteFormat';

export interface UseReportesResult {
  /** Hay búsqueda: el listado abarca todos los meses, no solo `mes`. */
  global: boolean;
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  filtro: FiltroReporte;
  setFiltro: (filtro: FiltroReporte) => void;
  secciones: ReporteSection[];
  total: number;
  conteos: ReturnType<typeof contarPorEvidencia>;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * El servidor trae todos los reportes visibles (ya recortados por `own_only`)
 * sin paginar; aquí se filtran por mes de servicio, búsqueda y estado de la
 * evidencia, igual que Proyectos.
 */
export function useReportes(): UseReportesResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroReporte>('todos');

  const fetcher = useCallback((signal: AbortSignal) => listReportes(signal), []);
  const { items, cargando, refrescando, error, recargar } = useEntityList<Reporte>({ fetcher });

  // Con texto en el buscador se ignora el mes (las secciones ya ordenan lo más reciente primero).
  const global = busqueda.trim().length > 0;
  const delMes = useMemo(
    () => items.filter((r) => (global ? coincideBusqueda(r, busqueda) : perteneceAlMes(r, mes))),
    [items, mes, busqueda, global],
  );

  const conteos = useMemo(() => contarPorEvidencia(delMes), [delMes]);

  return {
    global,
    mes,
    setMes,
    busqueda,
    setBusqueda,
    filtro,
    setFiltro,
    secciones: useMemo(() => filtrarSecciones(agruparPorEvidencia(delMes), filtro), [delMes, filtro]),
    total: delMes.length,
    conteos,
    cargando,
    refrescando,
    error,
    recargar,
  };
}
