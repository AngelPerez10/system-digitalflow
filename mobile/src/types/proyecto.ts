/**
 * Espejo *parcial* de `ProyectoSerializer` (backend/apps/operacion). Solo el
 * subconjunto que el técnico usa en campo — el módulo completo (cotizaciones,
 * catálogo Syscom/TVC, presupuesto) se queda como tarea de oficina en la web.
 *
 * Los campos de nivel raíz van en snake_case (convención DRF); los blobs JSON
 * (`equipos`, `notas_por_dia`, `cotizaciones`, `tecnicos`, `auxiliares`)
 * conservan las claves camelCase con las que el frontend web los escribe —
 * son JSONField libres, no pasan por un serializer anidado que las traduzca.
 */

export const PROYECTO_STATUSES = ['en_proceso', 'pausado', 'saldo_pendiente', 'cerrado', 'cancelado'] as const;
export type ProyectoStatus = (typeof PROYECTO_STATUSES)[number];

export type ProyectoStatusAdministrativo = 'pendiente' | 'en_revision' | 'enviado' | 'cerrado';

export type ProyectoPersonaAsignada = {
  id: number | null;
  nombre: string;
  /** Foto de perfil (solo lectura; la agrega el backend al serializar). */
  avatar_url?: string | null;
};

export type ProyectoTecnicoAsignado = ProyectoPersonaAsignada & {
  responsable: boolean;
};

export type ProyectoTipoTrabajo = {
  id: number;
  nombre: string;
};

export type EquipoEstadoInstalacion = 'pendiente' | 'entregado' | 'no_instalado' | 'instalado';

export type ProyectoEquipoLinea = {
  lineaId: string;
  modelo: string;
  modeloOriginal: string;
  cantidad: number;
  productoId?: string;
  marca?: string;
  imagenUrl?: string;
  fuenteProducto?: 'syscom' | 'tvc' | 'manual';
  estadoInstalacion: EquipoEstadoInstalacion;
  equipoEntregado: boolean;
  cotizacionVinculoId?: string;
  cotizacionOrden?: number;
  cotizacionFolio?: string;
};

export type ProyectoNotaDia = {
  id: string;
  nota: string;
  /** Hasta 2 fotos por jornada (Cloudinary, carpeta `proyectos/bitacora`). */
  imagenesUrls: string[];
};

export type CotizacionOrigen = 'digitalflow' | 'sicar';

export type CotizacionResumen = {
  id: string;
  origen: CotizacionOrigen;
  folio: string;
  cliente: string;
  fecha: string;
  contacto?: string;
};

/** Solo lo necesario para mostrar qué cotizaciones están vinculadas (solo lectura). */
export type ProyectoCotizacionBloque = {
  vinculoId: string;
  orden: number;
  cotizacion: CotizacionResumen;
  /** Tipos de trabajo detectados en esa cotización al vincularla (oficina, informativo). */
  tiposTrabajo?: ProyectoTipoTrabajo[];
};

export interface ProyectoListItem {
  id: number;
  idx: number | null;
  folio: string | null;
  cliente_id: number | null;
  cliente_nombre: string | null;
  status: ProyectoStatus;
  motivo_pausa: string | null;
  tipo_trabajo_nombre: string | null;
  tipos_trabajo: ProyectoTipoTrabajo[];
  fechas_inicio: string[];
  hora_llegada: string | null;
  hora_salida: string | null;
  tecnicos: ProyectoTecnicoAsignado[];
  auxiliares: ProyectoPersonaAsignada[];
  cotizaciones_count: number;
  cotizacion_folio: string | null;
  cotizacion_origen: CotizacionOrigen | null;
  equipos_total: number;
  equipos_entregados: number;
  equipos_instalados: number;
  porcentaje_avance: number;
  /** El backend manda `notas_por_dia` también en el listado (un solo serializer
   *  para lista/detalle, a diferencia de Órdenes); se usa para el avance de la
   *  bitácora en la tarjeta sin pedir el detalle completo. */
  notas_por_dia: ProyectoNotaDia[];
  status_changed_by_full_name: string | null;
  status_changed_at: string | null;
  created_at: string | null;
}

export interface Proyecto extends ProyectoListItem {
  motivo_cancelacion: string | null;
  fecha_autorizacion: string | null;
  quien_autorizo: string | null;
  vehiculo_asignado: string | null;
  herramientas_generales: string | null;
  cotizaciones: ProyectoCotizacionBloque[];
  equipos: ProyectoEquipoLinea[];
  incidencias: string | null;
  requerimientos_adicionales: string | null;
  requiere_presupuesto_adicional: boolean;
  /**
   * Solo aplica cuando algún tipo de trabajo es "Alarmas": si el proyecto cuenta con
   * monitoreo. `null` = aún no se ha elegido — no hay «No» por defecto.
   */
  monitoreo: boolean | null;
  cotizacion_adicional: CotizacionResumen | null;
  status_administrativo: ProyectoStatusAdministrativo;
  evidencias_urls: string[];
  firma_cliente_url: string | null;
  firma_tecnico_url: string | null;
}

/**
 * Campos que el formulario de campo puede mandar en el `PATCH`.
 * Espejo de `assert_tecnico_locked_fields` (backend/apps/operacion/tipos_trabajo.py):
 * el técnico asignado NO puede tocar `tipos_trabajo`, `fecha_autorizacion` ni
 * la lista de `cotizaciones` vinculadas — sí puede marcar entrega/instalación
 * de los equipos que ya están ahí. `fecha_autorizacion` solo la envía oficina
 * (admin); la app la bloquea en UI para el técnico y el backend la rechaza igual.
 */
export interface ProyectoFieldPatch {
  status?: ProyectoStatus;
  motivo_pausa?: string;
  /** Solo admin: el backend exige este motivo al poner `status: "cancelado"`
   *  y rechaza que el técnico asignado lo toque. */
  motivo_cancelacion?: string;
  fecha_autorizacion?: string;
  fechas_inicio?: string[];
  hora_llegada?: string;
  hora_salida?: string;
  vehiculo_asignado?: string;
  herramientas_generales?: string;
  equipos?: ProyectoEquipoLinea[];
  notas_por_dia?: ProyectoNotaDia[];
  porcentaje_avance?: number;
  incidencias?: string;
  requerimientos_adicionales?: string;
  requiere_presupuesto_adicional?: boolean;
  monitoreo?: boolean | null;
  evidencias_urls?: string[];
  firma_cliente_url?: string;
  firma_tecnico_url?: string;
}
