import { useCallback } from 'react';
import { getOrden } from '@/api/ordenesApi';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import type { Orden } from '@/types/orden';

export interface UseOrdenResult {
  orden: Orden | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Sustituye la orden en memoria tras un guardado exitoso. */
  aplicarOrden: (orden: Orden) => void;
}

/** Detalle completo: obligatorio antes de editar (el listado hace defer de fotos/firmas). */
export function useOrden(id: number | null): UseOrdenResult {
  const fetcher = useCallback((ordenId: number, signal: AbortSignal) => getOrden(ordenId, signal), []);
  const { data, cargando, error, recargar, aplicar } = useEntityDetail<Orden>({
    id,
    fetcher,
    idInvalidoMensaje: 'Orden no válida.',
  });

  return { orden: data, cargando, error, recargar, aplicarOrden: aplicar };
}
