import {
  COTIZACION_STATUSES,
  type CategoriaPartidas,
  type PdfOpciones,
  MEDIOS_CONTACTO,
  type ClienteOpcion,
  type ConceptoCatalogo,
  type Cotizacion,
  type CotizacionItem,
  type CotizacionListItem,
  type CotizacionStatus,
  type MedioContacto,
  type ServicioOpcion,
} from '@/types/cotizacion';
import { asBool, asNumber, asRecord, asString } from './parsers';

/** Normalizadores de cotizaciones: la API manda decimales como texto y `null` en casi todo. */

let contadorClave = 0;
/** Clave local única para las líneas (el backend no conserva ids de línea al guardar). */
export function nuevaClaveLinea(): string {
  contadorClave += 1;
  return `l${Date.now().toString(36)}${contadorClave}`;
}

export function parseCotizacionStatus(value: unknown): CotizacionStatus {
  const raw = String(value ?? '').trim().toUpperCase();
  return (COTIZACION_STATUSES as readonly string[]).includes(raw) ? (raw as CotizacionStatus) : 'PENDIENTE';
}

function parseMedio(value: unknown): MedioContacto | '' {
  const raw = String(value ?? '').trim().toUpperCase();
  return (MEDIOS_CONTACTO as readonly string[]).includes(raw) ? (raw as MedioContacto) : '';
}

function texto(value: unknown): string {
  return asString(value) ?? '';
}

function numero(value: unknown, porDefecto = 0): number {
  return asNumber(value) ?? porDefecto;
}

function parseItem(raw: unknown): CotizacionItem {
  const r = asRecord(raw);
  return {
    claveLocal: nuevaClaveLinea(),
    producto_externo_id: texto(r.producto_externo_id),
    producto_nombre: texto(r.producto_nombre),
    producto_descripcion: typeof r.producto_descripcion === 'string' ? r.producto_descripcion : '',
    pdf_descripcion_corta: texto(r.pdf_descripcion_corta),
    unidad: texto(r.unidad),
    thumbnail_url: texto(r.thumbnail_url),
    cantidad: numero(r.cantidad, 1),
    precio_lista: numero(r.precio_lista),
    descuento_pct: numero(r.descuento_pct),
    sin_iva: asBool(r.sin_iva),
    categoria_id: texto(r.categoria_id),
  };
}

function parseTipoTrabajo(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asNumber(v)).filter((v): v is number => v !== null);
}

/** Conteos de las líneas: cuántas son, cuántas son productos y cuántas piezas suman. */
function conteoLineas(items: unknown): { lineas: number; productos: number; piezas: number } {
  if (!Array.isArray(items)) return { lineas: 0, productos: 0, piezas: 0 };
  let productos = 0;
  let piezas = 0;
  for (const raw of items) {
    const r = asRecord(raw);
    if (texto(r.producto_externo_id)) productos += 1;
    piezas += Math.max(0, numero(r.cantidad));
  }
  return { lineas: items.length, productos, piezas: Math.round(piezas * 100) / 100 };
}

export function parseCotizacionListItem(raw: unknown): CotizacionListItem | null {
  const r = asRecord(raw);
  const id = asNumber(r.id);
  if (id === null) return null;
  const lineas = conteoLineas(r.items);
  return {
    id,
    idx: asNumber(r.idx),
    cliente_id: asNumber(r.cliente_id),
    cliente: texto(r.cliente),
    cliente_nombre: asString(r.cliente_nombre),
    prospecto: asBool(r.prospecto),
    contacto: texto(r.contacto),
    contacto_telefono: texto(r.contacto_telefono),
    cliente_telefono: asString(r.cliente_telefono),
    status: parseCotizacionStatus(r.status),
    fecha: asString(r.fecha),
    total: numero(r.total),
    es_garantia: asBool(asRecord(r.pdf_opciones).es_garantia),
    tipo_trabajo_nombres: texto(r.tipo_trabajo_nombres),
    creado_por: asNumber(r.creado_por),
    creado_por_full_name: asString(r.creado_por_full_name),
    creado_por_avatar_url: asString(r.creado_por_avatar_url),
    numero_conceptos: lineas.lineas,
    numero_productos: lineas.productos,
    piezas: lineas.piezas,
  };
}

