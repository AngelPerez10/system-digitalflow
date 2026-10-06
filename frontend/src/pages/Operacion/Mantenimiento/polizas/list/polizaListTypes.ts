export type PolizaTipo = "cctv";

export type PolizaEstado = "vigente" | "proxima_visita" | "vencida";

/** Filtro del listado: un estado o todas. */
export type PolizaEstadoFiltro = "todas" | PolizaEstado;

export type PolizaAltaValues = {
  clienteId: string;
  clienteNombre?: string;
  tipo: PolizaTipo;
  servicioTipo: string;
  equiposAtendidos: string;
  cotizacionId: string;
  /** Fechas ISO (YYYY-MM-DD) de 1 a 4 visitas; pueden repetirse. */
  visitas: string[];
};

export type PolizaRow = {
  id: number;
  idx: number;
  folio: string;
  clienteId: string;
  cliente: string;
  tipo: PolizaTipo;
  tipoLabel: string;
  servicioTipo: string;
  equiposAtendidos: string;
  cotizacionId: string;
  cotizacionFolio: string;
  /** Visitas en orden cronológico. */
  visitas: string[];
  estado: PolizaEstado;
};

export type PolizaStats = {
  total: number;
  vigentes: number;
  proximaVisita: number;
  vencidas: number;
};
