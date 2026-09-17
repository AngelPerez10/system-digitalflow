import { agruparEquiposPorProducto } from '../proyectoFormat';
import type { ProyectoEquipoLinea } from '@/types/proyecto';

function crearEquipo(overrides: Partial<ProyectoEquipoLinea>): ProyectoEquipoLinea {
  return {
    lineaId: 'l1',
    modelo: 'Caja de Derivación Estanca',
    modeloOriginal: 'Caja de Derivación Estanca',
    cantidad: 1,
    marca: 'TVC',
    imagenUrl: 'https://cdn/foto.jpg',
    estadoInstalacion: 'pendiente',
    equipoEntregado: true,
    ...overrides,
  };
}

describe('agruparEquiposPorProducto (Proyectos)', () => {
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
    expect(agruparEquiposPorProducto(equipos)).toHaveLength(2);
  });

  it('no agrupa si la entrega difiere', () => {
    const equipos = [
      crearEquipo({ lineaId: 'a', equipoEntregado: true }),
      crearEquipo({ lineaId: 'b', equipoEntregado: false }),
    ];
    expect(agruparEquiposPorProducto(equipos)).toHaveLength(2);
  });

  it('no agrupa productos distintos', () => {
    const equipos = [
      crearEquipo({ lineaId: 'a', modelo: 'Caja de Derivación Estanca' }),
      crearEquipo({ lineaId: 'b', modelo: 'Soporte de pared' }),
    ];
    expect(agruparEquiposPorProducto(equipos)).toHaveLength(2);
  });
});
