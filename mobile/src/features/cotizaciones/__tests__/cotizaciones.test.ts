import { parseCotizacion, parseCotizacionList } from '@/api/cotizacionParsers';
import {
  agruparPorCategoria,
  calcularTotales,
  folioDisplay,
  formatMoneda,
  formatMonedaCorta,
  fuentePartida,
  precioUnitario,
  resumenDelMes,
  totalMostrado,
} from '../cotizacionFormat';
import {
  aplicarCliente,
  aplicarOpcionPdf,
  construirPayload,
  formDesdeCotizacion,
  formVacio,
  hayCambios,
  lineaDesdeConcepto,
  lineaDesdeProducto,
  lineaVacia,
  primeraSeccionConError,
  requisitosPendientes,
  validarForm,
} from '../cotizacionForm';

const producto = { precio_lista: 116, descuento_pct: 0, producto_externo_id: 'SYS-1', sin_iva: false };
const concepto = { precio_lista: 100, descuento_pct: 0, producto_externo_id: '', sin_iva: false };

const clienteAcme = {
  id: 3,
  nombre: 'ACME',
  telefono: '3312345678',
  correo: '',
  es_prospecto: false,
  contacto_principal: 'Ana',
  contacto_telefono: '',
};

describe('precios (espejo del backend)', () => {
  it('producto: el precio ya trae IVA; sin IVA se le quita', () => {
    expect(precioUnitario(producto)).toBeCloseTo(116);
    expect(precioUnitario({ ...producto, sin_iva: true })).toBeCloseTo(100);
  });

  it('concepto: se le suma IVA salvo «sin IVA»; el descuento va antes', () => {
    expect(precioUnitario(concepto)).toBeCloseTo(116);
    expect(precioUnitario({ ...concepto, sin_iva: true })).toBeCloseTo(100);
    expect(precioUnitario({ ...concepto, descuento_pct: 50 })).toBeCloseTo(58);
  });

  it('totales con descuento de cliente y anticipo', () => {
    const t = calcularTotales([{ ...concepto, cantidad: 2 }, { ...producto, cantidad: 1 }], 10, 60);
    expect(t.subtotalLineas).toBeCloseTo(348);
    expect(t.descuentoCliente).toBeCloseTo(34.8);
    expect(t.total).toBeCloseTo(313.2);
    expect(t.anticipo).toBeCloseTo(187.92);
    expect(t.saldo).toBeCloseTo(125.28);
  });
});

describe('formato', () => {
  it('moneda y folio', () => {
    expect(formatMoneda(1234567.5)).toBe('$1,234,567.50');
    expect(formatMoneda(0)).toBe('$0.00');
    expect(formatMonedaCorta(1250000)).toBe('$1.3 M');
    expect(formatMonedaCorta(84500)).toBe('$84.5 k');
    expect(folioDisplay({ idx: 10023, id: 4 })).toBe('COT-10023');
  });

  it('fuente de cada partida', () => {
    expect(fuentePartida({ producto_externo_id: '' })).toBe('concepto');
    expect(fuentePartida({ producto_externo_id: '12345' })).toBe('syscom');
    expect(fuentePartida({ producto_externo_id: 'tvc:ABC' })).toBe('tvc');
    expect(fuentePartida({ producto_externo_id: 'manual:9' })).toBe('manual');
  });

  it('garantía se muestra en $0', () => {
    expect(totalMostrado({ total: 500, es_garantia: true })).toBe(0);
    expect(totalMostrado({ total: 500, es_garantia: false })).toBe(500);
  });

  it('agrupa partidas por categoría en el orden de la cotización', () => {
    const items = [
      { categoria_id: 'b', n: 1 },
      { categoria_id: '', n: 2 },
      { categoria_id: 'a', n: 3 },
    ];
    const grupos = agruparPorCategoria(items, [
      { id: 'a', nombre: 'Cámaras' },
      { id: 'b', nombre: 'Cableado' },
    ]);
    expect(grupos.map((g) => [g.nombre, g.items.map((i) => i.n)])).toEqual([
      [null, [2]],
      ['Cámaras', [3]],
      ['Cableado', [1]],
    ]);
    expect(agruparPorCategoria(items, [])).toHaveLength(1);
  });
});

describe('parsers', () => {
  const raw = {
    id: 7,
    idx: 10007,
    cliente_id: 3,
    cliente_nombre: 'ACME',
    cliente: 'ACME',
    status: 'autorizada',
    total: '1500.00',
    anticipo_pct: '60.00',
    tipo_trabajo: [1, '2'],
    pdf_opciones: { es_garantia: true },
    categorias_productos: [{ id: 'x', nombre: 'Cámaras', orden: 0 }],
    items: [{ producto_nombre: 'Cámara', cantidad: '2.00', precio_lista: '500', sin_iva: false }],
  };

  it('normaliza decimales en texto, el estatus, garantía y categorías', () => {
    const c = parseCotizacion(raw);
    expect(c.status).toBe('AUTORIZADA');
    expect(c.total).toBe(1500);
    expect(c.es_garantia).toBe(true);
    expect(c.categorias_productos).toEqual([{ id: 'x', nombre: 'Cámaras', orden: 0 }]);
    expect(c.tipo_trabajo).toEqual([1, 2]);
    expect(c.items[0]?.cantidad).toBe(2);
    expect(c.items[0]?.claveLocal).toBeTruthy();
  });

  it('acepta la lista paginada', () => {
    expect(parseCotizacionList({ results: [raw, { nada: 1 }] })).toHaveLength(1);
  });

  it('cuenta líneas, productos y piezas', () => {
    const c = parseCotizacionList([
      { ...raw, items: [{ cantidad: '2' }, { cantidad: '3.5', producto_externo_id: 'SYS-1' }] },
    ])[0];
    expect(c).toMatchObject({ numero_conceptos: 2, numero_productos: 1, piezas: 5.5 });
  });

  it('resumen del mes: solo conteos y cierre', () => {
    const lista = parseCotizacionList([
      raw,
      { ...raw, id: 8, status: 'PENDIENTE' },
      { ...raw, id: 10, status: 'CANCELADA' },
    ]);
    const r = resumenDelMes(lista);
    expect(r.cantidad).toBe(3);
    expect(r.porStatus).toEqual({ PENDIENTE: 1, AUTORIZADA: 1, CANCELADA: 1 });
    expect(r.tasaCierre).toBe(50);
  });
});

