export const COTIZACION_STATUSES = ['PENDIENTE', 'AUTORIZADA', 'CANCELADA'] as const;
export type CotizacionStatus = (typeof COTIZACION_STATUSES)[number];

/** Medios de contacto del backend (`Cotizacion.MEDIO_CONTACTO_CHOICES`). */
export const MEDIOS_CONTACTO = [
  'CLIENTE',
  'BNI',
  'REFERIDO',
  'WEB',
  'TIENDA_ONLINE',
  'FACEBOOK',
  'INSTAGRAM',
  'TIKTOK',
  'GOOGLE_MAPS',
  'YOUTUBE',
  'TIENDA_FISICA',
] as const;
export type MedioContacto = (typeof MEDIOS_CONTACTO)[number];

/**
 * Línea de la cotización. Con `producto_externo_id` es un producto de
 * catálogo mayorista (su precio ya trae IVA); sin él es un concepto manual
 * (precio base al que se le suma el 16 %).
 */
export interface CotizacionItem {
  /** Id local estable para la UI (el backend reemplaza las líneas al guardar). */
  claveLocal: string;
  producto_externo_id: string;
  producto_nombre: string;
  producto_descripcion: string;
  pdf_descripcion_corta: string;
  unidad: string;
  thumbnail_url: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
  sin_iva: boolean;
  categoria_id: string;
}

export interface CotizacionListItem {
  id: number;
  idx: number | null;
  cliente_id: number | null;
  cliente: string;
  cliente_nombre: string | null;
  prospecto: boolean;
  contacto: string;
  contacto_telefono: string;
  /** Teléfono del cliente del catálogo (respaldo si no hay el del contacto). */
  cliente_telefono: string | null;
  status: CotizacionStatus;
  fecha: string | null;
  total: number;
  /** Garantía (`pdf_opciones.es_garantia`): el monto se muestra en $0 en toda la app, igual que en el PDF. */
  es_garantia: boolean;
  tipo_trabajo_nombres: string;
  creado_por: number | null;
  creado_por_full_name: string | null;
  creado_por_avatar_url: string | null;
  /** Líneas de la cotización (productos + conceptos). */
  numero_conceptos: number;
  /** Líneas que son productos de catálogo mayorista. */
  numero_productos: number;
  /** Suma de cantidades de todas las líneas (piezas / servicios). */
  piezas: number;
}

export interface Cotizacion extends CotizacionListItem {
  medio_contacto: MedioContacto | '';
  tipo_trabajo: number[];
  subtotal: number;
  descuento_cliente_pct: number;
  anticipo_pct: number;
  texto_arriba_precios: string;
  terminos: string;
  categorias_productos: CategoriaPartidas[];
  pdf_opciones: PdfOpciones;
  items: CotizacionItem[];
  actualizado_por_full_name: string | null;
  actualizado_por_avatar_url: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  enviado_por_full_name: string | null;
  enviado_en: string | null;
  enviado_comentario: string;
}

/** Opciones de exportación (`pdf_opciones`), las mismas de la web. Aplican al PDF y al Excel. */
export interface PdfOpciones {
  ocultar_precios_unitarios: boolean;
  ocultar_importes_linea: boolean;
  ocultar_totales: boolean;
  ocultar_detalle: boolean;
  simplificar_descripcion: boolean;
  /** Garantía: precios en $0 y marca de agua «GARANTÍA» en el PDF. */
  es_garantia: boolean;
}

/** Categoría para agrupar partidas (se define en la web). */
export interface CategoriaPartidas {
  id: string;
  nombre: string;
  orden: number;
}

export interface ClienteOpcion {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  es_prospecto: boolean;
  contacto_principal: string;
  contacto_telefono: string;
}

export interface ServicioOpcion {
  id: number;
  nombre: string;
}

export interface ConceptoCatalogo {
  id: number;
  folio: string;
  concepto: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
}

/** Cuerpo que el backend acepta en `POST`/`PATCH` (los totales los recalcula él). */
export interface CotizacionPayload {
  cliente_id: number | null;
  cliente: string;
  prospecto: boolean;
  contacto: string;
  contacto_telefono: string;
  medio_contacto: string;
  tipo_trabajo: number[];
  status: CotizacionStatus;
  /** Solo al crear (la web pone la fecha del día); al editar se conserva la guardada. */
  fecha?: string;
  descuento_cliente_pct: number;
  anticipo_pct: number;
  pdf_opciones: PdfOpciones;
  items: (Omit<CotizacionItem, 'claveLocal'> & { orden: number })[];
}
