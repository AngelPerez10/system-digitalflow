import { nuevaClaveLinea, parsePdfOpciones } from '@/api/cotizacionParsers';
import type { ProductoCatalogo } from '@/api/productosCatalogoApi';
import type {
  ClienteOpcion,
  ConceptoCatalogo,
  Cotizacion,
  CotizacionItem,
  CotizacionPayload,
  CotizacionStatus,
  MedioContacto,
  PdfOpciones,
} from '@/types/cotizacion';
import { hoyISO } from '@/utils/fecha';
import { ANTICIPO_DEFAULT, ANTICIPO_MAX, ANTICIPO_MIN } from './cotizacionFormat';

/**
 * Formulario de cotización con los mismos campos y reglas que la web
 * (`NuevaCotizacionPage`): cliente del catálogo, contacto opcional (con medio
 * obligatorio si hay contacto), tipo de trabajo obligatorio, status,
 * condiciones comerciales y partidas. La fecha la pone el sistema al crear;
 * no hay vencimiento. Los textos del documento (introducción y términos) no
 * se editan en la app: al crear se usan los de la marca y al editar se
 * conservan los guardados.
 */

export interface ClienteElegido {
  id: number;
  nombre: string;
  prospecto: boolean;
}

export interface CotizacionFormState {
  cliente: ClienteElegido | null;
  contacto: string;
  contacto_telefono: string;
  medio_contacto: MedioContacto | '';
  tipo_trabajo: number[];
  status: CotizacionStatus;
  descuento_cliente_pct: number;
  anticipo_pct: number;
  items: CotizacionItem[];
  pdf_opciones: PdfOpciones;
}

export type CotizacionFormErrors = Partial<
  Record<'cliente' | 'medio_contacto' | 'tipo_trabajo' | 'items' | 'anticipo_pct' | 'descuento_cliente_pct', string>
>;

export function formVacio(): CotizacionFormState {
  return {
    cliente: null,
    contacto: '',
    contacto_telefono: '',
    medio_contacto: '',
    tipo_trabajo: [],
    status: 'PENDIENTE',
    descuento_cliente_pct: 0,
    anticipo_pct: ANTICIPO_DEFAULT,
    items: [],
    pdf_opciones: parsePdfOpciones({}),
  };
}

export function formDesdeCotizacion(c: Cotizacion): CotizacionFormState {
  const nombre = c.cliente_nombre?.trim() || c.cliente.trim();
  return {
    cliente: c.cliente_id ? { id: c.cliente_id, nombre, prospecto: c.prospecto } : null,
    contacto: c.contacto,
    contacto_telefono: c.contacto_telefono,
    medio_contacto: c.medio_contacto,
    tipo_trabajo: [...c.tipo_trabajo],
    status: c.status,
    descuento_cliente_pct: c.descuento_cliente_pct,
    anticipo_pct: c.anticipo_pct,
    items: c.items.map((i) => ({ ...i })),
    pdf_opciones: { ...c.pdf_opciones },
  };
}

/** Al elegir un cliente se precargan su contacto principal y teléfono (si los campos están vacíos). */
export function aplicarCliente(form: CotizacionFormState, cliente: ClienteOpcion): CotizacionFormState {
  return {
    ...form,
    cliente: { id: cliente.id, nombre: cliente.nombre, prospecto: cliente.es_prospecto },
    contacto: form.contacto.trim() ? form.contacto : cliente.contacto_principal,
    contacto_telefono: form.contacto_telefono.trim()
      ? form.contacto_telefono
      : cliente.contacto_telefono || cliente.telefono,
  };
}

export function lineaVacia(): CotizacionItem {
  return {
    claveLocal: nuevaClaveLinea(),
    producto_externo_id: '',
    producto_nombre: '',
    producto_descripcion: '',
    pdf_descripcion_corta: '',
    unidad: 'Servicio',
    thumbnail_url: '',
    cantidad: 1,
    precio_lista: 0,
    descuento_pct: 0,
    sin_iva: false,
    categoria_id: '',
  };
}