describe('formulario (mismas reglas que la web)', () => {
  it('uno nuevo pide cliente, tipo de trabajo y partidas', () => {
    const form = formVacio();
    const errores = validarForm(form);
    expect(errores.cliente).toBeTruthy();
    expect(errores.tipo_trabajo).toBeTruthy();
    expect(errores.items).toBeTruthy();
    expect(primeraSeccionConError(errores)).toBe('cliente');
    expect(requisitosPendientes(form).map((r) => r.texto)).toEqual([
      'Selecciona un cliente',
      'Elige el tipo de trabajo',
      'Agrega al menos una partida',
    ]);
  });

  it('contacto opcional; si hay contacto, el medio es obligatorio', () => {
    let form = aplicarCliente(formVacio(), clienteAcme);
    form = { ...form, tipo_trabajo: [1], items: [{ ...lineaVacia(), producto_nombre: 'Instalación' }] };
    expect(form.contacto).toBe('Ana');
    expect(form.contacto_telefono).toBe('3312345678');
    expect(validarForm(form).medio_contacto).toBeTruthy();
    expect(validarForm({ ...form, medio_contacto: 'WEB' })).toEqual({});
    expect(validarForm({ ...form, contacto: '' })).toEqual({});
  });

  it('al crear manda la fecha del día; nunca manda los textos del documento', () => {
    const form = { ...aplicarCliente(formVacio(), clienteAcme), tipo_trabajo: [1] };
    const nueva = construirPayload(form, 'nueva');
    expect(nueva.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nueva).not.toHaveProperty('terminos');
    expect(nueva).not.toHaveProperty('texto_arriba_precios');
    const editar = construirPayload(form, 'editar');
    expect(editar).not.toHaveProperty('fecha');
    expect(editar).not.toHaveProperty('terminos');
  });

  it('partida desde producto (manual, SYSCOM o TVC)', () => {
    const linea = lineaDesdeProducto({
      clave: 'syscom-123',
      fuente: 'syscom',
      productoExternoId: '123',
      titulo: 'Cámara bala',
      subtitulo: 'Hikvision · DS-2CE',
      precio: 1160,
      imagenUrl: 'https://www.syscom.mx/img.jpg',
      descripcion: 'Hikvision · DS-2CE',
      existencia: 3,
    });
    expect(linea).toMatchObject({ producto_externo_id: '123', unidad: 'PZA', precio_lista: 1160, thumbnail_url: 'https://www.syscom.mx/img.jpg' });
  });

  it('el payload conserva lo que la app no edita y quita la clave local', () => {
    const c = parseCotizacion({
      id: 1,
      idx: 10001,
      cliente_id: 4,
      cliente: 'Cliente',
      items: [{ producto_nombre: 'X', producto_externo_id: 'SYS-9', thumbnail_url: 'https://img', categoria_id: 'cat-1' }],
    });
    const form = formDesdeCotizacion(c);
    const payload = construirPayload(form);
    expect(payload.items[0]).toMatchObject({ producto_externo_id: 'SYS-9', thumbnail_url: 'https://img', categoria_id: 'cat-1', orden: 0 });
    expect(payload.items[0]).not.toHaveProperty('claveLocal');
    expect(hayCambios(form, formDesdeCotizacion(c))).toBe(false);
    expect(hayCambios(form, { ...form, anticipo_pct: 70 })).toBe(true);
  });

  it('opciones de exportación con las reglas de la web', () => {
    const base = formVacio().pdf_opciones;
    expect(aplicarOpcionPdf(base, 'ocultar_precios_linea', true)).toMatchObject({
      ocultar_precios_unitarios: true,
      ocultar_importes_linea: true,
    });
    const simple = aplicarOpcionPdf({ ...base, ocultar_detalle: true }, 'simplificar_descripcion', true);
    expect(simple).toMatchObject({ simplificar_descripcion: true, ocultar_detalle: false });
    const detalle = aplicarOpcionPdf(simple, 'ocultar_detalle', true);
    expect(detalle).toMatchObject({ ocultar_detalle: true, simplificar_descripcion: false });
    const form = { ...aplicarCliente(formVacio(), clienteAcme), pdf_opciones: { ...base, es_garantia: true } };
    expect(construirPayload(form).pdf_opciones.es_garantia).toBe(true);
  });

  it('partida desde el catálogo de conceptos', () => {
    const linea = lineaDesdeConcepto({ id: 1, folio: '1', concepto: 'Cableado', descripcion: 'UTP', precio: 250, imagen_url: '' });
    expect(linea).toMatchObject({ producto_nombre: 'Cableado', precio_lista: 250, producto_externo_id: '' });
  });
});
