import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { listProyectos } from '@/api/proyectosApi';
import type { ProyectoListItem } from '@/types/proyecto';
import { mesActual } from '@/utils/fecha';
import { agruparPorStatus, contarPorStatus, type ProyectoSection } from './agrupar';
import { coincideBusqueda, perteneceAlMes } from './proyectoFormat';

export interface UseProyectosResult {
  mes: string;
  setMes: (mes: string) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  secciones: ProyectoSection[];
  total: number;
  conteos: ReturnType<typeof contarPorStatus>;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * El backend trae todos los proyectos visibles («mis proyectos» ya recortado
 * por `own_only`, igual que en Órdenes) — aquí se pagina por mes en el
 * cliente, ya que `fechas_inicio` es un arreglo JSON y no un campo de fecha
 * indexable como el de Órdenes. Por defecto muestra el mes actual; el
 * `MesSelector` deja hojear proyectos pasados.
 */
export function useProyectos(): UseProyectosResult {
  const [mes, setMes] = useState(() => mesActual());
  const [busqueda, setBusqueda] = useState('');
  const [proyectos, setProyectos] = useState<ProyectoListItem[]>([]);
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
      const data = await listProyectos(controller.signal);
      if (controller.signal.aborted) return;
      setProyectos(data);
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

  // Un solo disparador (no uno de montaje + otro de enfoque): con los dos a
  // la vez, la primera entrada a la pantalla pedía el listado dos veces
  // seguidas — la petición duplicada se aborta, pero el viaje de red de más
  // es justo lo que hacía sentir la carga más lenta de lo que es.
  useFocusEffect(
    useCallback(() => {
      void cargar('inicial');
      return () => peticionActiva.current?.abort();
    }, [cargar]),
  );

  const filtrados = useMemo(
    () =>
      proyectos.filter(
        (proyecto) => perteneceAlMes(proyecto, mes) && coincideBusqueda(proyecto, busqueda),
      ),
    [proyectos, mes, busqueda],
  );

  return {
    mes,
    setMes,
    busqueda,
    setBusqueda,
    secciones: useMemo(() => agruparPorStatus(filtrados), [filtrados]),
    total: filtrados.length,
    conteos: useMemo(() => contarPorStatus(filtrados), [filtrados]),
    cargando,
    refrescando,
    error,
    recargar: useCallback(() => void cargar('refresco'), [cargar]),
  };
}
