import { listOrdenesCliente } from '@/api/portalClienteApi';
import { useEntityList } from '@/hooks/useEntityList';
import { useCallback, useMemo, useState } from 'react';
import {
  construirAgendaDia,
  fechaISO,
  mesDeFecha,
  semanaDe,
  type AgendaItem,
  type DiaSemana,
} from './agendaItems';

export interface UseAgendaClienteResult {
  fecha: string;
  setFecha: (fecha: string) => void;
  irHoy: () => void;
  semana: DiaSemana[];
  items: AgendaItem[];
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  recargar: () => void;
  esHoy: boolean;
}

/**
 * Agenda del portal cliente: solo sus órdenes (el portal no expone proyectos).
 */
export function useAgendaCliente(hoy: string = fechaISO(new Date())): UseAgendaClienteResult {
  const [fecha, setFecha] = useState(hoy);
  const mes = mesDeFecha(fecha);

  const fetcher = useCallback(
    (signal: AbortSignal) => listOrdenesCliente({ mes, signal }),
    [mes],
  );
  const { items: ordenes, cargando, refrescando, error, recargar } = useEntityList({ fetcher });

  const items = useMemo(() => construirAgendaDia(fecha, ordenes, []), [fecha, ordenes]);
  const semana = useMemo(() => semanaDe(fecha, hoy), [fecha, hoy]);

  return {
    fecha,
    setFecha,
    irHoy: () => setFecha(hoy),
    semana,
    items,
    cargando,
    refrescando,
    error,
    recargar,
    esHoy: fecha === hoy,
  };
}
