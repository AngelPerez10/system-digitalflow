import { parseReporte } from '@/api/reporteParsers';
import type { Reporte, ReporteZona } from '@/types/reporte';
import { miniaturaUrl } from '@/utils/miniatura';
import {
  agruparPorEvidencia,
  coincideBusqueda,
  contarPorEvidencia,
  diaSemana,
  estadoEvidencia,
  estadoZonas,
  evidenciaDe,
  filtrarSecciones,
  filtrarZonas,
  folioReporte,
  fotosPortada,
  perteneceAlMes,
  tecnicosDe,
} from '../reporteFormat';

const zona = (antes: number, despues: number, titulo = 'Zona'): ReporteZona => ({
  id: `z${antes}${despues}${titulo}`,
  titulo,
  fotos_antes: Array.from({ length: antes }, (_, i) => `a${i}`),
  fotos_despues: Array.from({ length: despues }, (_, i) => `d${i}`),
});

const reporte = (id: number, fecha: string, secciones: ReporteZona[], extra: Partial<Reporte> = {}): Reporte => ({
  id,
  idx: 10000 + id,
  folio: `RM-${10000 + id}`,
  orden_id: id,
  proyecto_id: null,
  origen_tipo: 'orden',
  orden_folio: `ODT-${id}`,
  orden_cliente: `Cliente ${id}`,
  fecha_servicio: fecha,
  tecnico_nombre: 'Ana Pérez',
  secciones,
  creado_por: null,
  creado_por_username: null,
  updated_at: null,
  ...extra,
});

describe('evidencia del reporte', () => {
  it('cuenta fotos y zonas completas, y toma la primera foto de cada lado como portada', () => {
    const ev = evidenciaDe({ secciones: [zona(0, 2), zona(1, 1), zona(3, 0)] });
    expect(ev).toEqual({
      antes: 4,
      despues: 3,
      fotos: 7,
      zonas: 3,
      completas: 1,
      portadaAntes: 'a0',
      portadaDespues: 'd0',
    });
  });

  it('clasifica sin / parcial / completa', () => {
    expect(estadoEvidencia({ secciones: [] })).toBe('sin');
    expect(estadoEvidencia({ secciones: [zona(0, 0)] })).toBe('sin');
    expect(estadoEvidencia({ secciones: [zona(2, 0)] })).toBe('parcial');
    expect(estadoEvidencia({ secciones: [zona(1, 1), zona(0, 1)] })).toBe('parcial');
    expect(estadoEvidencia({ secciones: [zona(1, 1), zona(2, 3)] })).toBe('completa');
  });
});

describe('agrupar y filtrar', () => {
  const items = [
    reporte(1, '2026-09-05', [zona(1, 1)]),
    reporte(2, '2026-09-20', []),
    reporte(3, '2026-09-12', [zona(2, 0)]),
    reporte(4, '2026-09-25', [zona(1, 2)]),
  ];

  it('pone primero lo que falta y ordena por fecha descendente dentro de cada grupo', () => {
    const secciones = agruparPorEvidencia(items);
    expect(secciones.map((s) => s.key)).toEqual(['sin', 'parcial', 'completa']);
    expect(secciones[2]?.data.map((r) => r.id)).toEqual([4, 1]);
  });

  it('cuenta por estado y filtra una sola sección', () => {
    expect(contarPorEvidencia(items)).toEqual({ sin: 1, parcial: 1, completa: 2 });
    expect(filtrarSecciones(agruparPorEvidencia(items), 'parcial').map((s) => s.key)).toEqual(['parcial']);
    expect(filtrarSecciones(agruparPorEvidencia(items), 'todos')).toHaveLength(3);
  });

  it('filtra por mes y busca por folio, origen, cliente o técnico', () => {
    const r = reporte(7, '2026-09-30', [], { tecnico_nombre: 'Luis Gómez', orden_cliente: 'Tostadería B1' });
    expect(perteneceAlMes(r, '2026-09')).toBe(true);
    expect(perteneceAlMes(r, '2026-10')).toBe(false);
    expect(coincideBusqueda(r, 'rm-10007')).toBe(true);
    expect(coincideBusqueda(r, 'odt-7')).toBe(true);
    expect(coincideBusqueda(r, 'tostader')).toBe(true);
    expect(coincideBusqueda(r, 'gómez')).toBe(true);
    expect(coincideBusqueda(r, 'zzz')).toBe(false);
  });
});

describe('formato', () => {
  it('folio de respaldo y técnicos sin vacíos ni repetidos', () => {
    expect(folioReporte({ folio: null, idx: 10003, id: 3 })).toBe('RM-10003');
    expect(tecnicosDe(' Ana  Pérez, , luis gómez,Ana Pérez ')).toEqual(['Ana Pérez', 'luis gómez']);
  });

  it('miniatura de Cloudinary con transformación; otras URLs intactas', () => {
    expect(miniaturaUrl('https://res.cloudinary.com/demo/image/upload/v1/r/x.jpg', 400)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_300,q_auto,f_auto/v1/r/x.jpg',
    );
    expect(miniaturaUrl('file:///foto.jpg')).toBe('file:///foto.jpg');
  });
});

describe('parseReporte', () => {
  it('normaliza el JSON del servidor, incluida la foto suelta del formato anterior', () => {
    const r = parseReporte({
      id: 5,
      idx: 10005,
      folio: 'RM-10005',
      orden_id: null,
      proyecto_id: 9,
      orden_folio: 'PRJ-9',
      orden_cliente: 'Hotel',
      fecha_servicio: '2026-09-01T00:00:00',
      tecnico_nombre: 'Ana',
      secciones: [{ id: 's1', titulo: 'Tablero', foto_antes_url: 'a.jpg', fotos_antes: ['a.jpg', 'b.jpg'], fotos_despues: null }],
    });
    expect(r.origen_tipo).toBe('proyecto');
    expect(r.fecha_servicio).toBe('2026-09-01');
    expect(r.secciones[0]).toEqual({ id: 's1', titulo: 'Tablero', fotos_antes: ['a.jpg', 'b.jpg'], fotos_despues: [] });
  });
});

describe('portada de la tarjeta', () => {
  it('alterna Antes y Después por zona y respeta el máximo', () => {
    const fotos = fotosPortada({ secciones: [zona(3, 2, 'A'), zona(1, 1, 'B')] }, 4);
    expect(fotos.map((f) => `${f.lado}:${f.url}`)).toEqual(['antes:a0', 'despues:d0', 'antes:a1', 'antes:a2']);
  });

  it('estado de cada zona para la barra segmentada', () => {
    expect(estadoZonas({ secciones: [zona(1, 1), zona(2, 0), zona(0, 0)] })).toEqual(['completa', 'parcial', 'sin']);
  });
});

describe('filtro de zonas del detalle', () => {
  it('separa completas de las que tienen faltantes, conservando el orden', () => {
    const zonas = [zona(1, 1, 'A'), zona(2, 0, 'B'), zona(0, 0, 'C'), zona(2, 2, 'D')];
    expect(filtrarZonas(zonas, 'todas')).toHaveLength(4);
    expect(filtrarZonas(zonas, 'completas').map((z) => z.titulo)).toEqual(['A', 'D']);
    expect(filtrarZonas(zonas, 'faltantes').map((z) => z.titulo)).toEqual(['B', 'C']);
  });
});

describe('diaSemana', () => {
  it('nombra el día de una fecha ISO y tolera fechas vacías', () => {
    expect(diaSemana('2026-09-29')).toBe('martes');
    expect(diaSemana('2026-10-04T10:00:00')).toBe('domingo');
    expect(diaSemana('')).toBe('');
  });
});
