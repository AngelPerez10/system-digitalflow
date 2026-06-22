import type { SyscomProducto } from "@/pages/ProductosYServicios/syscomCatalog";
import type { CotizacionPdfOpciones } from "./cotizacionPdfTypes";

export type ClienteContacto = {
  id?: number;
  cliente?: number;
  nombre_apellido: string;
  titulo?: string;
  area_puesto?: string;
  celular?: string;
  correo?: string;
  is_principal?: boolean;
};

export type Cliente = {
  id: number;
  idx: number;
  nombre: string;
  is_prospecto?: boolean;
  telefono?: string;
  direccion?: string;
  descuento_pct?: number | string | null;
  contactos?: ClienteContacto[];
};

export type CotizacionCategoria = {
  id: string;
  nombre: string;
  orden: number;
};

export type Concepto = {
  id: string;
  producto_externo_id: string;
  producto_nombre: string;
  producto_descripcion: string;
  unidad: string;
  thumbnail_url?: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
  categoria_id?: string;
};

export type ApiCotizacionItem = {
  id?: number;
  producto_externo_id?: string;
  producto_nombre: string;
  producto_descripcion: string;
  pdf_descripcion_corta?: string;
  unidad: string;
  thumbnail_url?: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
  orden?: number;
  categoria_id?: string;
};

export type SyscomPopPos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export type CatalogoConcepto = {
  id: number;
  folio: string;
  concepto: string;
  descripcion?: string;
  precio1: number;
  imagen_url?: string;
};

export type ProductoManualCatalogo = {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  precio: number;
  stock: number;
  imagen_url?: string;
};

export type ServicioOption = { id: number; nombre: string };

export type CloneCotizacionRow = {
  id: number;
  idx: number;
  cliente: string;
  contacto: string;
  fecha: string;
  total: number;
};

export type ApiCotizacion = {
  id: number;
  idx: number;
  cliente_id: number | null;
  cliente_nombre?: string;
  cliente: string;
  prospecto: boolean;
  contacto: string;
  contacto_telefono?: string;
  medio_contacto?: string;
  tipo_trabajo?: number[] | { id: number; nombre?: string }[];
  status?: string;
  descuento_cliente_pct?: number | string | null;
  fecha: string | null;
  subtotal: number;
  iva_pct: number;
  iva: number;
  total: number;
  texto_arriba_precios: string;
  terminos: string;
  pdf_opciones?: CotizacionPdfOpciones;
  categorias_productos?: CotizacionCategoria[];
  items: ApiCotizacionItem[];
};

export type CotizacionPermissions = {
  cotizaciones?: { view?: boolean; create?: boolean; edit?: boolean };
};

export type UpsertCotizacionOptions = {
  navigateAfterSave?: boolean;
  validateRequired?: boolean;
  silent?: boolean;
  autosave?: boolean;
};

export type { SyscomProducto };
