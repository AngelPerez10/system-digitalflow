import { useCallback } from 'react';
import { getReporte } from '@/api/reportesApi';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import type { Reporte } from '@/types/reporte';

export interface UseReporteResult {
  reporte: Reporte | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Sustituye el reporte en memoria tras guardar. */
  aplicarReporte: (reporte: Reporte) => void;
}

export function useReporte(id: number | null): UseReporteResult {
  const fetcher = useCallback((reporteId: number, signal: AbortSignal) => getReporte(reporteId, signal), []);
  const { data, cargando, error, recargar, aplicar } = useEntityDetail<Reporte>({
    id,
    fetcher,
    idInvalidoMensaje: 'Reporte no válido.',
  });
  return { reporte: data, cargando, error, recargar, aplicarReporte: aplicar };
}
