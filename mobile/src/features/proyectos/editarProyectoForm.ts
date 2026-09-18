import type {
  Proyecto,
  ProyectoEquipoLinea,
  ProyectoFieldPatch,
  ProyectoNotaDia,
  ProyectoStatus,
} from '@/types/proyecto';
import { esFechaValida, esHoraValida } from '@/utils/fecha';
import { proyectoTieneTipoAlarmas } from './proyectoFormat';

/** Estado del formulario de campo (todo lo que el técnico puede tocar). */
export interface EditarProyectoFormState {
  status: ProyectoStatus;
  motivo_pausa: string;
  motivo_cancelacion: string;
  fecha_autorizacion: string;
  fechas_inicio: string[];
  hora_llegada: string;
  hora_salida: string;
  vehiculo_asignado: string;
  herramientas_generales: string;
  equipos: ProyectoEquipoLinea[];
  notas_por_dia: ProyectoNotaDia[];
  porcentaje_avance: number;
  incidencias: string;
  requerimientos_adicionales: string;
  requiere_presupuesto_adicional: boolean;
  /**
   * Solo aplica cuando algún tipo de trabajo es "Alarmas" (ver `proyectoTieneTipoAlarmas`).
   * `null` = aún no se ha elegido — no hay «No» por defecto, hay que elegir para poder cerrar.
   */
  monitoreo: boolean | null;
  evidencias_urls: string[];
  firma_cliente_url: string;
  firma_tecnico_url: string;
}

export type EditarProyectoErrors = Partial<
  Record<Exclude<keyof EditarProyectoFormState, 'notas_por_dia'>, string>
> & {
  notas_por_dia?: Record<string, string>;
};

export const MOTIVO_PAUSA_MAX = 500;
export const MOTIVO_CANCELACION_MAX = 500;
/** Mínimo obligatorio por jornada — solo se exige al cerrar (espejo de `NOTA_DIA_MIN_CHARS`). */
export const NOTA_DIA_MIN_CHARS = 150;

export function formStateFromProyecto(proyecto: Proyecto): EditarProyectoFormState {
  return {
    status: proyecto.status,
    motivo_pausa: proyecto.motivo_pausa ?? '',
    motivo_cancelacion: proyecto.motivo_cancelacion ?? '',
    fecha_autorizacion: proyecto.fecha_autorizacion ?? '',
    fechas_inicio: [...proyecto.fechas_inicio],
    hora_llegada: proyecto.hora_llegada ?? '',
    hora_salida: proyecto.hora_salida ?? '',
    vehiculo_asignado: proyecto.vehiculo_asignado ?? '',
    herramientas_generales: proyecto.herramientas_generales ?? '',
    equipos: proyecto.equipos.map((equipo) => ({ ...equipo })),
    notas_por_dia: proyecto.notas_por_dia.map((nota) => ({ ...nota, imagenesUrls: [...nota.imagenesUrls] })),
    porcentaje_avance: proyecto.porcentaje_avance,
    incidencias: proyecto.incidencias ?? '',
    requerimientos_adicionales: proyecto.requerimientos_adicionales ?? '',
    requiere_presupuesto_adicional: proyecto.requiere_presupuesto_adicional,
    monitoreo: proyecto.monitoreo,
    evidencias_urls: [...proyecto.evidencias_urls],
    firma_cliente_url: proyecto.firma_cliente_url ?? '',
    firma_tecnico_url: proyecto.firma_tecnico_url ?? '',
  };
}

function requiereCotizacionAdicional(state: EditarProyectoFormState): boolean {
  return state.requiere_presupuesto_adicional || Boolean(state.requerimientos_adicionales.trim());
}

