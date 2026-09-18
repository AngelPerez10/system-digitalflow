import { useCallback } from 'react';
import { getOrdenCliente } from '@/api/portalClienteApi';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import type { Orden, OrdenCalificacion } from '@/types/orden';

export interface UseOrdenClienteResult {
  orden: Orden | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Refleja la calificación recién enviada sin volver a pedir el detalle. */
  aplicarCalificacion: (calificacion: OrdenCalificacion) => void;
}

/**
 * Detalle de una orden en el portal cliente. Lectura, salvo la calificación:
 * es la única cosa que el cliente aporta al expediente.
 */
export function useOrdenCliente(id: number | null): UseOrdenClienteResult {
  const fetcher = useCallback(
    (ordenId: number, signal: AbortSignal) => getOrdenCliente(ordenId, signal),
    [],
  );
  const { data, cargando, error, recargar, aplicar } = useEntityDetail<Orden>({
    id,
    fetcher,
    idInvalidoMensaje: 'Orden no válida.',
  });

  return {
    orden: data,
    cargando,
    error,
    recargar,
    aplicarCalificacion: useCallback(
      (calificacion: OrdenCalificacion) =>
        aplicar((actual) => (actual ? { ...actual, calificacion, puede_calificar: false } : actual)),
      [aplicar],
    ),
  };
}
