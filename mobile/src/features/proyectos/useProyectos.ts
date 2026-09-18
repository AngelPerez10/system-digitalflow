import { useCallback, useMemo, useState } from 'react';
import { listProyectos } from '@/api/proyectosApi';
import { useEntityList } from '@/hooks/useEntityList';
import type { ProyectoListItem } from '@/types/proyecto';
import { mesActual } from '@/utils/fecha';
import { agruparPorStatus, contarPorStatus, type ProyectoSection } from './agrupar';
import { coincideBusqueda, perteneceAlMes } from './proyectoFormat';

export interface UseProyectosResult {
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  secciones: ProyectoSection[];
  total: number;
  conteos: ReturnType<typeof contarPorStatus>;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * El backend trae todos los proyectos visibles («mis proyectos» ya recortado
 * por `own_only`, igual que en Órdenes) — aquí se pagina por mes en el
 * cliente, ya que `fechas_inicio` es un arreglo JSON y no un campo de fecha
 * indexable como el de Órdenes. Por defecto muestra el mes actual; el
 * `MesSelector` deja hojear proyectos pasados.
 */
export function useProyectos(): UseProyectosResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');

  const fetcher = useCallback((signal: AbortSignal) => listProyectos(signal), []);
  const { items, cargando, refrescando, error, recargar } = useEntityList<ProyectoListItem>({
    fetcher,
  });

  const filtrados = useMemo(
    () =>
      items.filter(
        (proyecto) => perteneceAlMes(proyecto, mes) && coincideBusqueda(proyecto, busqueda),
      ),
    [items, mes, busqueda],
  );

  return {
    mes,
    setMes,
    busqueda,
    setBusqueda,
    secciones: useMemo(() => agruparPorStatus(filtrados), [filtrados]),
    total: filtrados.length,
    conteos: useMemo(() => contarPorStatus(filtrados), [filtrados]),
    cargando,
    refrescando,
    error,
    recargar,
  };
}
