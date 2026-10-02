import type { Reporte } from '@/types/reporte';
import {
  construirPayload,
  formStateDesdeReporte,
  formStateNuevo,
  hayErrores,
  huella,
  nuevaZona,
  progresoZonas,
  validarReporte,
} from '../editarReporteForm';

const base: Reporte = {
  id: 3,
  idx: 10003,
  folio: 'RM-10003',
  orden_id: 44,
  proyecto_id: null,
  origen_tipo: 'orden',
  orden_folio: 'ODT-44',
  orden_cliente: 'Cliente',
  fecha_servicio: '2026-09-10',
  tecnico_nombre: 'Ana Pérez',
  secciones: [{ id: 's1', titulo: 'Tablero', fotos_antes: ['a'], fotos_despues: [] }],
  creado_por: 1,
  creado_por_username: 'ana',
  updated_at: null,
};

describe('formulario de reporte', () => {
  it('un reporte nuevo exige origen y nombre del técnico', () => {
    const errores = validarReporte(formStateNuevo('', '2026-09-10'));
    expect(errores.origen).toBeTruthy();
    expect(errores.tecnico_nombre).toBeTruthy();
    // La zona vacía inicial no cuenta como error.
    expect(errores.zonas).toBeUndefined();
  });

  it('una zona con fotos necesita nombre', () => {
    const form = formStateDesdeReporte(base);
    form.zonas = [{ ...form.zonas[0]!, titulo: '  ' }];
    expect(validarReporte(form).zonas?.s1).toBeTruthy();
  });

  it('el payload manda solo un origen, limpia nombres y descarta zonas vacías', () => {
    const form = formStateDesdeReporte(base);
    form.tecnico_nombre = 'Ana  Pérez,  Luis ,';
    form.zonas = [{ ...form.zonas[0]!, titulo: '  Tablero   norte ' }, nuevaZona()];
    expect(hayErrores(validarReporte(form))).toBe(false);
    expect(construirPayload(form)).toEqual({
      orden_id: 44,
      proyecto_id: null,
      fecha_servicio: '2026-09-10',
      tecnico_nombre: 'Ana Pérez, Luis',
      secciones: [{ id: 's1', titulo: 'Tablero norte', fotos_antes: ['a'], fotos_despues: [] }],
    });
  });

  it('detecta cambios por huella y mide el progreso de zonas', () => {
    const inicial = formStateDesdeReporte(base);
    const editado = { ...inicial, zonas: [{ ...inicial.zonas[0]!, fotos_despues: ['d'] }] };
    expect(huella(inicial)).toBe(huella(formStateDesdeReporte(base)));
    expect(huella(editado)).not.toBe(huella(inicial));
    expect(progresoZonas(inicial)).toEqual({ completas: 0, total: 1 });
    expect(progresoZonas(editado)).toEqual({ completas: 1, total: 1 });
  });
});
