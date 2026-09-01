/** Espejo de `OrdenListSerializer` / `OrdenSerializer` (backend/apps/ordenes). */

export const ORDEN_STATUSES = ['pendiente', 'pausado', 'resuelto'] as const;
export type OrdenStatus = (typeof ORDEN_STATUSES)[number];

export type TipoOrden = 'servicio_tecnico' | 'levantamiento' | 'instalaciones';

export interface OrdenListItem {
  id: number;
  idx: number | null;
  folio: string | null;
  tipo_orden: TipoOrden;
  cliente: string | null;
  cliente_nombre: string | null;
  direccion: string | null;
  telefono_cliente: string | null;
  problematica: string | null;
  status: OrdenStatus;
  motivo_pausa: string | null;
  prioridad: string | null;
  fecha_inicio: string | null;
  hora_inicio: string | null;
  fecha_finalizacion: string | null;
  hora_termino: string | null;
  nombre_cliente: string | null;
  nombre_encargado: string | null;
  tecnico_asignado: number | null;
  tecnico_asignado_full_name: string | null;
  /** Foto del técnico. Solo la manda el portal cliente; `null` en el ERP. */
  tecnico_asignado_avatar_url: string | null;
  creado_por: number | null;
  fecha_creacion: string | null;
}

export type EstadoInstalacionEquipo = 'no_instalado' | 'instalado';

/** Espejo de `normalize_equipos_payload` (backend/apps/ordenes/equipos_inventario.py). */
export interface EquipoInventarioItem {
  lineaId: string;
  inventarioItemId: number;
  nombre: string;
  marca: string;
  modelo: string;
  imagenUrl: string;
  cantidad: number;
  equipoEntregado: boolean;
  estadoInstalacion: EstadoInstalacionEquipo;
}

/** Calificación del cliente al técnico. Espejo de `OrdenCalificacion`. */
export interface OrdenCalificacion {
  estrellas: number;
  comentario: string;
  fecha: string | null;
}

export interface Orden extends OrdenListItem {
  comentario_tecnico: string | null;
  servicios_realizados: string[];
  fotos_urls: string[];
  fotos_extra_max: number;
  firma_cliente_url: string | null;
  firma_encargado_url: string | null;
  equipos_inventario: EquipoInventarioItem[];
  /**
   * Solo las manda el portal cliente (`PortalOrdenDetalleSerializer`). En el
   * detalle del técnico llegan ausentes → `null` / `false`.
   */
  calificacion: OrdenCalificacion | null;
  puede_calificar: boolean;
}

/**
 * Campos que el técnico puede mandar en el `PATCH`.
 * Espejo de `LIMITED_ORDEN_EDIT_FIELDS` (backend/apps/ordenes/edit_scope.py).
 */
export interface OrdenFieldPatch {
  status?: OrdenStatus;
  motivo_pausa?: string;
  comentario_tecnico?: string;
  fecha_inicio?: string | null;
  hora_inicio?: string | null;
  fecha_finalizacion?: string | null;
  hora_termino?: string | null;
  fotos_urls?: string[];
  /** Data URL, URL Cloudinary, o `""` para borrar. */
  firma_cliente_url?: string;
  equipos_inventario?: EquipoInventarioItem[];
}