/** Acepta el arreglo plano o el sobre paginado `{ results }`. */
export function parseCotizacionList(raw: unknown): CotizacionListItem[] {
  const lista = Array.isArray(raw) ? raw : asRecord(raw).results;
  if (!Array.isArray(lista)) return [];
  return lista.map(parseCotizacionListItem).filter((c): c is CotizacionListItem => c !== null);
}

export function parsePdfOpciones(value: unknown): PdfOpciones {
  const o = asRecord(value);
  return {
    ocultar_precios_unitarios: asBool(o.ocultar_precios_unitarios),
    ocultar_importes_linea: asBool(o.ocultar_importes_linea),
    ocultar_totales: asBool(o.ocultar_totales),
    ocultar_detalle: asBool(o.ocultar_detalle),
    simplificar_descripcion: asBool(o.simplificar_descripcion),
    es_garantia: asBool(o.es_garantia),
  };
}

function parseCategorias(value: unknown): CategoriaPartidas[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(asRecord)
    .map((c, i) => ({ id: texto(c.id), nombre: texto(c.nombre), orden: numero(c.orden, i) }))
    .filter((c) => c.id && c.nombre)
    .sort((a, b) => a.orden - b.orden);
}

export function parseCotizacion(raw: unknown): Cotizacion {
  const base = parseCotizacionListItem(raw);
  if (!base) throw new Error('La cotización llegó incompleta del servidor.');
  const r = asRecord(raw);
  return {
    ...base,
    medio_contacto: parseMedio(r.medio_contacto),
    tipo_trabajo: parseTipoTrabajo(r.tipo_trabajo),
    subtotal: numero(r.subtotal),
    descuento_cliente_pct: numero(r.descuento_cliente_pct),
    anticipo_pct: numero(r.anticipo_pct, 60),
    texto_arriba_precios: typeof r.texto_arriba_precios === 'string' ? r.texto_arriba_precios : '',
    terminos: typeof r.terminos === 'string' ? r.terminos : '',
    categorias_productos: parseCategorias(r.categorias_productos),
    pdf_opciones: parsePdfOpciones(r.pdf_opciones),
    items: Array.isArray(r.items) ? r.items.map(parseItem) : [],
    actualizado_por_full_name: asString(r.actualizado_por_full_name),
    actualizado_por_avatar_url: asString(r.actualizado_por_avatar_url),
    fecha_creacion: asString(r.fecha_creacion),
    fecha_actualizacion: asString(r.fecha_actualizacion),
    enviado_por_full_name: asString(r.enviado_por_full_name),
    enviado_en: asString(r.enviado_en),
    enviado_comentario: texto(r.enviado_comentario),
  };
}

export function parseClienteOpcion(raw: unknown): ClienteOpcion | null {
  const r = asRecord(raw);
  const id = asNumber(r.id);
  const nombre = asString(r.nombre);
  if (id === null || !nombre) return null;
  const contactos = Array.isArray(r.contactos) ? r.contactos.map(asRecord) : [];
  const principal = contactos.find((c) => asBool(c.is_principal)) ?? contactos[0];
  return {
    id,
    nombre,
    telefono: texto(r.telefono) || texto(r.celular),
    correo: texto(r.correo),
    es_prospecto: asBool(r.is_prospecto),
    contacto_principal: principal ? texto(principal.nombre_apellido) : '',
    contacto_telefono: principal ? texto(principal.celular) : '',
  };
}

function lista(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const results = asRecord(raw).results;
  return Array.isArray(results) ? results : [];
}

export function parseClientes(raw: unknown): ClienteOpcion[] {
  return lista(raw).map(parseClienteOpcion).filter((c): c is ClienteOpcion => c !== null);
}

export function parseServicios(raw: unknown): ServicioOpcion[] {
  return lista(raw)
    .map(asRecord)
    .filter((s) => s.activo !== false)
    .map((s) => ({ id: asNumber(s.id), nombre: asString(s.nombre) }))
    .filter((s): s is ServicioOpcion => s.id !== null && s.nombre !== null);
}

export function parseConceptos(raw: unknown): ConceptoCatalogo[] {
  return lista(raw)
    .map(asRecord)
    .map((c) => ({
      id: asNumber(c.id) ?? 0,
      folio: texto(c.folio),
      concepto: texto(c.concepto) || texto(c.nombre),
      descripcion: texto(c.descripcion),
      precio: numero(c.precio1 ?? c.precio),
      imagen_url: texto(c.imagen_url),
    }))
    .filter((c) => c.id > 0 && c.concepto.length > 0);
}
