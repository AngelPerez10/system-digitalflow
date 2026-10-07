import {
  construirAgendaDia,
  etiquetaDiaCabecera,
  fechaISO,
  semanaDe,
} from '../agendaItems';
import type { OrdenListItem } from '@/types/orden';
import type { ProyectoListItem } from '@/types/proyecto';

function orden(parcial: Partial<OrdenListItem> & Pick<OrdenListItem, 'id'>): OrdenListItem {
  return {
    idx: parcial.idx ?? parcial.id,
    folio: parcial.folio ?? `OS-${parcial.id}`,
    tipo_orden: parcial.tipo_orden ?? 'servicio_tecnico',
    cliente: null,
    cliente_nombre: parcial.cliente_nombre ?? 'Cliente SA',
    direccion: parcial.direccion ?? 'Calle 1',
    telefono_cliente: null,
    problematica: parcial.problematica ?? 'Falla GPS',
    status: parcial.status ?? 'pendiente',
    motivo_pausa: null,
    prioridad: null,
    prioridad_pool: null,
    en_pool: false,
    liberada_por: null,
    liberada_at: null,
    tomada_por: null,
    tomada_at: null,
    fecha_inicio: parcial.fecha_inicio ?? '2026-10-06',
    hora_inicio: parcial.hora_inicio ?? '09:00',
    fecha_finalizacion: null,
    hora_termino: parcial.hora_termino ?? '10:30',
    nombre_cliente: null,
    nombre_encargado: null,
    tecnico_asignado: null,
    tecnico_asignado_full_name: parcial.tecnico_asignado_full_name ?? 'Ana Técnico',
    tecnico_asignado_avatar_url: null,
    creado_por: null,
    fecha_creacion: parcial.fecha_creacion ?? null,
    ...parcial,
    id: parcial.id,
  };
}

function proyecto(
  parcial: Partial<ProyectoListItem> & Pick<ProyectoListItem, 'id'>,
): ProyectoListItem {
  return {
    idx: parcial.idx ?? parcial.id,
    folio: parcial.folio ?? `PRJ-${parcial.id}`,
    cliente_id: 1,
    cliente_nombre: parcial.cliente_nombre ?? 'Acme',
    status: parcial.status ?? 'en_proceso',
    motivo_pausa: null,
    tipo_trabajo_nombre: parcial.tipo_trabajo_nombre ?? 'CCTV',
    tipos_trabajo: [],
    fechas_inicio: parcial.fechas_inicio ?? ['2026-10-06'],
    hora_llegada: parcial.hora_llegada ?? '11:00',
    hora_salida: parcial.hora_salida ?? '13:00',
    tecnicos: parcial.tecnicos ?? [{ id: 1, nombre: 'Luis', responsable: true }],
    auxiliares: [],
    cotizaciones_count: 0,
    cotizacion_folio: null,
    cotizacion_origen: null,
    equipos_total: 0,
    equipos_entregados: 0,
    equipos_instalados: 0,
    porcentaje_avance: 0,
    notas_por_dia: [],
    status_changed_by_full_name: null,
    status_changed_at: null,
    created_at: parcial.created_at ?? null,
    ...parcial,
    id: parcial.id,
  };
}

describe('semanaDe', () => {
  it('arma la semana domingo–sábado alrededor de la fecha', () => {
    // 2026-10-06 es martes
    const semana = semanaDe('2026-10-06', '2026-10-06');
    expect(semana.map((d) => d.fecha)).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
    expect(semana[2]?.esHoy).toBe(true);
    expect(semana[2]?.letra).toBe('M');
  });
});

describe('etiquetaDiaCabecera', () => {
  it('formatea número, día corto y mes en español', () => {
    expect(etiquetaDiaCabecera('2026-10-06')).toEqual({
      numero: '6',
      dia: 'Mar',
      mesAnio: 'Oct 2026',
    });
  });
});

describe('construirAgendaDia', () => {
  it('une órdenes y proyectos del día ordenados por hora', () => {
    const items = construirAgendaDia(
      '2026-10-06',
      [
        orden({ id: 2, hora_inicio: '14:00', status: 'resuelto' }),
        orden({ id: 1, hora_inicio: '09:00', fecha_inicio: '2026-10-05' }),
      ],
      [proyecto({ id: 9, hora_llegada: '11:00' })],
    );
    expect(items.map((i) => i.key)).toEqual(['proyecto-9-2026-10-06', 'orden-2']);
    expect(items[0]?.destacado).toBe(true);
    expect(items[1]?.destacado).toBe(false);
  });

  it('destaca la primera actividad si no hay ninguna en curso', () => {
    const items = construirAgendaDia(
      '2026-10-06',
      [orden({ id: 1, status: 'resuelto', hora_inicio: '08:00' })],
      [],
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.destacado).toBe(true);
  });

  it('ignora ítems de otras fechas', () => {
    expect(
      construirAgendaDia(
        '2026-10-07',
        [orden({ id: 1, fecha_inicio: '2026-10-06' })],
        [proyecto({ id: 2, fechas_inicio: ['2026-10-06'] })],
      ),
    ).toEqual([]);
  });
});

describe('fechaISO', () => {
  it('usa el calendario local', () => {
    expect(fechaISO(new Date(2026, 9, 6))).toBe('2026-10-06');
  });
});
