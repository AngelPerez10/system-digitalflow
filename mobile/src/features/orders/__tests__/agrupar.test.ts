import type { OrdenListItem, OrdenStatus } from '@/types/orden';
import { agruparPorStatus, contarPorPrioridad, contarPorStatus, filtrarPorStatus } from '../agrupar';
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
    prioridad_pool: 'media',
    en_pool: false,
    liberada_por: null,
    liberada_at: null,
    tomada_por: null,
    tomada_at: null,
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

  it('pone «Saldo pendiente» entre pausadas y resueltas, sin pluralizarlo', () => {
    const secciones = agruparPorStatus([orden(1, 'resuelto'), orden(2, 'saldo_pendiente'), orden(3, 'pausado')]);
    expect(secciones.map((s) => s.key)).toEqual(['pausado', 'saldo_pendiente', 'resuelto']);
    expect(secciones[1]?.title).toBe('Saldo pendiente');
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
      saldo_pendiente: 0,
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

describe('filtrarPorStatus', () => {
  const secciones = agruparPorStatus([orden(1, 'pendiente'), orden(2, 'pausado'), orden(3, 'resuelto')]);

  it('deja todas las secciones con "todas"', () => {
    expect(filtrarPorStatus(secciones, 'todas').map((s) => s.key)).toEqual(['pendiente', 'pausado', 'resuelto']);
  });

  it('deja solo la sección del estatus elegido', () => {
    expect(filtrarPorStatus(secciones, 'pausado').map((s) => s.key)).toEqual(['pausado']);
  });

  it('regresa vacío si el estatus no tiene órdenes', () => {
    expect(filtrarPorStatus(agruparPorStatus([orden(1, 'pendiente')]), 'resuelto')).toEqual([]);
  });
});

describe('contarPorPrioridad', () => {
  it('cuenta alta, media y baja; lo desconocido o vacío cae en media', () => {
    const conteo = contarPorPrioridad([
      orden(1, 'pendiente', { prioridad_pool: 'alta' }),
      orden(2, 'pendiente', { prioridad_pool: 'ALTA' }),
      orden(3, 'pendiente', { prioridad_pool: 'baja' }),
      orden(4, 'pendiente', { prioridad_pool: null }),
      orden(5, 'pendiente', { prioridad_pool: 'urgente' }),
    ]);
    expect(conteo).toEqual({ alta: 2, media: 2, baja: 1 });
  });
});
