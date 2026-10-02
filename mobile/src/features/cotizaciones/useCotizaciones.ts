import { useCallback, useMemo, useState } from 'react';
import { getCotizacion, listCotizaciones } from '@/api/cotizacionesApi';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import { useEntityList } from '@/hooks/useEntityList';
import type { Cotizacion, CotizacionListItem, CotizacionStatus } from '@/types/cotizacion';
import { mesActual } from '@/utils/fecha';
import { coincideBusqueda, resumenDelMes, STATUS_ORDER, statusLabel, type ResumenMes } from './cotizacionFormat';

export type FiltroCotizacion = CotizacionStatus | 'todas';

export interface SeccionCotizaciones {
  key: CotizacionStatus;
  title: string;
  data: CotizacionListItem[];
}

export interface UseCotizacionesResult {
  /** Hay búsqueda: el listado abarca todos los meses, no solo `mes`. */
  global: boolean;
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  filtro: FiltroCotizacion;
  setFiltro: (filtro: FiltroCotizacion) => void;
  secciones: SeccionCotizaciones[];
  /** Resumen de todo el mes (sin búsqueda ni filtro): el panel de montos. */
  resumen: ResumenMes;
  total: number;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Cotizaciones del mes: el servidor filtra por mes (y por «solo las mías» si
 * el permiso lo pide); la búsqueda y el filtro de estatus son locales para
 * que respondan al instante mientras se escribe.
 */
export function useCotizaciones(): UseCotizacionesResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroCotizacion>('todas');

  // Con texto en el buscador se trae todo el historial (sin `mes`); el fetcher
  // solo cambia al pasar de vacío a con texto, no en cada tecla.
  const global = busqueda.trim().length > 0;
  const fetcher = useCallback(
    (signal: AbortSignal) => listCotizaciones(global ? undefined : mes, signal),
    [mes, global],
  );
  const { items, cargando, refrescando, error, recargar } = useEntityList<CotizacionListItem>({ fetcher });

  const encontradas = useMemo(() => {
    const coinciden = items.filter((c) => coincideBusqueda(c, busqueda));
    return global ? coinciden.sort((a, b) => (b.idx ?? b.id) - (a.idx ?? a.id)) : coinciden;
  }, [items, busqueda, global]);

  const secciones = useMemo(
    () =>
      STATUS_ORDER.filter((s) => filtro === 'todas' || filtro === s)
        .map((key) => ({ key, title: statusLabel(key), data: encontradas.filter((c) => c.status === key) }))
        .filter((s) => s.data.length > 0),
    [encontradas, filtro],
  );

  return {
    global,
    mes,
    setMes,
    busqueda,
    setBusqueda,
    filtro,
    setFiltro,
    secciones,
    resumen: useMemo(() => resumenDelMes(global ? encontradas : items), [global, encontradas, items]),
    total: global ? encontradas.length : items.length,
    cargando,
    refrescando,
    error,
    recargar,
  };
}

export function useCotizacion(id: number | null) {
  const fetcher = useCallback((cotizacionId: number, signal: AbortSignal) => getCotizacion(cotizacionId, signal), []);
  const { data, cargando, error, recargar, aplicar } = useEntityDetail<Cotizacion>({
    id,
    fetcher,
    idInvalidoMensaje: 'Cotización no válida.',
  });
  return { cotizacion: data, cargando, error, recargar, aplicarCotizacion: aplicar };
}
