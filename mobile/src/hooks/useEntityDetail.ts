import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';

export interface UseEntityDetailOptions<T> {
  id: number | null;
  /** Trae el recurso completo desde el API. Debe respetar `signal` para poder abortarse. */
  fetcher: (id: number, signal: AbortSignal) => Promise<T>;
  /** Mensaje cuando `id` es `null` (p. ej. parámetro de ruta inválido). */
  idInvalidoMensaje?: string;
}

export interface UseEntityDetailResult<T> {
  data: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Sustituye (o transforma) el dato en memoria tras una acción exitosa, sin volver a pedirlo al servidor. */
  aplicar: (data: T | ((actual: T | null) => T | null)) => void;
}

/**
 * Detalle de un recurso por id: carga al montar, recarga al recuperar el foco
 * (útil al volver de una pantalla de edición) y cancela peticiones en vuelo.
 *
 * `useFocusEffect` no es el disparador confiable de la primera carga en todas
 * las plataformas (en la vista web el evento de foco puede no llegar al
 * montar la pantalla), así que un `useEffect` normal garantiza la petición
 * inicial sin depender de eso.
 *
 * Ver también {@link useEntityList} para listados con búsqueda/filtro.
 */
export function useEntityDetail<T>({
  id,
  fetcher,
  idInvalidoMensaje = 'Recurso no válido.',
}: UseEntityDetailOptions<T>): UseEntityDetailResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const peticionActiva = useRef<AbortController | null>(null);

  const cargar = useCallback(async () => {
    if (id === null) {
      setError(idInvalidoMensaje);
      setCargando(false);
      return;
    }
    peticionActiva.current?.abort();
    const controller = new AbortController();
    peticionActiva.current = controller;
    setCargando(true);
    setError(null);
    try {
      const resultado = await fetcher(id, controller.signal);
      if (controller.signal.aborted) return;
      setData(resultado);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toUserMessage(err));
    } finally {
      if (!controller.signal.aborted) setCargando(false);
    }
  }, [id, fetcher, idInvalidoMensaje]);

  useEffect(() => {
    void cargar();
    return () => peticionActiva.current?.abort();
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
      return () => peticionActiva.current?.abort();
    }, [cargar]),
  );

  return {
    data,
    cargando,
    error,
    recargar: useCallback(() => void cargar(), [cargar]),
    aplicar: useCallback((next: T | ((actual: T | null) => T | null)) => setData(next), []),
  };
}
