import { useEffect, useMemo, useState } from 'react';
import { toUserMessage } from '@/api/errors';
import { listProyectos } from '@/api/proyectosApi';
import { proyectosConReporte } from '@/api/reportesApi';

/** Un proyecto del selector de origen, ya en forma de fila. */
export interface OpcionOrigen {
  id: number;
  folio: string;
  cliente: string;
  /** `YYYY-MM-DD` de la primera jornada del proyecto. */
  fecha: string | null;
  /** Folio del reporte que ya usa este proyecto (un proyecto admite uno solo). */
  ocupadoPor: string | null;
}

/**
 * Proyectos que se pueden ligar a un reporte (el origen ya no admite órdenes
 * de trabajo). El servidor los recorta a los del técnico (`own_only`). Se
 * piden solo mientras el selector está abierto, y solo si el rol ve Proyectos.
 */
export function useOrigenesReporte(abierto: boolean, excluirReporteId: number | null, puedeVerProyectos: boolean) {
  const [proyectos, setProyectos] = useState<OpcionOrigen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || !puedeVerProyectos) return;
    const control = new AbortController();
    const { signal } = control;
    setCargando(true);
    setError(null);
    Promise.all([
      listProyectos(signal),
      proyectosConReporte(excluirReporteId, signal).catch(() => ({}) as Record<string, string>),
    ])
      .then(([lista, ocupados]) => {
        setProyectos(
          lista
            .map((p) => ({
              id: p.id,
              folio: p.folio?.trim() || `PRJ-${p.idx ?? p.id}`,
              cliente: p.cliente_nombre?.trim() || 'Sin cliente',
              fecha: [...p.fechas_inicio].sort()[0] ?? null,
              ocupadoPor: ocupados[String(p.id)] ?? null,
            }))
            // Disponibles primero; dentro, lo más reciente arriba.
            .sort(
              (a, b) =>
                Number(Boolean(a.ocupadoPor)) - Number(Boolean(b.ocupadoPor)) ||
                (b.fecha ?? '').localeCompare(a.fecha ?? ''),
            ),
        );
      })
      .catch((e) => {
        if (!signal.aborted) setError(toUserMessage(e));
      })
      .finally(() => {
        if (!signal.aborted) setCargando(false);
      });
    return () => control.abort();
  }, [abierto, excluirReporteId, puedeVerProyectos]);

  return useMemo(() => ({ proyectos, cargando, error }), [proyectos, cargando, error]);
}

/** Búsqueda local por folio o cliente. */
export function filtrarOpciones(opciones: readonly OpcionOrigen[], termino: string): OpcionOrigen[] {
  const q = termino.trim().toLowerCase();
  if (!q) return [...opciones];
  return opciones.filter((o) => o.folio.toLowerCase().includes(q) || o.cliente.toLowerCase().includes(q));
}
