import {
  parseLoginResponse,
  parseOrden,
  parseOrdenList,
  parsePermissions,
  parseSessionUser,
} from '../parsers';

describe('parseOrdenList', () => {
  it('normaliza nulos del backend sin perder la fila', () => {
    const [orden] = parseOrdenList([
      { id: 7, idx: 5001, folio: ' ODT-5001 ', status: 'PAUSADO', cliente: null, cliente_nombre: 'ACME', motivo_pausa: 'Falta material' },
    ]);
    expect(orden).toMatchObject({
      id: 7,
      idx: 5001,
      folio: 'ODT-5001',
      status: 'pausado',
      cliente: null,
      cliente_nombre: 'ACME',
      motivo_pausa: 'Falta material',
    });
  });

  it('descarta filas sin id en vez de romper la lista', () => {
    expect(parseOrdenList([{ folio: 'ODT-1' }, { id: 2 }])).toHaveLength(1);
  });

  it('acepta una respuesta paginada por si el backend activa paginación', () => {
    expect(parseOrdenList({ results: [{ id: 3 }] })).toHaveLength(1);
  });

  it('devuelve lista vacía ante datos inesperados', () => {
    expect(parseOrdenList(null)).toEqual([]);
    expect(parseOrdenList('boom')).toEqual([]);
  });

  it('usa pendiente ante un status desconocido', () => {
    const [orden] = parseOrdenList([{ id: 1, status: 'archivado' }]);
    expect(orden?.status).toBe('pendiente');
  });
});

describe('parseOrden', () => {
  it('rellena las colecciones ausentes del detalle', () => {
    const orden = parseOrden({ id: 9, fotos_urls: ['https://a/1.jpg', 42], servicios_realizados: null });
    expect(orden.fotos_urls).toEqual(['https://a/1.jpg']);
    expect(orden.servicios_realizados).toEqual([]);
    expect(orden.fotos_extra_max).toBe(0);
  });

  it('falla explícitamente si la orden no trae id', () => {
    expect(() => parseOrden({ folio: 'ODT-1' })).toThrow();
  });

  it('normaliza equipos_inventario y descarta líneas sin inventarioItemId', () => {
    const orden = parseOrden({
      id: 9,
      equipos_inventario: [
        {
          lineaId: 'a1',
          inventarioItemId: 12,
          nombre: 'Cámara domo',
          marca: 'Hikvision',
          modelo: 'DS-2CE',
          cantidad: '2',
          equipoEntregado: true,
          estadoInstalacion: 'instalado',
        },
        { nombre: 'Sin id de inventario' },
      ],
    });
    expect(orden.equipos_inventario).toEqual([
      {
        lineaId: 'a1',
        inventarioItemId: 12,
        nombre: 'Cámara domo',
        marca: 'Hikvision',
        modelo: 'DS-2CE',
        imagenUrl: '',
        cantidad: 2,
        equipoEntregado: true,
        estadoInstalacion: 'instalado',
      },
    ]);
  });

  it('devuelve equipos_inventario vacío cuando el campo no llega', () => {
    expect(parseOrden({ id: 1 }).equipos_inventario).toEqual([]);
  });
});

describe('parsePermissions', () => {
  it('conserva own_only solo cuando el backend la declara', () => {
    const perms = parsePermissions({ ordenes: { view: true, own_only: false }, inventario: { view: true } });
    expect(perms.ordenes).toMatchObject({ view: true, own_only: false });
    expect(perms.inventario && 'own_only' in perms.inventario).toBe(false);
  });
});

describe('parseLoginResponse', () => {
  const base = { id: 3, access: 'a', refresh: 'r', username: 'tecnico', permissions: { ordenes: { view: true } } };

  it('mapea la sesión del técnico', () => {
    const data = parseLoginResponse(base);
    expect(data.id).toBe(3);
    expect(data.permissions.ordenes?.view).toBe(true);
  });

  it('avisa cuando el servidor no manda refresh (backend sin soporte móvil)', () => {
    expect(() => parseLoginResponse({ ...base, refresh: null })).toThrow(/token de sesión/i);
  });

  it('una cuenta del ERP es `staff` y no arrastra contexto de portal', () => {
    const data = parseLoginResponse(base);
    expect(data.account_type).toBe('staff');
    expect(data.must_change_password).toBe(false);
    expect(data.cliente_id).toBeNull();
  });

  it('lee el contexto de portal cliente que manda el backend', () => {
    const data = parseLoginResponse({
      ...base,
      account_type: 'cliente',
      must_change_password: true,
      cliente_id: 42,
      portal_status: 'active',
    });
    expect(data.account_type).toBe('cliente');
    expect(data.must_change_password).toBe(true);
    expect(data.cliente_id).toBe(42);
    expect(data.portal_status).toBe('active');
  });
});

describe('parseOrdenList — foto del técnico (portal)', () => {
  it('lee la URL de la foto del técnico que manda el portal', () => {
    const ordenes = parseOrdenList([
      { id: 1, status: 'resuelto', tecnico_asignado_avatar_url: 'https://cdn/x.jpg' },
    ]);
    expect(ordenes[0]?.tecnico_asignado_avatar_url).toBe('https://cdn/x.jpg');
  });

  it('sin foto (ERP o técnico sin avatar) el campo es null', () => {
    const ordenes = parseOrdenList([{ id: 1, status: 'resuelto' }]);
    expect(ordenes[0]?.tecnico_asignado_avatar_url).toBeNull();
  });
});

describe('parseOrden — calificación del portal', () => {
  const base = { id: 1, status: 'resuelto' };

  it('el detalle del técnico no trae calificación y no ofrece calificar', () => {
    const orden = parseOrden(base);
    expect(orden.calificacion).toBeNull();
    expect(orden.puede_calificar).toBe(false);
  });

  it('lee la calificación y la bandera que manda el portal', () => {
    const orden = parseOrden({
      ...base,
      puede_calificar: false,
      calificacion: { estrellas: 4, comentario: 'Puntual', fecha_creacion: '2026-09-01T10:00:00Z' },
    });
    expect(orden.calificacion).toEqual({
      estrellas: 4,
      comentario: 'Puntual',
      fecha: '2026-09-01T10:00:00Z',
    });
    expect(orden.puede_calificar).toBe(false);
  });

  it('acota las estrellas al rango 1–5 aunque el servidor mande otra cosa', () => {
    expect(parseOrden({ ...base, calificacion: { estrellas: 9 } }).calificacion?.estrellas).toBe(5);
    expect(parseOrden({ ...base, calificacion: { estrellas: 0 } }).calificacion?.estrellas).toBe(1);
  });
});

describe('parseSessionUser', () => {
  it('conserva el contexto de portal al rehidratar desde /me/', () => {
    const user = parseSessionUser({
      id: 9,
      username: '105040',
      account_type: 'cliente',
      must_change_password: false,
      cliente_id: 7,
      portal_status: 'active',
    });
    expect(user.account_type).toBe('cliente');
    expect(user.cliente_id).toBe(7);
    expect(user.must_change_password).toBe(false);
  });
});
