export type CotizacionOrigen = "digitalflow" | "sicar";

export type CotizacionResumen = {
  id: string;
  origen: CotizacionOrigen;
  folio: string;
  cliente: string;
  fecha: string;
  contacto?: string;
};

export type PresupuestoLinea = {
  id: string;
  descripcion: string;
  detalle?: string;
  cantidad: number;
  unidad: string;
  categoria?: string;
  esEquipo: boolean;
  /** Miniatura resuelta (Syscom / TVC / manual / Cloudinary). */
  imagenUrl?: string;
  /** ID de catálogo cuando viene de Syscom/TVC o `manual:<id>`. */
  productoId?: string;
  fuenteProducto?: "syscom" | "tvc" | "manual";
};

/**
 * Cotización vinculada al proyecto con sus partidas.
 * Permite varias instalaciones sin mezclar productos.
 */
export type ProyectoCotizacionBloque = {
  /** Id interno del vínculo en el proyecto (no el id de la cotización API). */
  vinculoId: string;
  /** 1-based: Cotización 1, Cotización 2, … */
  orden: number;
  cotizacion: CotizacionResumen;
  lineas: PresupuestoLinea[];
};

export type EquipoEstadoInstalacion = "pendiente" | "entregado" | "no_instalado" | "instalado";

export type ProyectoEquipoLinea = {
  lineaId: string;
  modelo: string;
  modeloOriginal: string;
  /** ID Syscom/TVC/manual cuando el modelo se eligió del catálogo. */
  productoId?: string;
  marca?: string;
  /** Miniatura del producto (misma fuente que cotización / catálogo). */
  imagenUrl?: string;
  fuenteProducto?: "syscom" | "tvc" | "manual";
  estadoInstalacion: EquipoEstadoInstalacion;
  equipoEntregado: boolean;
  /** Vínculo a la cotización de origen en el proyecto. */
  cotizacionVinculoId?: string;
  cotizacionOrden?: number;
  cotizacionFolio?: string;
};

/** Status operativo del proyecto (formulario). */
export type ProyectoEstado = "en_proceso" | "pausado" | "cerrado";

export type ProyectoPersonaAsignada = {
  id: number | null;
  nombre: string;
};

export type ProyectoNotaDia = {
  id: string;
  nota: string;
  /** Hasta 2 fotos de la jornada (Cloudinary). */
  imagenesUrls: string[];
};

export type ProyectoDraft = {
  cliente: string;
  clienteId: string;
  /**
   * Cotizaciones de presupuesto (1..n).
   * Fuente de verdad de partidas; `cotizacion` / `presupuesto` se sincronizan por compatibilidad.
   */
  cotizaciones: ProyectoCotizacionBloque[];
  /** Primera cotización (compat listado / filas). */
  cotizacion: CotizacionResumen | null;
  /** Líneas aplanadas de todas las cotizaciones (compat). */
  presupuesto: PresupuestoLinea[];
  equipos: ProyectoEquipoLinea[];
  tipoTrabajoId: number | null;
  tipoTrabajoNombre: string;
  status: ProyectoEstado;
  motivoPausa: string;
  fechaAutorizacion: string;
  /** Día 1, Día 2, … */
  fechasInicio: string[];
  horaLlegada: string;
  horaSalida: string;
  tecnico: ProyectoPersonaAsignada;
  auxiliar: ProyectoPersonaAsignada;
  vehiculoAsignado: string;
  herramientasGenerales: string;
  /** Notas de seguimiento por jornada. */
  notasPorDia: ProyectoNotaDia[];
  porcentajeAvance: number;
  incidencias: string;
  requerimientosAdicionales: string;
  requierePresupuestoAdicional: boolean;
  /** Cotización vinculada cuando hay requerimientos / presupuesto adicional. */
  cotizacionAdicional: CotizacionResumen | null;
  evidenciasUrls: string[];
  firmaClienteUrl: string;
  firmaTecnicoUrl: string;
};

export type ProyectoRow = {
  id: string;
  folio: string;
  cliente: string;
  cotizacionFolio: string;
  cotizacionOrigen: CotizacionOrigen;
  cotizacionesCount: number;
  equiposTotal: number;
  equiposEntregados: number;
  equiposInstalados: number;
  estado: ProyectoEstado;
  fecha: string;
  draft: ProyectoDraft;
};

export type ProyectoStats = {
  total: number;
  enProceso: number;
  pausados: number;
  cerrados: number;
};

export type ServicioOpcion = {
  id: number;
  nombre: string;
};

export type TecnicoOpcion = {
  id: number;
  nombre: string;
  email?: string;
};
