import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { getProyecto } from '@/api/proyectosApi';
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
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const peticionActiva = useRef<AbortController | null>(null);

  const cargar = useCallback(async () => {
    if (id === null) {
      setError('Proyecto no válido.');
      setCargando(false);
      return;
    }
    peticionActiva.current?.abort();
    const controller = new AbortController();
    peticionActiva.current = controller;
    setCargando(true);
    setError(null);
    try {
      const data = await getProyecto(id, controller.signal);
      if (controller.signal.aborted) return;
      setProyecto(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toUserMessage(err));
    } finally {
      if (!controller.signal.aborted) setCargando(false);
    }
  }, [id]);

  // `useFocusEffect` refresca al volver de editar, pero no es el disparador
  // confiable de la primera carga en todas las plataformas (en la vista web
  // el evento de foco puede no llegar al montar la pantalla) — este efecto
  // normal garantiza que la petición siempre sale, sin depender de eso.
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
    proyecto,
    cargando,
    error,
    recargar: useCallback(() => void cargar(), [cargar]),
    aplicarProyecto: useCallback((next: Proyecto) => setProyecto(next), []),
  };
}
