import type { OrdenListItem, OrdenStatus } from '@/types/orden';
import { agruparPorStatus, contarPorStatus } from '../agrupar';
import { coincideBusqueda, folioDisplay } from '../ordenFormat';

function orden(id: number, status: OrdenStatus, extra: Partial<OrdenListItem> = {}): OrdenListItem {
  return {
    id,
    idx: id,
    folio: `ODT-${id}`,
    tipo_orden: 'servicio_tecnico',
    cliente: 'ACME',
    cliente_nombre: null,
    direccion: 'Calle 1',
    telefono_cliente: null,
    problematica: null,
    status,
    motivo_pausa: null,
    prioridad: 'media',
    fecha_inicio: '2026-08-20',
    hora_inicio: null,
    fecha_finalizacion: null,
    hora_termino: null,
    nombre_cliente: null,
    nombre_encargado: null,
    tecnico_asignado: 1,
    tecnico_asignado_full_name: null,
    tecnico_asignado_avatar_url: null,
    creado_por: 1,
    fecha_creacion: null,
    ...extra,
  };
}

describe('agruparPorStatus', () => {
  it('respeta el orden del listado web: pendientes, pausadas, resueltas', () => {
    const secciones = agruparPorStatus([orden(1, 'resuelto'), orden(2, 'pendiente'), orden(3, 'pausado')]);
    expect(secciones.map((s) => s.key)).toEqual(['pendiente', 'pausado', 'resuelto']);
  });

  it('omite las secciones vacías', () => {
    const secciones = agruparPorStatus([orden(1, 'pendiente')]);
    expect(secciones).toHaveLength(1);
    expect(secciones[0]?.title).toBe('Pendientes');
  });

  it('cuenta por estatus', () => {
    expect(contarPorStatus([orden(1, 'pendiente'), orden(2, 'pendiente'), orden(3, 'resuelto')])).toEqual({
      pendiente: 2,
      pausado: 0,
      resuelto: 1,
    });
  });
});

describe('folioDisplay', () => {
  it('cae al consecutivo cuando no hay folio', () => {
    expect(folioDisplay({ folio: null, idx: 77, id: 5 })).toBe('#77');
    expect(folioDisplay({ folio: null, idx: null, id: 5 })).toBe('#5');
  });
});

describe('coincideBusqueda', () => {
  it('busca sin distinguir mayúsculas en folio, cliente y dirección', () => {
    const item = orden(9, 'pendiente', { direccion: 'Av. Reforma 100' });
    expect(coincideBusqueda(item, 'odt-9')).toBe(true);
    expect(coincideBusqueda(item, 'reforma')).toBe(true);
    expect(coincideBusqueda(item, 'acme')).toBe(true);
    expect(coincideBusqueda(item, 'zzz')).toBe(false);
  });

  it('sin término devuelve todo', () => {
    expect(coincideBusqueda(orden(1, 'pendiente'), '   ')).toBe(true);
  });
});
