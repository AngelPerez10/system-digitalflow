import {
  aplicarCliente,
  construirPayload,
  estadoSeccion,
  formVacio,
  hayCaptura,
  formatearTelefono,
  hayErrores,
  limpiarTelefono,
  primeraSeccionConError,
  progresoCrear,
  requisitosPendientes,
  seccionesCompletas,
  validarForm,
  type CrearOrdenFormState,
} from '../crearOrdenForm';
import type { ClienteOpcion } from '@/types/cotizacion';

const HOY = new Date(2026, 9, 6);

const cliente: ClienteOpcion = {
  id: 7,
  nombre: 'Ferretería López',
  telefono: '3141234567',
  correo: '',
  es_prospecto: false,
  contacto_principal: 'Ana López',
  contacto_telefono: '',
};

const servicios = [
  { id: 1, nombre: 'CCTV' },
  { id: 2, nombre: 'Alarma' },
];

function completo(over: Partial<CrearOrdenFormState> = {}): CrearOrdenFormState {
  return { ...aplicarCliente(formVacio(3, HOY), cliente), servicios: [1], ...over };
}

describe('formVacio', () => {
  it('asigna al técnico que crea y arranca hoy', () => {
    const f = formVacio(3, HOY);
    expect(f.tecnico_asignado).toBe(3);
    expect(f.fecha_inicio).toBe('2026-10-06');
    expect(hayCaptura(f)).toBe(false);
  });
});

describe('aplicarCliente', () => {
  it('precarga contacto y teléfono', () => {
    const f = aplicarCliente(formVacio(3, HOY), cliente);
    expect(f.cliente).toEqual({ id: 7, nombre: 'Ferretería López', prospecto: false });
    expect(f.nombre_cliente).toBe('Ana López');
    expect(f.telefono_cliente).toBe('3141234567');
    expect(hayCaptura(f)).toBe(true);
  });

  it('no pisa lo que ya se capturó', () => {
    const f = aplicarCliente({ ...formVacio(3, HOY), telefono_cliente: '555', nombre_cliente: 'Luis' }, cliente);
    expect(f.telefono_cliente).toBe('555');
    expect(f.nombre_cliente).toBe('Luis');
  });

  it('del catálogo toma los últimos 10 dígitos (sin lada ni separadores)', () => {
    const f = aplicarCliente(formVacio(3, HOY), { ...cliente, telefono: '+52 (314) 123-4567' });
    expect(f.telefono_cliente).toBe('3141234567');
  });
});

describe('formatearTelefono', () => {
  it('agrupa 3-3-4 mientras se escribe', () => {
    expect(formatearTelefono('31')).toBe('31');
    expect(formatearTelefono('31412')).toBe('314 12');
    expect(formatearTelefono('3141234567')).toBe('314 123 4567');
    expect(limpiarTelefono(formatearTelefono('3141234567'))).toBe('3141234567');
  });
});

describe('limpiarTelefono', () => {
  it('deja solo dígitos y corta a 10', () => {
    expect(limpiarTelefono('314 123-4567')).toBe('3141234567');
    expect(limpiarTelefono('314123456789')).toBe('3141234567');
    expect(limpiarTelefono('abc')).toBe('');
  });

  it('quita la lada de México, EE. UU. y Canadá al pegar', () => {
    expect(limpiarTelefono('+52 314 123 4567')).toBe('3141234567');
    expect(limpiarTelefono('+52 1 314 123 4567')).toBe('3141234567');
    expect(limpiarTelefono('+1 (415) 555-0132')).toBe('4155550132');
  });
});

describe('validarForm', () => {
  it('exige cliente, teléfono y servicio', () => {
    const e = validarForm(formVacio(3, HOY), false);
    expect(e.cliente).toBeTruthy();
    expect(e.telefono_cliente).toBeTruthy();
    expect(e.servicios).toBeTruthy();
    expect(e.prioridad_pool).toBeUndefined();
    expect(primeraSeccionConError(e)).toBe('cliente');
  });

  it('pasa con lo mínimo para un técnico', () => {
    expect(hayErrores(validarForm(completo(), false))).toBe(false);
  });

  it('exige prioridad solo al admin', () => {
    const e = validarForm(completo(), true);
    expect(e.prioridad_pool).toBeTruthy();
    expect(primeraSeccionConError(e)).toBe('asignacion');
    expect(hayErrores(validarForm(completo({ prioridad_pool: 'alta' }), true))).toBe(false);
  });

  it('rechaza hora mal formada', () => {
    expect(validarForm(completo({ hora_inicio: '25:00' }), false).hora_inicio).toBeTruthy();
  });
});

describe('secciones y requisitos', () => {
  it('marca secciones y lista lo pendiente', () => {
    const f = formVacio(3, HOY);
    expect(seccionesCompletas(f, false)).toEqual({ cliente: false, servicio: false, asignacion: true, agenda: true });
    expect(requisitosPendientes(f, true).map((r) => r.clave)).toEqual(['cliente', 'cliente', 'servicio', 'asignacion']);
    expect(requisitosPendientes(completo(), false)).toEqual([]);
  });

  it('resume el progreso para la barra', () => {
    const vacio = progresoCrear(formVacio(3, HOY), false);
    expect(vacio).toEqual({
      completadas: 2,
      total: 4,
      siguiente: 'cliente',
      siguienteTitulo: 'Cliente',
    });
    const listo = progresoCrear(completo(), false);
    expect(listo.completadas).toBe(4);
    expect(listo.siguiente).toBeNull();
    expect(listo.siguienteTitulo).toBeNull();
  });

  it('distingue vacío, incompleto y completo por sección', () => {
    const f = formVacio(null, HOY);
    expect(estadoSeccion(f, 'cliente', false)).toBe('vacio');
    expect(estadoSeccion(f, 'asignacion', false)).toBe('completo');
    expect(estadoSeccion({ ...f, telefono_cliente: '314' }, 'cliente', false)).toBe('incompleto');
    expect(estadoSeccion(completo(), 'servicio', false)).toBe('completo');
    expect(estadoSeccion(completo({ tecnico_asignado: null }), 'asignacion', true)).toBe('vacio');
    expect(estadoSeccion(completo(), 'asignacion', true)).toBe('incompleto');
    expect(estadoSeccion(completo({ prioridad_pool: 'alta' }), 'asignacion', true)).toBe('completo');
  });
});

describe('construirPayload', () => {
  it('manda servicios por nombre y orden pendiente', () => {
    const p = construirPayload(completo({ servicios: [2, 1], hora_inicio: '' }), servicios, false);
    expect(p).toMatchObject({
      cliente_id: 7,
      cliente: 'Ferretería López',
      telefono_cliente: '3141234567',
      servicios_realizados: ['Alarma', 'CCTV'],
      tecnico_asignado: 3,
      status: 'pendiente',
      hora_inicio: null,
    });
    expect(p).not.toHaveProperty('prioridad_pool');
  });

  it('permite dejarla sin asignar', () => {
    expect(construirPayload(completo({ tecnico_asignado: null }), servicios, false).tecnico_asignado).toBeNull();
  });

  it('incluye prioridad solo si es admin', () => {
    expect(construirPayload(completo({ prioridad_pool: 'baja' }), servicios, true).prioridad_pool).toBe('baja');
    expect(construirPayload(completo({ prioridad_pool: 'baja' }), servicios, false)).not.toHaveProperty('prioridad_pool');
  });
});
