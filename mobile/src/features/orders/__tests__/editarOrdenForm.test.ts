import type { Orden } from '@/types/orden';
import {
  COMENTARIO_TECNICO_MIN,
  construirPatch,
  formStateFromOrden,
  hayErrores,
  tieneCambios,
  validarForm,
} from '../editarOrdenForm';

const comentarioValido = 'x'.repeat(COMENTARIO_TECNICO_MIN);

const ordenBase: Orden = {
  id: 1,
  idx: 5001,
  folio: 'ODT-5001',
  tipo_orden: 'servicio_tecnico',
  cliente: 'ACME',
  cliente_nombre: null,
  direccion: 'Calle 1',
  telefono_cliente: null,
  problematica: 'Cámara sin señal',
  status: 'pendiente',
  motivo_pausa: null,
  prioridad: 'media',
  prioridad_pool: 'media',
  en_pool: false,
  liberada_por: null,
  liberada_at: null,
  tomada_por: null,
  tomada_at: null,
  fecha_inicio: '2026-08-20',
  hora_inicio: '09:00:00',
  fecha_finalizacion: null,
  hora_termino: null,
  nombre_cliente: null,
  nombre_encargado: null,
  tecnico_asignado: 4,
  tecnico_asignado_full_name: 'Juan Pérez',
  tecnico_asignado_avatar_url: null,
  creado_por: 4,
  fecha_creacion: '2026-08-20T10:00:00Z',
  comentario_tecnico: null,
  servicios_realizados: [],
  fotos_urls: [],
  fotos_extra_max: 0,
  firma_cliente_url: null,
  firma_encargado_url: null,
  equipos_inventario: [],
  calificacion: null,
  puede_calificar: false,
};

describe('formStateFromOrden', () => {
  it('recorta los segundos de las horas del backend', () => {
    expect(formStateFromOrden(ordenBase).hora_inicio).toBe('09:00');
  });

  it('trae comentario, fotos, firma y equipos (no problemática)', () => {
    const form = formStateFromOrden({
      ...ordenBase,
      comentario_tecnico: 'Se cambió el conector',
      fotos_urls: ['https://cdn.example/1.jpg'],
      firma_cliente_url: 'https://cdn.example/firma.png',
      equipos_inventario: [
        {
          lineaId: 'l1',
          inventarioItemId: 9,
          nombre: 'Cámara IP',
          marca: 'Hikvision',
          modelo: 'DS-2CD',
          imagenUrl: '',
          cantidad: 1,
          equipoEntregado: true,
          estadoInstalacion: 'no_instalado',
        },
      ],
    });
    expect(form.comentario_tecnico).toBe('Se cambió el conector');
    expect(form.fotos_urls).toEqual(['https://cdn.example/1.jpg']);
    expect(form.firma_cliente_url).toBe('https://cdn.example/firma.png');
    expect(form.equipos_inventario).toHaveLength(1);
    expect(form).not.toHaveProperty('problematica');
  });
});

describe('validarForm', () => {
  it('exige motivo al pausar (misma regla que el serializer)', () => {
    const errores = validarForm({
      ...formStateFromOrden(ordenBase),
      status: 'pausado',
      motivo_pausa: '  ',
      comentario_tecnico: comentarioValido,
    });
    expect(errores.motivo_pausa).toMatch(/pausó/);
    expect(hayErrores(errores)).toBe(true);
  });

  it('acepta el pausado con motivo y comentario válido', () => {
    const errores = validarForm({
      ...formStateFromOrden(ordenBase),
      status: 'pausado',
      motivo_pausa: 'Falta material',
      comentario_tecnico: comentarioValido,
    });
    expect(hayErrores(errores)).toBe(false);
  });

  it('exige comentario técnico de al menos 150 caracteres', () => {
    const corto = validarForm({
      ...formStateFromOrden(ordenBase),
      comentario_tecnico: 'corto',
    });
    expect(corto.comentario_tecnico).toMatch(/150/);

    const vacio = validarForm({
      ...formStateFromOrden(ordenBase),
      comentario_tecnico: '',
    });
    expect(vacio.comentario_tecnico).toMatch(/obligatorio/i);

    const ok = validarForm({
      ...formStateFromOrden(ordenBase),
      comentario_tecnico: comentarioValido,
    });
    expect(ok.comentario_tecnico).toBeUndefined();
  });

  it('rechaza fechas y horas mal formadas antes de llamar al API', () => {
    const errores = validarForm({
      ...formStateFromOrden(ordenBase),
      comentario_tecnico: comentarioValido,
      fecha_inicio: '20/08/2026',
      hora_termino: '25:00',
    });
    expect(errores.fecha_inicio).toBeDefined();
    expect(errores.hora_termino).toBeDefined();
  });

  it('rechaza un día inexistente', () => {
    const errores = validarForm({
      ...formStateFromOrden(ordenBase),
      comentario_tecnico: comentarioValido,
      fecha_inicio: '2026-02-31',
    });
    expect(errores.fecha_inicio).toBeDefined();
  });
});

