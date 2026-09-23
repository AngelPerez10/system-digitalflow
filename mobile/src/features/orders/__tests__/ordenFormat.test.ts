import {
  agruparEquiposPorProducto,
  duracionServicio,
  haceCuanto,
  normalizarPrioridad,
  prioridadLabel,
} from '../ordenFormat';
import type { EquipoInventarioItem } from '@/types/orden';

function crearEquipo(overrides: Partial<EquipoInventarioItem>): EquipoInventarioItem {
  return {
    lineaId: 'l1',
    inventarioItemId: 1,
    nombre: 'Soporte de pared',
    marca: 'TVC',
    modelo: 'SP-100',
    imagenUrl: 'https://cdn/foto.jpg',
    cantidad: 1,
    equipoEntregado: true,
    estadoInstalacion: 'no_instalado',
    ...overrides,
  };
}

describe('agruparEquiposPorProducto', () => {
  it('agrupa el mismo producto repetido en una sola fila y suma la cantidad', () => {
    const equipos = Array.from({ length: 8 }, (_, i) => crearEquipo({ lineaId: `l${i}` }));
    const resultado = agruparEquiposPorProducto(equipos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.cantidad).toBe(8);
    expect(resultado[0]?.lineaIds).toHaveLength(8);
  });

  it('no agrupa si el estatus de instalación difiere', () => {
    const equipos = [
      crearEquipo({ lineaId: 'a', estadoInstalacion: 'instalado' }),
      crearEquipo({ lineaId: 'b', estadoInstalacion: 'no_instalado' }),
    ];
    const resultado = agruparEquiposPorProducto(equipos);
    expect(resultado).toHaveLength(2);
  });

  it('no agrupa si la entrega difiere', () => {
    const equipos = [
      crearEquipo({ lineaId: 'a', equipoEntregado: true }),
      crearEquipo({ lineaId: 'b', equipoEntregado: false }),
    ];
    const resultado = agruparEquiposPorProducto(equipos);
    expect(resultado).toHaveLength(2);
  });

  it('no agrupa productos distintos', () => {
    const equipos = [
      crearEquipo({ lineaId: 'a', nombre: 'Soporte de pared' }),
      crearEquipo({ lineaId: 'b', nombre: 'Cámara domo' }),
    ];
    const resultado = agruparEquiposPorProducto(equipos);
    expect(resultado).toHaveLength(2);
  });
});

describe('normalizarPrioridad / prioridadLabel', () => {
  it('reconoce los tres niveles', () => {
    expect(normalizarPrioridad('alta')).toBe('alta');
    expect(normalizarPrioridad('media')).toBe('media');
    expect(normalizarPrioridad('baja')).toBe('baja');
  });

  it('tolera mayúsculas y espacios', () => {
    expect(normalizarPrioridad('  ALTA ')).toBe('alta');
  });

  it('cae en media ante valor desconocido o nulo', () => {
    expect(normalizarPrioridad(null)).toBe('media');
    expect(normalizarPrioridad('urgentísima')).toBe('media');
    expect(normalizarPrioridad(undefined)).toBe('media');
  });

  it('etiqueta legible', () => {
    expect(prioridadLabel('alta')).toBe('Alta');
    expect(prioridadLabel(null)).toBe('Media');
  });
});

describe('duracionServicio', () => {
  const base = { fecha_inicio: '2026-09-01', hora_inicio: '09:00:00', fecha_finalizacion: null, hora_termino: null };

  it('devuelve null si falta el fin', () => {
    expect(duracionServicio(base)).toBeNull();
  });

  it('formatea horas y minutos el mismo día', () => {
    expect(duracionServicio({ ...base, fecha_finalizacion: '2026-09-01', hora_termino: '11:30' })).toBe('2 h 30 min');
    expect(duracionServicio({ ...base, fecha_finalizacion: '2026-09-01', hora_termino: '09:45' })).toBe('45 min');
  });

  it('cruza días y omite los minutos cuando hay días', () => {
    expect(duracionServicio({ ...base, fecha_finalizacion: '2026-09-02', hora_termino: '12:20' })).toBe('1 d 3 h');
  });

  it('devuelve null si el fin no es posterior al inicio', () => {
    expect(duracionServicio({ ...base, fecha_finalizacion: '2026-09-01', hora_termino: '08:00' })).toBeNull();
  });
});

describe('haceCuanto', () => {
  const ahora = new Date('2026-09-22T12:00:00Z');

  it('minutos, horas y días', () => {
    expect(haceCuanto('2026-09-22T11:55:00Z', ahora)).toBe('hace 5 min');
    expect(haceCuanto('2026-09-22T09:00:00Z', ahora)).toBe('hace 3 h');
    expect(haceCuanto('2026-09-20T12:00:00Z', ahora)).toBe('hace 2 d');
  });

  it('«ahora» para menos de un minuto o fechas futuras', () => {
    expect(haceCuanto('2026-09-22T11:59:40Z', ahora)).toBe('ahora');
    expect(haceCuanto('2026-09-22T12:05:00Z', ahora)).toBe('ahora');
  });

  it('null si falta o es inválido', () => {
    expect(haceCuanto(null, ahora)).toBeNull();
    expect(haceCuanto('no es fecha', ahora)).toBeNull();
  });
});

