import { agruparEquiposPorProducto, esEnlaceUbicacion, normalizarPrioridad, prioridadLabel } from '../ordenFormat';
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

/**
 * Algunas órdenes traen en `direccion` un enlace de Google Maps en vez de una
 * dirección legible. `OrdenCard` decide con esto si muestra el texto plano o
 * un botón «Ver ubicación en el mapa».
 */
describe('esEnlaceUbicacion', () => {
  it('reconoce un enlace de Google Maps', () => {
    expect(esEnlaceUbicacion('https://www.google.com/maps?q=19.05,-104.23')).toBe(true);
  });

  it('reconoce http sin s', () => {
    expect(esEnlaceUbicacion('http://maps.google.com/?q=0,0')).toBe(true);
  });

  it('tolera espacios alrededor', () => {
    expect(esEnlaceUbicacion('  https://maps.app.goo.gl/abc123  ')).toBe(true);
  });

  it('una dirección normal no es un enlace', () => {
    expect(esEnlaceUbicacion('Av. Reforma 100, Col. Centro')).toBe(false);
  });

  it('un texto vacío no es un enlace', () => {
    expect(esEnlaceUbicacion('')).toBe(false);
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
