import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AgendaVista } from '@/features/agenda/components/AgendaVista';
import { useAgendaCliente } from '@/features/agenda/useAgendaCliente';
import type { AgendaItem } from '@/features/agenda/agendaItems';

/**
 * Agenda del portal cliente: sus órdenes del día.
 * (El portal no expone proyectos; solo servicios/órdenes.)
 */
export default function ClienteAgendaScreen() {
  const router = useRouter();
  const agenda = useAgendaCliente();

  const abrir = useCallback(
    (item: AgendaItem) => {
      router.push({ pathname: '/cliente/[id]', params: { id: String(item.id) } });
    },
    [router],
  );

  return (
    <AgendaVista
      fecha={agenda.fecha}
      semana={agenda.semana}
      items={agenda.items}
      esHoy={agenda.esHoy}
      cargando={agenda.cargando}
      refrescando={agenda.refrescando}
      error={agenda.error}
      onSeleccionarDia={agenda.setFecha}
      onHoy={agenda.irHoy}
      onRecargar={agenda.recargar}
      onAbrir={abrir}
      vacioTitulo="Sin servicios este día"
      vacioCuerpo="No hay servicios programados para la fecha seleccionada."
    />
  );
}
