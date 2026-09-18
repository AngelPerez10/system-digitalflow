import { useCallback } from 'react';
import { listOrdenesCliente } from '@/api/portalClienteApi';
import { useEntityList } from '@/hooks/useEntityList';
import type { OrdenListItem } from '@/types/orden';

export interface UseOrdenesClienteResult {
  ordenes: OrdenListItem[];
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Órdenes del portal cliente. Lista plana (sin selector de mes ni búsqueda):
 * el cliente tiene pocas órdenes y solo quiere ver en qué van. El servidor ya
 * la recorta a su `cliente_id`; aquí no se filtra nada.
 */
export function useOrdenesCliente(): UseOrdenesClienteResult {
  const fetcher = useCallback((signal: AbortSignal) => listOrdenesCliente({ signal }), []);
  const { items, cargando, refrescando, error, recargar } = useEntityList<OrdenListItem>({
    fetcher,
  });

  return { ordenes: items, cargando, refrescando, error, recargar };
}
