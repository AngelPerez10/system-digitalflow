/**
 * Espejo de `ReporteMantenimientoSerializer` (backend/apps/operacion). El
 * reporte cuelga de una orden de trabajo **o** de un proyecto (uno de los
 * dos); `orden_folio` / `orden_cliente` son la foto del documento de origen
 * que el servidor guarda al crear (también cuando el origen es un proyecto).
 */

/** Límite del servidor por lado (Antes / Después) en cada zona. */
export const REPORTE_MAX_FOTOS_POR_LADO = 10;

export type ReporteOrigen = 'orden' | 'proyecto';

/** Una zona del servicio («Cámara entrada», «Tablero») con su evidencia. */
export interface ReporteZona {
  id: string;
  titulo: string;
  fotos_antes: string[];
  fotos_despues: string[];
}

export interface Reporte {
  id: number;
  idx: number | null;
  folio: string | null;
  orden_id: number | null;
  proyecto_id: number | null;
  origen_tipo: ReporteOrigen;
  orden_folio: string | null;
  orden_cliente: string | null;
  /** `YYYY-MM-DD`. */
  fecha_servicio: string;
  /** Uno o varios nombres separados por coma («Ana Pérez, Luis Gómez»). */
  tecnico_nombre: string;
  secciones: ReporteZona[];
  creado_por: number | null;
  creado_por_username: string | null;
  updated_at: string | null;
}

/** Cuerpo de POST / PATCH. Siempre se mandan los dos orígenes; el que no aplica va en `null`. */
export interface ReportePayload {
  orden_id: number | null;
  proyecto_id: number | null;
  fecha_servicio: string;
  tecnico_nombre: string;
  secciones: ReporteZona[];
}
