import {
  aplicarClienteProyecto,
  construirPayloadProyecto,
  estadoSeccionProyecto,
  expandirRango,
  formProyectoVacio,
  hayCapturaProyecto,
  hayErroresProyecto,
  primeraSeccionConErrorProyecto,
  progresoProyecto,
  requiereMonitoreo,
  validarProyecto,
  type CrearProyectoFormState,
} from '../crearProyectoForm';
import type { ClienteOpcion, ServicioOpcion } from '@/types/cotizacion';
import type { TecnicoOpcion } from '@/types/orden';

const HOY = new Date(2026, 9, 7);

const cliente: ClienteOpcion = {
  id: 7,
  nombre: 'Ferretería López',
  telefono: '3141234567',
  correo: '',
  es_prospecto: false,
  contacto_principal: 'Ana López',
  contacto_telefono: '',
};

const catalogo: ServicioOpcion[] = [
  { id: 1, nombre: 'CCTV' },
  { id: 2, nombre: 'ALARMAS' },
  { id: 3, nombre: 'Redes' },
];

const personas: TecnicoOpcion[] = [
  { id: 10, nombre: 'Ángel Pérez', avatarUrl: null },
  { id: 11, nombre: 'Felipe Ruiz ', avatarUrl: null },
  { id: 12, nombre: 'Gemma Díaz', avatarUrl: null },
];

function listo(extra: Partial<CrearProyectoFormState> = {}): CrearProyectoFormState {
  return { ...aplicarClienteProyecto(formProyectoVacio(10, HOY), cliente), tipos: [1], ...extra };
}

describe('formProyectoVacio / aplicarClienteProyecto', () => {
  it('arranca hoy, con el usuario como responsable', () => {
    const f = formProyectoVacio(10, HOY);
    expect(f.fecha_autorizacion).toBe('2026-10-07');
    expect(f.inicio_desde).toBe('2026-10-07');
    expect(f.responsable).toBe(10);
    expect(hayCapturaProyecto(f)).toBe(false);
  });

  it('precarga quién autorizó con el contacto, sin pisar lo escrito', () => {
    expect(aplicarClienteProyecto(formProyectoVacio(null, HOY), cliente).quien_autorizo).toBe('Ana López');
    const escrito = { ...formProyectoVacio(null, HOY), quien_autorizo: 'Luis' };
    expect(aplicarClienteProyecto(escrito, cliente).quien_autorizo).toBe('Luis');
  });
});

describe('expandirRango', () => {
  it('un solo día o rango inclusivo, cruzando de mes', () => {
    expect(expandirRango('2026-10-07', '')).toEqual(['2026-10-07']);
    expect(expandirRango('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('acepta los extremos al revés y descarta fechas inválidas', () => {
    expect(expandirRango('2026-10-09', '2026-10-07')).toEqual(['2026-10-07', '2026-10-08', '2026-10-09']);
    expect(expandirRango('', '')).toEqual([]);
  });
});

describe('validarProyecto', () => {
  it('exige cliente y tipo de trabajo', () => {
    const e = validarProyecto(formProyectoVacio(null, HOY), catalogo);
    expect(e.cliente).toBeTruthy();
    expect(e.tipos).toBeTruthy();
    expect(primeraSeccionConErrorProyecto(e)).toBe('cliente');
  });

  it('con «Alarmas» pide elegir monitoreo', () => {
    const f = listo({ tipos: [2] });
    expect(requiereMonitoreo(f, catalogo)).toBe(true);
    expect(validarProyecto(f, catalogo).monitoreo).toBeTruthy();
    expect(hayErroresProyecto(validarProyecto({ ...f, monitoreo: false }, catalogo))).toBe(false);
  });

  it('el responsable no puede ser auxiliar y el rango no va al revés', () => {
    expect(validarProyecto(listo({ auxiliares: [10] }), catalogo).auxiliares).toBeTruthy();
    const e = validarProyecto(listo({ inicio_hasta: '2026-10-01' }), catalogo);
    expect(e.inicio_hasta).toBeTruthy();
    expect(primeraSeccionConErrorProyecto(e)).toBe('calendario');
  });

  it('formulario completo no tiene errores', () => {
    expect(hayErroresProyecto(validarProyecto(listo(), catalogo))).toBe(false);
  });
});

describe('avance y estados', () => {
  it('cuenta secciones listas y la siguiente', () => {
    expect(progresoProyecto(formProyectoVacio(null, HOY), catalogo)).toEqual({ completadas: 2, total: 4, siguiente: 'cliente' });
    expect(progresoProyecto(listo(), catalogo)).toEqual({ completadas: 4, total: 4, siguiente: null });
  });

  it('el equipo vacío se ve como opcional, no como listo', () => {
    expect(estadoSeccionProyecto(formProyectoVacio(null, HOY), 'equipo', catalogo)).toBe('vacio');
    expect(estadoSeccionProyecto(listo(), 'equipo', catalogo)).toBe('completo');
  });
});

describe('construirPayloadProyecto', () => {
  it('arma el envío como la web', () => {
    const p = construirPayloadProyecto(
      listo({ tipos: [3, 1], auxiliares: [11, 10], inicio_hasta: '2026-10-08', hora_llegada: '09:30' }),
      catalogo,
      personas,
    );
    expect(p).toMatchObject({
      cliente_id: 7,
      cliente_nombre: 'Ferretería López',
      status: 'en_proceso',
      quien_autorizo: 'Ana López',
      fecha_autorizacion: '2026-10-07',
      fechas_inicio: ['2026-10-07', '2026-10-08'],
      hora_llegada: '09:30',
      tipos_trabajo: [
        { id: 3, nombre: 'Redes' },
        { id: 1, nombre: 'CCTV' },
      ],
      tipo_trabajo_id: 3,
      tipo_trabajo_nombre: 'Redes',
      monitoreo: null,
      tecnicos: [{ id: 10, nombre: 'Ángel Pérez', responsable: true }],
      // El responsable se quita de auxiliares; los nombres se recortan.
      auxiliares: [{ id: 11, nombre: 'Felipe Ruiz' }],
      tecnico_id: 10,
      auxiliar_id: 11,
    });
  });

  it('sin responsable manda listas vacías; monitoreo solo con «Alarmas»', () => {
    const p = construirPayloadProyecto(listo({ responsable: null, tipos: [2], monitoreo: true }), catalogo, personas);
    expect(p.tecnicos).toEqual([]);
    expect(p.tecnico_id).toBeNull();
    expect(p.monitoreo).toBe(true);
    expect(construirPayloadProyecto(listo({ monitoreo: true }), catalogo, personas).monitoreo).toBeNull();
  });
});
