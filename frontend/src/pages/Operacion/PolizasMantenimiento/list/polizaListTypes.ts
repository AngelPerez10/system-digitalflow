import type { PolizaIntervaloMeses } from "../shared/polizaVisitas";

export type PolizaTipo = "cctv";

export type PolizaEstado = "vigente" | "proxima_visita" | "vencida";

export type PolizaAltaValues = {
  clienteId: string;
  clienteNombre?: string;
  tipo: PolizaTipo;
  servicioTipo: string;
  equiposAtendidos: string;
  cotizacionId: string;
  intervaloMeses: PolizaIntervaloMeses;
  fecha1: string;
  fecha2: string;
  fecha3: string;
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
  intervaloMeses: PolizaIntervaloMeses;
  fecha1: string;
  fecha2: string;
  fecha3: string;
  estado: PolizaEstado;
};

export type PolizaStats = {
  total: number;
  vigentes: number;
  proximaVisita: number;
  vencidas: number;
};
