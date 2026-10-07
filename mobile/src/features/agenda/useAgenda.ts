import { listOrdenes } from '@/api/ordenesApi';
import { listProyectos } from '@/api/proyectosApi';
import { useSession } from '@/auth/SessionProvider';
import { canViewModule } from '@/auth/permissions';
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

export interface UseAgendaResult {
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
 * Agenda del técnico: órdenes del mes seleccionado + proyectos visibles.
 * El servidor ya aplica `own_only`; aquí solo se filtra por día.
 */
export function useAgenda(hoy: string = fechaISO(new Date())): UseAgendaResult {
  const { user, permissions } = useSession();
  const [fecha, setFecha] = useState(hoy);
  const mes = mesDeFecha(fecha);

  const puedeOrdenes = canViewModule(permissions, user, 'ordenes');
  const puedeProyectos = canViewModule(permissions, user, 'proyectos');

  const fetchOrdenes = useCallback(
    (signal: AbortSignal) =>
      puedeOrdenes ? listOrdenes({ mes, signal }) : Promise.resolve([]),
    [mes, puedeOrdenes],
  );
  const fetchProyectos = useCallback(
    (signal: AbortSignal) =>
      puedeProyectos ? listProyectos(signal) : Promise.resolve([]),
    [puedeProyectos],
  );

  const {
    items: ordenesItems,
    cargando: cargandoOrdenes,
    refrescando: refrescandoOrdenes,
    error: errorOrdenes,
    recargar: recargarOrdenes,
  } = useEntityList({ fetcher: fetchOrdenes });
  const {
    items: proyectosItems,
    cargando: cargandoProyectos,
    refrescando: refrescandoProyectos,
    error: errorProyectos,
    recargar: recargarProyectos,
  } = useEntityList({ fetcher: fetchProyectos });

  const items = useMemo(
    () => construirAgendaDia(fecha, ordenesItems, proyectosItems),
    [fecha, ordenesItems, proyectosItems],
  );

  const semana = useMemo(() => semanaDe(fecha, hoy), [fecha, hoy]);

  const recargar = useCallback(() => {
    recargarOrdenes();
    recargarProyectos();
  }, [recargarOrdenes, recargarProyectos]);

  return {
    fecha,
    setFecha,
    irHoy: () => setFecha(hoy),
    semana,
    items,
    cargando: (puedeOrdenes && cargandoOrdenes) || (puedeProyectos && cargandoProyectos),
    refrescando: refrescandoOrdenes || refrescandoProyectos,
    error: errorOrdenes ?? errorProyectos,
    recargar,
    esHoy: fecha === hoy,
  };
}
