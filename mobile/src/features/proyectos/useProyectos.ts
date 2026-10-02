import { useCallback, useMemo, useState } from 'react';
import { listProyectos } from '@/api/proyectosApi';
import { useEntityList } from '@/hooks/useEntityList';
import type { ProyectoListItem } from '@/types/proyecto';
import { mesActual } from '@/utils/fecha';
import {
  agruparPorStatus,
  contarPorStatus,
  filtrarPorStatus,
  type FiltroProyecto,
  type ProyectoSection,
} from './agrupar';
import { coincideBusqueda, perteneceAlMes, primeraFechaInicio } from './proyectoFormat';

function claveFecha(proyecto: ProyectoListItem): string {
  return (primeraFechaInicio(proyecto) ?? proyecto.created_at ?? '').slice(0, 10);
}

function masRecientesPrimero(a: ProyectoListItem, b: ProyectoListItem): number {
  return claveFecha(b).localeCompare(claveFecha(a)) || (b.idx ?? b.id) - (a.idx ?? a.id);
}

export interface UseProyectosResult {
  /** Hay búsqueda: el listado abarca todos los meses, no solo `mes`. */
  global: boolean;
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  filtro: FiltroProyecto;
  setFiltro: (filtro: FiltroProyecto) => void;
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
 * encabezado de mes (`MesEncabezado`) deja hojear proyectos pasados.
 */
export function useProyectos(): UseProyectosResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroProyecto>('todos');

  const fetcher = useCallback((signal: AbortSignal) => listProyectos(signal), []);
  const { items, cargando, refrescando, error, recargar } = useEntityList<ProyectoListItem>({
    fetcher,
  });

  // Con texto en el buscador se ignora el mes: busca en todo el historial.
  const global = busqueda.trim().length > 0;
  const filtrados = useMemo(() => {
    if (!global) return items.filter((proyecto) => perteneceAlMes(proyecto, mes));
    return items.filter((proyecto) => coincideBusqueda(proyecto, busqueda)).sort(masRecientesPrimero);
  }, [items, mes, busqueda, global]);

  return {
    global,
    mes,
    setMes,
    busqueda,
    setBusqueda,
    filtro,
    setFiltro,
    secciones: useMemo(() => filtrarPorStatus(agruparPorStatus(filtrados), filtro), [filtrados, filtro]),
    total: filtrados.length,
    conteos: useMemo(() => contarPorStatus(filtrados), [filtrados]),
    cargando,
    refrescando,
    error,
    recargar,
  };
}
