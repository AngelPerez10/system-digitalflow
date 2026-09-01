import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { listOrdenesCliente } from '@/api/portalClienteApi';
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
      const data = await listOrdenesCliente({ signal: controller.signal });
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
  };
}
