import type { ProyectoListItem, ProyectoStatus } from '@/types/proyecto';
import { agruparPorStatus, contarPorStatus, filtrarPorStatus } from '../agrupar';
import { diasDeTrabajo, resumenEquipo } from '../proyectoFormat';

function proyecto(id: number, status: ProyectoStatus, extra: Partial<ProyectoListItem> = {}): ProyectoListItem {
  return {
    id,
    idx: id,
    folio: `PRY-${id}`,
    cliente_id: 1,
    cliente_nombre: 'ACME',
    status,
    motivo_pausa: null,
    tipo_trabajo_nombre: null,
    tipos_trabajo: [],
    fechas_inicio: ['2026-09-01'],
    hora_llegada: null,
    hora_salida: null,
    tecnicos: [],
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
    created_at: null,
    ...extra,
  };
}

describe('agrupar proyectos', () => {
  const lista = [proyecto(1, 'cerrado'), proyecto(2, 'en_proceso'), proyecto(3, 'en_proceso'), proyecto(4, 'pausado')];

  it('agrupa en el orden en proceso → pausado → cerrado y omite vacías', () => {
    expect(agruparPorStatus(lista).map((s) => [s.key, s.data.length])).toEqual([
      ['en_proceso', 2],
      ['pausado', 1],
      ['cerrado', 1],
    ]);
  });

  it('cuenta por estatus', () => {
    expect(contarPorStatus(lista)).toEqual({ en_proceso: 2, pausado: 1, cerrado: 1, cancelado: 0 });
  });

  it('filtra secciones por estatus', () => {
    const secciones = agruparPorStatus(lista);
    expect(filtrarPorStatus(secciones, 'todos')).toHaveLength(3);
    expect(filtrarPorStatus(secciones, 'pausado').map((s) => s.key)).toEqual(['pausado']);
    expect(filtrarPorStatus(secciones, 'cancelado')).toEqual([]);
  });
});

describe('resumenEquipo', () => {
  it('responsable primero y el resto como «+N»', () => {
    const p = proyecto(1, 'en_proceso', {
      tecnicos: [
        { id: 1, nombre: 'Ana Ruiz', responsable: false },
        { id: 2, nombre: 'Luis Díaz', responsable: true },
      ],
      auxiliares: [{ id: 3, nombre: 'Eva Paz' }],
    });
    expect(resumenEquipo(p)).toEqual({
      nombres: ['Luis Díaz', 'Ana Ruiz', 'Eva Paz'],
      titulo: 'Luis Díaz',
      extra: 2,
    });
  });

  it('sin personas asignadas', () => {
    expect(resumenEquipo(proyecto(1, 'en_proceso'))).toEqual({ nombres: [], titulo: 'Sin técnico asignado', extra: 0 });
  });

  it('ignora nombres vacíos', () => {
    const p = proyecto(1, 'en_proceso', { auxiliares: [{ id: 3, nombre: '  ' }] });
    expect(resumenEquipo(p).nombres).toEqual([]);
  });
});


describe('diasDeTrabajo', () => {
  const nota = (id: string) => ({ id, nota: 'x', imagenesUrls: [] });

  it('la bitácora manda cuando tiene más días que el rango programado', () => {
    const p = proyecto(1, 'en_proceso', { fechas_inicio: ['2026-09-01'], notas_por_dia: [nota('a'), nota('b'), nota('c')] });
    expect(diasDeTrabajo(p)).toEqual({ programados: 1, enBitacora: 3, total: 3 });
  });

  it('el rango manda cuando aún no hay notas; fechas repetidas cuentan una vez', () => {
    const p = proyecto(1, 'en_proceso', {
      fechas_inicio: ['2026-09-01', '2026-09-02', '2026-09-02T00:00:00', ''],
      notas_por_dia: [],
    });
    expect(diasDeTrabajo(p)).toEqual({ programados: 2, enBitacora: 0, total: 2 });
  });
});
