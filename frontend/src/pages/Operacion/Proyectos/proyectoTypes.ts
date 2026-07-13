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
};

export type EquipoEstadoInstalacion = "pendiente" | "entregado" | "no_instalado" | "instalado";

export type ProyectoEquipoLinea = {
  lineaId: string;
  modelo: string;
  modeloOriginal: string;
  /** ID Syscom cuando el modelo se eligió del catálogo. */
  productoId?: string;
  marca?: string;
  estadoInstalacion: EquipoEstadoInstalacion;
  equipoEntregado: boolean;
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
};

export type ProyectoDraft = {
  cliente: string;
  clienteId: string;
  cotizacion: CotizacionResumen | null;
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