/** Partida nueva a partir del catálogo de conceptos (su precio es base, sin IVA). */
export function lineaDesdeConcepto(concepto: ConceptoCatalogo): CotizacionItem {
  return {
    ...lineaVacia(),
    producto_nombre: concepto.concepto.slice(0, 255),
    producto_descripcion: concepto.descripcion,
    thumbnail_url: concepto.imagen_url.slice(0, 512),
    precio_lista: concepto.precio,
  };
}

/**
 * Partida desde un producto del catálogo manual, SYSCOM o TVC, igual que la
 * web: el precio ya incluye IVA y la unidad por defecto es «PZA».
 */
export function lineaDesdeProducto(producto: ProductoCatalogo): CotizacionItem {
  return {
    ...lineaVacia(),
    producto_externo_id: producto.productoExternoId.slice(0, 100),
    producto_nombre: producto.titulo.slice(0, 255),
    producto_descripcion: producto.descripcion,
    unidad: 'PZA',
    thumbnail_url: producto.imagenUrl.slice(0, 512),
    precio_lista: producto.precio,
  };
}

export type OpcionPdf = keyof PdfOpciones | 'ocultar_precios_linea';

/**
 * Cambia una opción de exportación con las mismas reglas que la web:
 * «ocultar precios por línea» enciende o apaga precio unitario e importe a la
 * vez, y «ocultar detalle» y «simplificar descripción» se excluyen entre sí.
 */
export function aplicarOpcionPdf(opciones: PdfOpciones, opcion: OpcionPdf, valor: boolean): PdfOpciones {
  if (opcion === 'ocultar_precios_linea') {
    return { ...opciones, ocultar_precios_unitarios: valor, ocultar_importes_linea: valor };
  }
  if (opcion === 'simplificar_descripcion' && valor) {
    return { ...opciones, simplificar_descripcion: true, ocultar_detalle: false };
  }
  if (opcion === 'ocultar_detalle' && valor) {
    return { ...opciones, ocultar_detalle: true, simplificar_descripcion: false };
  }
  return { ...opciones, [opcion]: valor };
}

/** Requisitos para guardar, con los mismos textos que la web. */
export function requisitosPendientes(form: CotizacionFormState): { clave: SeccionCotizacion; texto: string }[] {
  const pendientes: { clave: SeccionCotizacion; texto: string }[] = [];
  if (!form.cliente) pendientes.push({ clave: 'cliente', texto: 'Selecciona un cliente' });
  if (form.tipo_trabajo.length === 0) pendientes.push({ clave: 'cliente', texto: 'Elige el tipo de trabajo' });
  if (form.contacto.trim() && !form.medio_contacto) {
    pendientes.push({ clave: 'cliente', texto: 'Indica el medio de contacto' });
  }
  if (form.items.length === 0) pendientes.push({ clave: 'partidas', texto: 'Agrega al menos una partida' });
  return pendientes;
}

export function validarForm(form: CotizacionFormState): CotizacionFormErrors {
  const errores: CotizacionFormErrors = {};
  if (!form.cliente) errores.cliente = 'Selecciona un cliente del catálogo.';
  // Contacto opcional; el medio solo es obligatorio si hay contacto (igual que la web).
  if (form.contacto.trim() && !form.medio_contacto) errores.medio_contacto = 'Indica el medio de contacto.';
  if (form.tipo_trabajo.length === 0) errores.tipo_trabajo = 'Elige al menos un tipo de trabajo.';
  if (form.items.length === 0) errores.items = 'Agrega al menos una partida.';
  else if (form.items.some((i) => !i.producto_nombre.trim())) errores.items = 'Hay una partida sin nombre.';
  if (form.anticipo_pct < ANTICIPO_MIN || form.anticipo_pct > ANTICIPO_MAX) {
    errores.anticipo_pct = `El anticipo va de ${ANTICIPO_MIN}% a ${ANTICIPO_MAX}%.`;
  }
  if (form.descuento_cliente_pct < 0 || form.descuento_cliente_pct > 100) {
    errores.descuento_cliente_pct = 'El descuento va de 0% a 100%.';
  }
  return errores;
}