export function validarForm(
  state: EditarProyectoFormState,
  proyectoOriginal: Proyecto,
): EditarProyectoErrors {
  const errors: EditarProyectoErrors = {};

  if (proyectoTieneTipoAlarmas(proyectoOriginal.tipos_trabajo) && state.monitoreo == null) {
    errors.monitoreo = 'Indica si el proyecto cuenta con monitoreo.';
  }

  if (state.status === 'pausado' && !state.motivo_pausa.trim()) {
    errors.motivo_pausa = 'Indique por qué se pausó el proyecto.';
  }
  if (state.motivo_pausa.length > MOTIVO_PAUSA_MAX) {
    errors.motivo_pausa = `Máximo ${MOTIVO_PAUSA_MAX} caracteres.`;
  }

  if (state.status === 'cancelado' && !state.motivo_cancelacion.trim()) {
    errors.motivo_cancelacion = 'Indique por qué se canceló el proyecto.';
  }
  if (state.motivo_cancelacion.length > MOTIVO_CANCELACION_MAX) {
    errors.motivo_cancelacion = `Máximo ${MOTIVO_CANCELACION_MAX} caracteres.`;
  }

  if (state.fecha_autorizacion && !esFechaValida(state.fecha_autorizacion)) {
    errors.fecha_autorizacion = 'Fecha inválida.';
  }

  for (const fecha of state.fechas_inicio) {
    if (fecha && !esFechaValida(fecha)) {
      errors.fechas_inicio = 'Hay una fecha con formato inválido.';
      break;
    }
  }
  if (state.hora_llegada && !esHoraValida(state.hora_llegada)) {
    errors.hora_llegada = 'Use el formato HH:MM (24 h).';
  }
  if (state.hora_salida && !esHoraValida(state.hora_salida)) {
    errors.hora_salida = 'Use el formato HH:MM (24 h).';
  }

  if (state.status === 'cerrado') {
    const notasErrores: Record<string, string> = {};
    const lista = state.notas_por_dia.length > 0 ? state.notas_por_dia : [];
    lista.forEach((nota, index) => {
      const len = nota.nota.trim().length;
      if (len >= NOTA_DIA_MIN_CHARS) return;
      notasErrores[nota.id] =
        len === 0
          ? `Escribe al menos ${NOTA_DIA_MIN_CHARS} caracteres en el día ${index + 1} para cerrar.`
          : `Faltan ${NOTA_DIA_MIN_CHARS - len} caracteres en el día ${index + 1} para cerrar.`;
    });
    if (Object.keys(notasErrores).length > 0) errors.notas_por_dia = notasErrores;

    if (requiereCotizacionAdicional(state) && !proyectoOriginal.cotizacion_adicional?.id) {
      errors.requerimientos_adicionales =
        'Hay requerimientos o presupuesto adicional sin cotización vinculada — pide a oficina que la vincule antes de cerrar.';
    }
  }

  return errors;
}

export function hayErrores(errors: EditarProyectoErrors): boolean {
  return Object.keys(errors).some((key) => {
    const value = errors[key as keyof EditarProyectoErrors];
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return Boolean(value);
  });
}

