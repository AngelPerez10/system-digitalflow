import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { getOrdenCliente } from '@/api/portalClienteApi';
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
  const [orden, setOrden] = useState<Orden | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const peticionActiva = useRef<AbortController | null>(null);

  const cargar = useCallback(async () => {
    if (id === null) {
      setError('Orden no válida.');
      setCargando(false);
      return;
    }
    peticionActiva.current?.abort();
    const controller = new AbortController();
    peticionActiva.current = controller;
    setCargando(true);
    setError(null);
    try {
      const data = await getOrdenCliente(id, controller.signal);
      if (controller.signal.aborted) return;
      setOrden(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toUserMessage(err));
    } finally {
      if (!controller.signal.aborted) setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
      return () => peticionActiva.current?.abort();
    }, [cargar]),
  );

  return {
    orden,
    cargando,
    error,
    recargar: useCallback(() => void cargar(), [cargar]),
    aplicarCalificacion: useCallback((calificacion: OrdenCalificacion) => {
      setOrden((actual) =>
        actual ? { ...actual, calificacion, puede_calificar: false } : actual,
      );
    }, []),
  };
}
