import React, { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { AgendaVista } from '@/features/agenda/components/AgendaVista';
import { useAgenda } from '@/features/agenda/useAgenda';
import type { AgendaItem } from '@/features/agenda/agendaItems';

/** Vista Agenda del técnico: órdenes y proyectos asignados en franja horaria. */
export default function AgendaScreen() {
  const router = useRouter();
  const agenda = useAgenda();

  const abrir = useCallback(
    (item: AgendaItem) => {
      if (item.kind === 'orden') {
        router.push(`/ordenes/${item.id}` as Href);
        return;
      }
      router.push(`/proyectos/${item.id}` as Href);
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
    />
  );
}
