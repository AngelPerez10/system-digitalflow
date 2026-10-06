export const REPORTE_MAX_FOTOS_POR_LADO = 10;

export type ReporteSeccion = {
  id: string;
  titulo: string;
  /** Hasta REPORTE_MAX_FOTOS_POR_LADO URLs. */
  fotos_antes: string[];
  fotos_despues: string[];
};

/**
 * Origen del reporte. Los nuevos se vinculan solo a un proyecto; `orden` queda para los
 * reportes anteriores hechos sobre una orden de trabajo (el servidor ya no acepta ligar uno nuevo).
 */
export type ReporteOrigen = "orden" | "proyecto";

export type ReporteMantenimiento = {
  id: number;
  idx: number;
  folio: string;
  orden_id: number | null;
  proyecto_id: number | null;
  /** De dónde cuelga el reporte. */
  origen_tipo: ReporteOrigen;
  /** Folio y cliente del documento origen (orden o proyecto). */
  orden_folio: string;
  orden_cliente: string;
  fecha_servicio: string;
  tecnico_nombre: string;
  foto_orden_url: string;
  secciones: ReporteSeccion[];
  creado_por?: number | null;
  creado_por_username?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ReporteDraft = {
  origen: ReporteOrigen;
  orden_id: string;
  proyecto_id: string;
  fecha_servicio: string;
  tecnico_nombre: string;
  foto_orden_url: string;
  secciones: ReporteSeccion[];
};

export type ReporteApiError = {
  status: number;
  message: string;
};

export function countSeccionFotos(sec: ReporteSeccion): number {
  return sec.fotos_antes.length + sec.fotos_despues.length;
}

export function countReporteFotos(secciones: ReporteSeccion[]): number {
  return secciones.reduce((acc, s) => acc + countSeccionFotos(s), 0);
}

export function emptyReporteDraft(): ReporteDraft {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return {
    origen: "proyecto",
    orden_id: "",
    proyecto_id: "",
    fecha_servicio: `${y}-${m}-${d}`,
    tecnico_nombre: "",
    foto_orden_url: "",
    secciones: [],
  };
}

export function newSeccion(titulo = ""): ReporteSeccion {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    titulo,
    fotos_antes: [],
    fotos_despues: [],
  };
}