describe('construirPatch', () => {
  it('solo manda lo que cambió', () => {
    const patch = construirPatch(ordenBase, {
      ...formStateFromOrden(ordenBase),
      comentario_tecnico: 'Se cambió el conector',
    });
    expect(patch).toEqual({ comentario_tecnico: 'Se cambió el conector' });
  });

  it('no manda nada si el técnico no tocó el formulario', () => {
    const patch = construirPatch(ordenBase, formStateFromOrden(ordenBase));
    expect(tieneCambios(patch)).toBe(false);
  });

  it('acompaña el pausado con su motivo aunque el texto ya estuviera', () => {
    const orden: Orden = { ...ordenBase, status: 'resuelto', motivo_pausa: 'Falta material' };
    const patch = construirPatch(orden, { ...formStateFromOrden(orden), status: 'pausado' });
    expect(patch).toEqual({ status: 'pausado', motivo_pausa: 'Falta material' });
  });

  it('manda null para limpiar una fecha', () => {
    const patch = construirPatch(ordenBase, { ...formStateFromOrden(ordenBase), fecha_inicio: '' });
    expect(patch).toEqual({ fecha_inicio: null });
  });

  it('manda fotos y firma cuando cambian', () => {
    const patch = construirPatch(ordenBase, {
      ...formStateFromOrden(ordenBase),
      fotos_urls: ['https://cdn.example/a.jpg'],
      firma_cliente_url: 'data:image/png;base64,abc',
    });
    expect(patch.fotos_urls).toEqual(['https://cdn.example/a.jpg']);
    expect(patch.firma_cliente_url).toBe('data:image/png;base64,abc');
  });

  it('manda equipos cuando cambia la instalación', () => {
    const equipo = {
      lineaId: 'l1',
      inventarioItemId: 9,
      nombre: 'Cámara IP',
      marca: 'Hikvision',
      modelo: 'DS-2CD',
      imagenUrl: '',
      cantidad: 1,
      equipoEntregado: true,
      estadoInstalacion: 'no_instalado' as const,
    };
    const orden = { ...ordenBase, equipos_inventario: [equipo] };
    const patch = construirPatch(orden, {
      ...formStateFromOrden(orden),
      equipos_inventario: [{ ...equipo, estadoInstalacion: 'instalado' }],
    });
    expect(patch.equipos_inventario).toEqual([
      { ...equipo, estadoInstalacion: 'instalado' },
    ]);
  });

  it('nunca incluye campos fuera del alcance del técnico', () => {
    const patch = construirPatch(ordenBase, {
      ...formStateFromOrden(ordenBase),
      status: 'resuelto',
      fecha_finalizacion: '2026-08-26',
      hora_termino: '18:30',
    });
    const permitidos = [
      'status',
      'motivo_pausa',
      'comentario_tecnico',
      'fecha_inicio',
      'hora_inicio',
      'fecha_finalizacion',
      'hora_termino',
      'fotos_urls',
      'firma_cliente_url',
      'equipos_inventario',
    ];
    expect(Object.keys(patch).every((key) => permitidos.includes(key))).toBe(true);
  });
});
