import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { listOrdenesPool } from '@/api/ordenesApi';
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
 * Bolsa de órdenes disponibles. El servidor ya las trae ordenadas por
 * prioridad e ignora el filtro `own_only`, así que aquí no se agrupa ni filtra.
 * Recarga al enfocar la pantalla y con "jalar para refrescar".
 */
export function useOrdenesPool(): UseOrdenesPoolResult {
  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peticionActiva = useRef<AbortController | null>(null);

  const cargar = useCallback(async (modo: 'inicial' | 'refresco') => {
    peticionActiva.current?.abort();
    const controller = new AbortController();
    peticionActiva.current = controller;

    if (modo === 'refresco') setRefrescando(true);
    else setCargando(true);
    setError(null);

    try {
      const data = await listOrdenesPool(controller.signal);
      if (controller.signal.aborted) return;
      setOrdenes(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toUserMessage(err));
    } finally {
      if (!controller.signal.aborted) {
        setCargando(false);
        setRefrescando(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar('inicial');
      return () => peticionActiva.current?.abort();
    }, [cargar]),
  );

  return {
    ordenes,
    cargando,
    refrescando,
    error,
    recargar: useCallback(() => void cargar('refresco'), [cargar]),
    quitar: useCallback((id: number) => {
      setOrdenes((prev) => prev.filter((o) => o.id !== id));
    }, []),
  };
}
