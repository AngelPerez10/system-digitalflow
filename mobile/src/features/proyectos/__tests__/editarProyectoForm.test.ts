import type { Proyecto } from '@/types/proyecto';
import {
  construirPatch,
  contarCambios,
  formStateFromProyecto,
  primeraSeccionConErrorProyecto,
  seccionesCompletasProyecto,
} from '../editarProyectoForm';

function proyecto(extra: Partial<Proyecto> = {}): Proyecto {
  return {
    id: 1,
    idx: 1,
    folio: 'PRJ-1',
    cliente_id: 1,
    cliente_nombre: 'ACME',
    status: 'en_proceso',
    motivo_pausa: null,
    tipo_trabajo_nombre: null,
    tipos_trabajo: [],
    fechas_inicio: [],
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
    motivo_cancelacion: null,
    fecha_autorizacion: null,
    quien_autorizo: null,
    vehiculo_asignado: null,
    herramientas_generales: null,
    cotizaciones: [],
    equipos: [],
    incidencias: null,
    requerimientos_adicionales: null,
    requiere_presupuesto_adicional: false,
    monitoreo: null,
    cotizacion_adicional: null,
    status_administrativo: 'pendiente',
    evidencias_urls: [],
    firma_cliente_url: null,
    firma_tecnico_url: null,
    ...extra,
  };
}

describe('seccionesCompletasProyecto', () => {
  it('proyecto vacío: solo equipos (sin equipos) cuenta como completo', () => {
    const p = proyecto();
    expect(seccionesCompletasProyecto(formStateFromProyecto(p), p)).toEqual({
      estatus: true,
      jornadas: false,
      equipos: true,
      bitacora: false,
      avance: false,
      evidencia: false,
    });
  });

  it('alarmas exige elegir monitoreo; pausado exige motivo', () => {
    const p = proyecto({ tipos_trabajo: [{ id: 1, nombre: 'Alarmas' }] });
    const form = formStateFromProyecto(p);
    expect(seccionesCompletasProyecto(form, p).estatus).toBe(false);
    expect(seccionesCompletasProyecto({ ...form, monitoreo: false }, p).estatus).toBe(true);
    expect(seccionesCompletasProyecto({ ...form, monitoreo: true, status: 'pausado' }, p).estatus).toBe(false);
  });

  it('proyecto lleno: todo completo', () => {
    const p = proyecto({
      fechas_inicio: ['2026-09-01'],
      hora_llegada: '08:00',
      porcentaje_avance: 50,
      notas_por_dia: [{ id: 'a', nota: 'Se cableó', imagenesUrls: [] }],
      evidencias_urls: ['https://x/1.jpg'],
      firma_cliente_url: 'https://x/f1.png',
      firma_tecnico_url: 'https://x/f2.png',
      equipos: [
        {
          lineaId: 'l1',
          modelo: 'Cámara',
          modeloOriginal: 'Cámara',
          cantidad: 2,
          estadoInstalacion: 'instalado',
          equipoEntregado: true,
        },
      ],
    });
    const completas = seccionesCompletasProyecto(formStateFromProyecto(p), p);
    expect(Object.values(completas).every(Boolean)).toBe(true);
  });
});

describe('contarCambios', () => {
  it('no cuenta el motivo de pausa reenviado sin cambios', () => {
    const p = proyecto({ status: 'pausado', motivo_pausa: 'Falta material' });
    const form = { ...formStateFromProyecto(p), porcentaje_avance: 10 };
    const patch = construirPatch(p, form);
    expect(Object.keys(patch).sort()).toEqual(['motivo_pausa', 'porcentaje_avance']);
    expect(contarCambios(p, patch)).toBe(1);
  });
});

describe('primeraSeccionConErrorProyecto', () => {
  it('devuelve el primer paso en orden visual', () => {
    expect(
      primeraSeccionConErrorProyecto({ notas_por_dia: { a: 'x' }, hora_llegada: 'Formato' }),
    ).toBe('jornadas');
    expect(primeraSeccionConErrorProyecto({ requerimientos_adicionales: 'x' })).toBe('extras');
    expect(primeraSeccionConErrorProyecto({ notas_por_dia: {} })).toBeNull();
  });
});
