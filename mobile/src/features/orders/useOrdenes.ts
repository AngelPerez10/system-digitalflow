import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { listOrdenes } from '@/api/ordenesApi';
import type { OrdenListItem } from '@/types/orden';
import { mesActual } from '@/utils/fecha';
import { agruparPorStatus, contarPorStatus, type OrdenSection } from './agrupar';
import { coincideBusqueda } from './ordenFormat';

export interface UseOrdenesResult {
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  secciones: OrdenSection[];
  total: number;
  conteos: ReturnType<typeof contarPorStatus>;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Listado del mes. El servidor ya recorta a «mis órdenes» cuando el usuario
 * tiene `own_only`; aquí no se filtra por técnico para no duplicar la regla.
 */
export function useOrdenes(): UseOrdenesResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
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
        const data = await listOrdenes({ mes, signal: controller.signal });
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
    },
    [mes],
  );

  // Recarga al entrar y al volver del detalle/edición: la lista refleja el guardado.
  useFocusEffect(
    useCallback(() => {
      void cargar('inicial');
      return () => peticionActiva.current?.abort();
    }, [cargar]),
  );

  const filtradas = useMemo(
    () => ordenes.filter((orden) => coincideBusqueda(orden, busqueda)),
    [ordenes, busqueda],
  );

  return {
    mes,
    setMes,
    busqueda,
    setBusqueda,
    secciones: useMemo(() => agruparPorStatus(filtradas), [filtradas]),
    total: filtradas.length,
    conteos: useMemo(() => contarPorStatus(filtradas), [filtradas]),
    cargando,
    refrescando,
    error,
    recargar: useCallback(() => void cargar('refresco'), [cargar]),
  };
}