export function hayErrores(errores: CotizacionFormErrors): boolean {
  return Object.values(errores).some(Boolean);
}

function recortar(valor: string, max: number): string {
  return valor.trim().slice(0, max);
}

/**
 * Cuerpo para el servidor. Las partidas viajan completas (el backend las
 * reemplaza todas) conservando lo que la app no edita: descripción corta del
 * PDF, imagen, categoría y referencia del producto. Las categorías y los
 * textos del documento no se mandan: el servidor conserva los guardados (y al
 * crear pone los términos por defecto de la marca).
 */
export function construirPayload(form: CotizacionFormState, modo: 'nueva' | 'editar' = 'editar'): CotizacionPayload {
  return {
    cliente_id: form.cliente?.id ?? null,
    cliente: recortar(form.cliente?.nombre ?? '', 255),
    prospecto: form.cliente?.prospecto ?? false,
    contacto: recortar(form.contacto, 200),
    contacto_telefono: recortar(form.contacto_telefono, 30),
    medio_contacto: form.medio_contacto,
    tipo_trabajo: [...form.tipo_trabajo],
    status: form.status,
    ...(modo === 'nueva' ? { fecha: hoyISO() } : {}),
    descuento_cliente_pct: form.descuento_cliente_pct,
    anticipo_pct: form.anticipo_pct,
    pdf_opciones: { ...form.pdf_opciones },
    items: form.items.map(({ claveLocal: _clave, ...item }, orden) => ({
      ...item,
      producto_externo_id: recortar(item.producto_externo_id, 100),
      producto_nombre: recortar(item.producto_nombre, 255),
      pdf_descripcion_corta: recortar(item.pdf_descripcion_corta, 500),
      unidad: recortar(item.unidad, 50),
      thumbnail_url: recortar(item.thumbnail_url, 512),
      categoria_id: recortar(item.categoria_id, 64),
      orden,
    })),
  };
}

/** ¿Hay algo distinto a lo guardado? Compara lo que se enviaría al servidor. */
export function hayCambios(inicial: CotizacionFormState, actual: CotizacionFormState): boolean {
  return JSON.stringify(construirPayload(inicial)) !== JSON.stringify(construirPayload(actual));
}

/** Secciones del formulario, en orden visual (las mismas de la web). */
export const SECCIONES_COTIZACION = ['cliente', 'condiciones', 'partidas'] as const;
export type SeccionCotizacion = (typeof SECCIONES_COTIZACION)[number];

const SECCION_DE_CAMPO: Record<keyof CotizacionFormErrors, SeccionCotizacion> = {
  cliente: 'cliente',
  medio_contacto: 'cliente',
  tipo_trabajo: 'cliente',
  anticipo_pct: 'condiciones',
  descuento_cliente_pct: 'condiciones',
  items: 'partidas',
};

export function primeraSeccionConError(errores: CotizacionFormErrors): SeccionCotizacion | null {
  const conError = new Set(
    (Object.keys(errores) as (keyof CotizacionFormErrors)[]).filter((k) => errores[k]).map((k) => SECCION_DE_CAMPO[k]),
  );
  return SECCIONES_COTIZACION.find((s) => conError.has(s)) ?? null;
}

export function seccionesCompletas(form: CotizacionFormState): Record<SeccionCotizacion, boolean> {
  return {
    cliente: Boolean(form.cliente) && form.tipo_trabajo.length > 0 && (!form.contacto.trim() || Boolean(form.medio_contacto)),
    condiciones: form.anticipo_pct >= ANTICIPO_MIN && form.anticipo_pct <= ANTICIPO_MAX,
    partidas: form.items.length > 0 && form.items.every((i) => i.producto_nombre.trim() && i.cantidad > 0),
  };
}
