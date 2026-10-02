import type { Reporte, ReporteOrigen, ReportePayload, ReporteZona } from '@/types/reporte';
import { esFechaValida } from '@/utils/fecha';
import { tecnicosDe } from './reporteFormat';

/** Origen elegido: id + lo que se muestra de él (folio y cliente). */
export interface OrigenElegido {
  tipo: ReporteOrigen;
  id: number;
  folio: string;
  cliente: string;
}

export interface ReporteFormState {
  origen: OrigenElegido | null;
  fecha_servicio: string;
  tecnico_nombre: string;
  zonas: ReporteZona[];
}

export type ReporteFormErrors = Partial<Record<'origen' | 'fecha_servicio' | 'tecnico_nombre', string>> & {
  /** Por id de zona. */
  zonas?: Record<string, string>;
};

let contador = 0;
/** Id local estable para una zona nueva (el servidor lo conserva tal cual). */
export function nuevaZona(titulo = ''): ReporteZona {
  contador += 1;
  return { id: `zona-${Date.now().toString(36)}${contador}`, titulo, fotos_antes: [], fotos_despues: [] };
}

export function formStateNuevo(tecnicoNombre: string, fecha: string): ReporteFormState {
  return { origen: null, fecha_servicio: fecha, tecnico_nombre: tecnicoNombre, zonas: [nuevaZona()] };
}

export function formStateDesdeReporte(reporte: Reporte): ReporteFormState {
  const id = reporte.origen_tipo === 'proyecto' ? reporte.proyecto_id : reporte.orden_id;
  return {
    origen:
      id !== null
        ? { tipo: reporte.origen_tipo, id, folio: reporte.orden_folio ?? '', cliente: reporte.orden_cliente ?? '' }
        : null,
    fecha_servicio: reporte.fecha_servicio,
    tecnico_nombre: reporte.tecnico_nombre,
    zonas: reporte.secciones.map((z) => ({ ...z, fotos_antes: [...z.fotos_antes], fotos_despues: [...z.fotos_despues] })),
  };
}

/** Una zona sin nombre ni fotos es un renglón que se agregó y no se usó: no se guarda. */
function zonaVacia(zona: ReporteZona): boolean {
  return !zona.titulo.trim() && zona.fotos_antes.length === 0 && zona.fotos_despues.length === 0;
}

export function validarReporte(form: ReporteFormState): ReporteFormErrors {
  const errores: ReporteFormErrors = {};
  if (!form.origen) errores.origen = 'Elige el proyecto del reporte.';
  if (!esFechaValida(form.fecha_servicio)) errores.fecha_servicio = 'Indica la fecha del servicio.';
  if (tecnicosDe(form.tecnico_nombre).length === 0) errores.tecnico_nombre = 'Escribe quién hizo el servicio.';
  const zonas: Record<string, string> = {};
  for (const zona of form.zonas) {
    if (!zonaVacia(zona) && !zona.titulo.trim()) zonas[zona.id] = 'Ponle nombre a la zona (p. ej. «Cámara entrada»).';
  }
  if (Object.keys(zonas).length > 0) errores.zonas = zonas;
  return errores;
}

export function hayErrores(errores: ReporteFormErrors): boolean {
  return Boolean(errores.origen || errores.fecha_servicio || errores.tecnico_nombre || errores.zonas);
}

export function construirPayload(form: ReporteFormState): ReportePayload {
  return {
    orden_id: form.origen?.tipo === 'orden' ? form.origen.id : null,
    proyecto_id: form.origen?.tipo === 'proyecto' ? form.origen.id : null,
    fecha_servicio: form.fecha_servicio,
    tecnico_nombre: tecnicosDe(form.tecnico_nombre).join(', '),
    secciones: form.zonas
      .filter((z) => !zonaVacia(z))
      .map((z) => ({ ...z, titulo: z.titulo.replace(/\s+/g, ' ').trim() })),
  };
}

/** Huella comparable del formulario: si cambia respecto a la inicial, hay cambios sin guardar. */
export function huella(form: ReporteFormState): string {
  return JSON.stringify(construirPayload(form));
}

/** Zonas con Antes y Después, sobre las que tienen algo capturado (para el progreso del formulario). */
export function progresoZonas(form: ReporteFormState): { completas: number; total: number } {
  const usadas = form.zonas.filter((z) => !zonaVacia(z));
  return {
    completas: usadas.filter((z) => z.fotos_antes.length > 0 && z.fotos_despues.length > 0).length,
    total: usadas.length,
  };
}
