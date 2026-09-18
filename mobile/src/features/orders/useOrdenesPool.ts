import { useCallback } from 'react';
import { listOrdenesPool } from '@/api/ordenesApi';
import { useEntityList } from '@/hooks/useEntityList';
import type { OrdenListItem } from '@/types/orden';

export interface UseOrdenesPoolResult {
  ordenes: OrdenListItem[];
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
  /** Quita una orden de la lista local sin volver a pedir (tras tomarla). */
  quitar: (id: number) => void;
}

/**
 * Órdenes disponibles (liberadas a la lista). El servidor ya las trae ordenadas por
 * prioridad e ignora el filtro `own_only`, así que aquí no se agrupa ni filtra.
 * Recarga al enfocar la pantalla y con "jalar para refrescar".
 */
export function useOrdenesPool(): UseOrdenesPoolResult {
  const fetcher = useCallback((signal: AbortSignal) => listOrdenesPool(signal), []);
  const { items, cargando, refrescando, error, recargar, mutar } = useEntityList<OrdenListItem>({
    fetcher,
  });

  return {
    ordenes: items,
    cargando,
    refrescando,
    error,
    recargar,
    quitar: useCallback((id: number) => mutar((prev) => prev.filter((o) => o.id !== id)), [mutar]),
  };
}