function mismoArregloStrings(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function equiposParaEscritura(equipos: ProyectoEquipoLinea[]) {
  return equipos.map((equipo) => ({ ...equipo }));
}

function mismosEquipos(a: ProyectoEquipoLinea[], b: ProyectoEquipoLinea[]): boolean {
  return JSON.stringify(equiposParaEscritura(a)) === JSON.stringify(equiposParaEscritura(b));
}

function notasParaEscritura(notas: ProyectoNotaDia[]) {
  return notas.map((nota) => ({ id: nota.id, nota: nota.nota, imagenesUrls: [...nota.imagenesUrls] }));
}

function mismasNotas(a: ProyectoNotaDia[], b: ProyectoNotaDia[]): boolean {
  return JSON.stringify(notasParaEscritura(a)) === JSON.stringify(notasParaEscritura(b));
}

/**
 * Construye el PATCH **solo** con lo que cambió. `fecha_autorizacion` viaja
 * aquí también (la UI la bloquea para el técnico asignado — ver
 * `ProyectoStatusSegment`/pantalla de editar — y el backend la rechaza igual
 * vía `assert_tecnico_locked_fields`), junto con `tipos_trabajo` y
 * `cotizaciones`, que no se editan desde esta pantalla.
 */
export function construirPatch(original: Proyecto, state: EditarProyectoFormState): ProyectoFieldPatch {
  const base = formStateFromProyecto(original);
  const patch: ProyectoFieldPatch = {};

  if (state.status !== base.status) patch.status = state.status;
  if (state.motivo_pausa.trim() !== base.motivo_pausa.trim()) {
    patch.motivo_pausa = state.motivo_pausa.trim();
  }
  if (state.fecha_autorizacion.trim() !== base.fecha_autorizacion.trim()) {
    patch.fecha_autorizacion = state.fecha_autorizacion.trim();
  }
  if (state.status === 'pausado' && patch.motivo_pausa === undefined) {
    patch.motivo_pausa = state.motivo_pausa.trim();
  }
  if (state.motivo_cancelacion.trim() !== base.motivo_cancelacion.trim()) {
    patch.motivo_cancelacion = state.motivo_cancelacion.trim();
  }
  if (state.status === 'cancelado' && patch.motivo_cancelacion === undefined) {
    patch.motivo_cancelacion = state.motivo_cancelacion.trim();
  }

  if (!mismoArregloStrings(state.fechas_inicio, base.fechas_inicio)) {
    patch.fechas_inicio = [...state.fechas_inicio];
  }
  if (state.hora_llegada.trim() !== base.hora_llegada.trim()) {
    patch.hora_llegada = state.hora_llegada.trim();
  }
  if (state.hora_salida.trim() !== base.hora_salida.trim()) {
    patch.hora_salida = state.hora_salida.trim();
  }
  if (state.vehiculo_asignado.trim() !== base.vehiculo_asignado.trim()) {
    patch.vehiculo_asignado = state.vehiculo_asignado.trim();
  }
  if (state.herramientas_generales.trim() !== base.herramientas_generales.trim()) {
    patch.herramientas_generales = state.herramientas_generales.trim();
  }
  if (!mismosEquipos(state.equipos, base.equipos)) {
    patch.equipos = equiposParaEscritura(state.equipos);
  }
  if (!mismasNotas(state.notas_por_dia, base.notas_por_dia)) {
    patch.notas_por_dia = notasParaEscritura(state.notas_por_dia);
  }
  if (state.porcentaje_avance !== base.porcentaje_avance) {
    patch.porcentaje_avance = state.porcentaje_avance;
  }
  if (state.incidencias.trim() !== base.incidencias.trim()) {
    patch.incidencias = state.incidencias.trim();
  }
  if (state.requerimientos_adicionales.trim() !== base.requerimientos_adicionales.trim()) {
    patch.requerimientos_adicionales = state.requerimientos_adicionales.trim();
  }
  if (state.requiere_presupuesto_adicional !== base.requiere_presupuesto_adicional) {
    patch.requiere_presupuesto_adicional = state.requiere_presupuesto_adicional;
  }
  if (state.monitoreo !== base.monitoreo) {
    patch.monitoreo = state.monitoreo;
  }
  if (!mismoArregloStrings(state.evidencias_urls, base.evidencias_urls)) {
    patch.evidencias_urls = [...state.evidencias_urls];
  }

  const firmaCliente = state.firma_cliente_url.trim();
  if (firmaCliente !== base.firma_cliente_url.trim()) {
    patch.firma_cliente_url = firmaCliente;
  }
  const firmaTecnico = state.firma_tecnico_url.trim();
  if (firmaTecnico !== base.firma_tecnico_url.trim()) {
    patch.firma_tecnico_url = firmaTecnico;
  }

  return patch;
}

export function tieneCambios(patch: ProyectoFieldPatch): boolean {
  return Object.keys(patch).length > 0;
}

export function crearNotaDia(): ProyectoNotaDia {
  return {
    id: `dia-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nota: '',
    imagenesUrls: [],
  };
}
