import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';

export interface UseEntityListOptions<T> {
  /**
   * Trae el arreglo completo desde el API. Debe respetar `signal` para poder
   * abortarse. Si el fetcher depende de un filtro server-side (p. ej. mes),
   * envuélvelo en `useCallback` con ese filtro como dependencia — la lista se
   * recarga automáticamente cuando el fetcher cambia mientras la pantalla
   * está enfocada.
   */
  fetcher: (signal: AbortSignal) => Promise<T[]>;
}

export interface UseEntityListResult<T> {
  items: T[];
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
  /** Actualiza los items en memoria sin volver a pedirlos (p. ej. quitar uno tras una acción). */
  mutar: (actualizar: (items: T[]) => T[]) => void;
}

/**
 * Listado crudo de un recurso: carga al entrar, recarga al recuperar el foco
 * (la lista refleja lo guardado al volver del detalle/edición) y cancela
 * peticiones en vuelo. No incluye búsqueda, filtro por mes ni agrupamiento —
 * eso es responsabilidad de cada `use<Recurso>s` de feature, que envuelve
 * este hook y deriva `secciones`/`conteos` con `useMemo` sobre `items`.
 *
 * Ver también {@link useEntityDetail} para el detalle de un solo recurso.
 */
export function useEntityList<T>({ fetcher }: UseEntityListOptions<T>): UseEntityListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peticionActiva = useRef<AbortController | null>(null);

  const cargar = useCallback(
    async (modo: 'inicial' | 'refresco') => {
      peticionActiva.current?.abort();
      const controller = new AbortController();
      peticionActiva.current = controller;

      if (modo === 'refresco') setRefrescando(true);
      else setCargando(true);
      setError(null);

      try {
        const data = await fetcher(controller.signal);
        if (controller.signal.aborted) return;
        setItems(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(toUserMessage(err));
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
          setRefrescando(false);
        }
      }
    },
    [fetcher],
  );

  useFocusEffect(
    useCallback(() => {
      void cargar('inicial');
      return () => peticionActiva.current?.abort();
    }, [cargar]),
  );

  return {
    items,
    cargando,
    refrescando,
    error,
    recargar: useCallback(() => void cargar('refresco'), [cargar]),
    mutar: useCallback((actualizar: (items: T[]) => T[]) => setItems(actualizar), []),
  };
}
