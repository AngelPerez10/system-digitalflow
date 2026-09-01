import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { getOrden } from '@/api/ordenesApi';
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
      const data = await getOrden(id, controller.signal);
      if (controller.signal.aborted) return;
      setOrden(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toUserMessage(err));
    } finally {
      if (!controller.signal.aborted) setCargando(false);
    }
  }, [id]);

  // Recarga al entrar y al volver de la edición: el detalle nunca queda viejo.
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
    aplicarOrden: useCallback((next: Orden) => setOrden(next), []),
  };
}
