export type InventarioFuente = "desconocido" | "syscom" | "tvc";
export type ScanModo = "entrada" | "salida";

export type InventarioItem = {
  id: number;
  codigo_barras: string;
  nombre: string;
  marca: string;
  modelo: string;
  notas: string;
  fuente: InventarioFuente;
  ref_externa: string;
  imagen_url: string;
  /** Sección de catálogo (slug); vacío = sin sección. */
  seccion: string;
  cantidad: number;
  /** Folio de la última factura importada (vacío si solo se escaneó). */
  folio_factura: string;
  /** FK al Cliente PROVEEDOR de Contactos; null si no hay. */
  proveedor: number | null;
  proveedor_nombre: string;
  /** Costo por pieza de la última compra; null si no hay. */
  precio_unitario: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type InventarioMovimiento = {
  id: number;
  item: number;
  item_codigo_barras: string;
  item_nombre: string;
  item_marca: string;
  item_modelo: string;
  tipo: ScanModo;
  cantidad: number;
  usuario: number | null;
  /** Nombre visible del operador que registró el movimiento (vacío si no hay usuario). */
  usuario_nombre: string;
  nota: string;
  creado_en: string;
};

export type ScanResponse = {
  item: InventarioItem;
  movimiento: InventarioMovimiento;
  creado: boolean;
  enriquecido: boolean;
};

export type InventarioItemPatch = Partial<
  Pick<
    InventarioItem,
    | "nombre"
    | "marca"
    | "modelo"
    | "notas"
    | "fuente"
    | "ref_externa"
    | "imagen_url"
    | "precio_unitario"
    | "seccion"
  >
>;

/** Candidato de SYSCOM/TVC/manuales para vincular a mano un código de barras. */
export type CatalogoCandidato = {
  nombre: string;
  marca: string;
  modelo: string;
  fuente: InventarioFuente | "manual";
  ref_externa: string;
  imagen_url: string;
  /** Ficha técnica del proveedor; la búsqueda suele traerla vacía y el detalle no. */
  caracteristicas: string;
  /** Precio de lista en MXN si el catálogo lo resolvió. */
  precio_unitario?: string | null;
  /** Sección sugerida desde la categoría del catálogo. */
  seccion?: string;
};

export type InventarioItemsParams = {
  search?: string;
  page?: number;
  page_size?: number;
  /** slug, o "sin" para sin sección; omitir = todas. */
  seccion?: string;
};

export type InventarioMovimientosParams = {
  item?: number | string;
  desde?: string;
  page?: number;
  page_size?: number;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type InventarioStats = {
  total_items: number;
  total_unidades: number;
  sin_identificar: number;
  movimientos_hoy: number;
};

export type FacturaProveedor = "syscom" | "tvc";

export type ImportarFacturaResponse = {
  importacion_id: number;
  proveedor: FacturaProveedor;
  folio: string;
  creados: number;
  actualizados: number;
  movimientos: number;
  items: InventarioItem[];
};
