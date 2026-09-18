import { useCallback } from 'react';
import { getProyecto } from '@/api/proyectosApi';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import type { Proyecto } from '@/types/proyecto';

export interface UseProyectoResult {
  proyecto: Proyecto | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Sustituye el proyecto en memoria tras un guardado exitoso. */
  aplicarProyecto: (proyecto: Proyecto) => void;
}

/** Detalle completo: obligatorio antes de editar (el listado hace defer de cotizaciones/equipos/bitácora). */
export function useProyecto(id: number | null): UseProyectoResult {
  const fetcher = useCallback(
    (proyectoId: number, signal: AbortSignal) => getProyecto(proyectoId, signal),
    [],
  );
  const { data, cargando, error, recargar, aplicar } = useEntityDetail<Proyecto>({
    id,
    fetcher,
    idInvalidoMensaje: 'Proyecto no válido.',
  });

  return { proyecto: data, cargando, error, recargar, aplicarProyecto: aplicar };
}
