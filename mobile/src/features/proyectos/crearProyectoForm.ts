import type { ClienteOpcion, ServicioOpcion } from '@/types/cotizacion';
import type { TecnicoOpcion } from '@/types/orden';
import type { ProyectoTipoTrabajo } from '@/types/proyecto';
import { esFechaValida, esHoraValida, hoyISO } from '@/utils/fecha';
import { proyectoTieneTipoAlarmas } from './proyectoFormat';

/**
 * Alta de proyecto desde la app, con las reglas de la web
 * (`validateProyectoOperacionRequired` + `saveNow` de `useProyectoFormState`):
 * cliente del catálogo, al menos un tipo de trabajo, fecha de autorización y
 * fecha de inicio; si algún tipo es «Alarmas», hay que decir si cuenta con
 * monitoreo. El proyecto nace «En proceso».
 */

export interface ClienteProyecto {
  id: number;
  nombre: string;
  prospecto: boolean;
}

export interface CrearProyectoFormState {
  cliente: ClienteProyecto | null;
  quien_autorizo: string;
  /** Ids del catálogo de servicios, en el orden en que se agregaron. */
  tipos: number[];
  /** `null` = aún no elegido (solo se exige con «Alarmas»). */
  monitoreo: boolean | null;
  /** Técnico responsable; `null` = sin asignar. */
  responsable: number | null;
  auxiliares: number[];
  vehiculo_asignado: string;
  herramientas_generales: string;
  fecha_autorizacion: string;
  /** Primer día de trabajo. */
  inicio_desde: string;
  /** Último día; vacío = un solo día. */
  inicio_hasta: string;
  hora_llegada: string;
}

export type CrearProyectoErrors = Partial<Record<keyof CrearProyectoFormState, string>>;

export const SECCIONES_PROYECTO = ['cliente', 'alcance', 'equipo', 'calendario'] as const;
export type SeccionProyecto = (typeof SECCIONES_PROYECTO)[number];

export const TITULO_SECCION_PROYECTO: Record<SeccionProyecto, string> = {
  cliente: 'Cliente',
  alcance: 'Alcance',
  equipo: 'Equipo',
  calendario: 'Calendario',
};

export const QUIEN_AUTORIZO_MAX = 255;
export const TEXTO_LIBRE_MAX = 500;
/** Tope de días de la jornada de inicio (la web corta en ~10 años; aquí, algo razonable). */
export const DIAS_MAX = 366;

const SECCION_DE_CAMPO: Record<keyof CrearProyectoFormState, SeccionProyecto> = {
  cliente: 'cliente',
  quien_autorizo: 'cliente',
  tipos: 'alcance',
  monitoreo: 'alcance',
  responsable: 'equipo',
  auxiliares: 'equipo',
  vehiculo_asignado: 'equipo',
  herramientas_generales: 'equipo',
  fecha_autorizacion: 'calendario',
  inicio_desde: 'calendario',
  inicio_hasta: 'calendario',
  hora_llegada: 'calendario',
};

export function formProyectoVacio(responsableId: number | null, hoy: Date = new Date()): CrearProyectoFormState {
  return {
    cliente: null,
    quien_autorizo: '',
    tipos: [],
    monitoreo: null,
    responsable: responsableId,
    auxiliares: [],
    vehiculo_asignado: '',
    herramientas_generales: '',
    fecha_autorizacion: hoyISO(hoy),
    inicio_desde: hoyISO(hoy),
    inicio_hasta: '',
    hora_llegada: '',
  };
}

export function aplicarClienteProyecto(form: CrearProyectoFormState, c: ClienteOpcion): CrearProyectoFormState {
  return {
    ...form,
    cliente: { id: c.id, nombre: c.nombre, prospecto: c.es_prospecto },
    quien_autorizo: form.quien_autorizo.trim() ? form.quien_autorizo : c.contacto_principal.trim(),
  };
}

/** Tipos elegidos con su nombre del catálogo (para el envío y la regla de «Alarmas»). */
export function tiposElegidos(form: CrearProyectoFormState, catalogo: ServicioOpcion[]): ProyectoTipoTrabajo[] {
  const nombres = new Map(catalogo.map((s) => [s.id, s.nombre]));
  return form.tipos.map((id) => ({ id, nombre: nombres.get(id) ?? '' }));
}

export function requiereMonitoreo(form: CrearProyectoFormState, catalogo: ServicioOpcion[]): boolean {
  return proyectoTieneTipoAlarmas(tiposElegidos(form, catalogo));
}

/** Días naturales del rango (incluidos ambos extremos); los extremos pueden venir al revés. */
export function expandirRango(desde: string, hasta: string): string[] {
  const a = desde.trim();
  const b = hasta.trim();
  if (!esFechaValida(a) && !esFechaValida(b)) return [];
  if (!esFechaValida(b) || a === b) return esFechaValida(a) ? [a] : [b];
  if (!esFechaValida(a)) return [b];
  const [ini, fin] = a <= b ? [a, b] : [b, a];
  const out: string[] = [];
  const [y, m, d] = ini.split('-').map(Number) as [number, number, number];
  const cursor = new Date(y, m - 1, d);
  while (out.length < DIAS_MAX) {
    const iso = hoyISO(cursor);
    out.push(iso);
    if (iso === fin) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function validarProyecto(form: CrearProyectoFormState, catalogo: ServicioOpcion[]): CrearProyectoErrors {
  const e: CrearProyectoErrors = {};
  if (!form.cliente) e.cliente = 'Elige un cliente del catálogo.';
  if (form.tipos.length === 0) e.tipos = 'Selecciona al menos un tipo de trabajo.';
  if (requiereMonitoreo(form, catalogo) && form.monitoreo === null) {
    e.monitoreo = 'Indica si el proyecto cuenta con monitoreo.';
  }
  if (form.responsable !== null && form.auxiliares.includes(form.responsable)) {
    e.auxiliares = 'El responsable no puede ser también auxiliar.';
  }
  if (!esFechaValida(form.fecha_autorizacion)) e.fecha_autorizacion = 'Indica la fecha de autorización.';
  if (!esFechaValida(form.inicio_desde)) e.inicio_desde = 'Indica la fecha de inicio.';
  else if (form.inicio_hasta.trim() && !esFechaValida(form.inicio_hasta)) e.inicio_hasta = 'Fecha inválida.';
  else if (form.inicio_hasta.trim() && form.inicio_hasta < form.inicio_desde) {
    e.inicio_hasta = 'El último día no puede ser antes del primero.';
  }
  if (form.hora_llegada.trim() && !esHoraValida(form.hora_llegada)) e.hora_llegada = 'Hora inválida.';
  return e;
}

export function hayErroresProyecto(errores: CrearProyectoErrors): boolean {
  return Object.values(errores).some(Boolean);
}

export function primeraSeccionConErrorProyecto(errores: CrearProyectoErrors): SeccionProyecto | null {
  const conError = new Set(
    (Object.keys(errores) as (keyof CrearProyectoFormState)[]).filter((k) => errores[k]).map((k) => SECCION_DE_CAMPO[k]),
  );
  return SECCIONES_PROYECTO.find((s) => conError.has(s)) ?? null;
}

export function seccionesCompletasProyecto(
  form: CrearProyectoFormState,
  catalogo: ServicioOpcion[],
): Record<SeccionProyecto, boolean> {
  return {
    cliente: Boolean(form.cliente),
    alcance: form.tipos.length > 0 && (!requiereMonitoreo(form, catalogo) || form.monitoreo !== null),
    // El equipo es opcional en el alta: listo si no hay conflicto.
    equipo: form.responsable === null || !form.auxiliares.includes(form.responsable),
    calendario: esFechaValida(form.fecha_autorizacion) && esFechaValida(form.inicio_desde),
  };
}

export type EstadoSeccionProyecto = 'vacio' | 'incompleto' | 'completo';

export function estadoSeccionProyecto(
  form: CrearProyectoFormState,
  seccion: SeccionProyecto,
  catalogo: ServicioOpcion[],
): EstadoSeccionProyecto {
  if (seccionesCompletasProyecto(form, catalogo)[seccion]) {
    // El equipo vacío no se pinta «listo» de entrada: se ve como opcional.
    if (seccion === 'equipo' && form.responsable === null && form.auxiliares.length === 0) return 'vacio';
    return 'completo';
  }
  const empezada =
    seccion === 'cliente'
      ? Boolean(form.quien_autorizo.trim())
      : seccion === 'alcance'
        ? form.tipos.length > 0
        : seccion === 'equipo'
          ? form.auxiliares.length > 0
          : Boolean(form.inicio_hasta || form.hora_llegada);
  return empezada ? 'incompleto' : 'vacio';
}

export function progresoProyecto(
  form: CrearProyectoFormState,
  catalogo: ServicioOpcion[],
): { completadas: number; total: number; siguiente: SeccionProyecto | null } {
  const listas = seccionesCompletasProyecto(form, catalogo);
  return {
    completadas: SECCIONES_PROYECTO.filter((s) => listas[s]).length,
    total: SECCIONES_PROYECTO.length,
    siguiente: SECCIONES_PROYECTO.find((s) => !listas[s]) ?? null,
  };
}

/** Hay algo capturado que se perdería al salir. */
export function hayCapturaProyecto(form: CrearProyectoFormState): boolean {
  return Boolean(
    form.cliente ||
      form.quien_autorizo.trim() ||
      form.tipos.length ||
      form.auxiliares.length ||
      form.vehiculo_asignado.trim() ||
      form.herramientas_generales.trim() ||
      form.inicio_hasta ||
      form.hora_llegada,
  );
}

export interface ProyectoCreatePayload {
  cliente_id: number;
  cliente_nombre: string;
  status: 'en_proceso';
  quien_autorizo: string;
  fecha_autorizacion: string;
  fechas_inicio: string[];
  hora_llegada: string;
  tipos_trabajo: ProyectoTipoTrabajo[];
  tipo_trabajo_id: number | null;
  tipo_trabajo_nombre: string;
  monitoreo: boolean | null;
  tecnicos: { id: number; nombre: string; responsable: boolean }[];
  auxiliares: { id: number; nombre: string }[];
  tecnico_id: number | null;
  tecnico_nombre: string;
  auxiliar_id: number | null;
  auxiliar_nombre: string;
  vehiculo_asignado: string;
  herramientas_generales: string;
}

export function construirPayloadProyecto(
  form: CrearProyectoFormState,
  catalogo: ServicioOpcion[],
  personas: TecnicoOpcion[],
): ProyectoCreatePayload {
  if (!form.cliente) throw new Error('Falta el cliente.');
  const nombreDe = (id: number) => personas.find((p) => p.id === id)?.nombre.trim() ?? '';
  const tipos = tiposElegidos(form, catalogo);
  const tecnicos = form.responsable !== null ? [{ id: form.responsable, nombre: nombreDe(form.responsable), responsable: true }] : [];
  const auxiliares = form.auxiliares
    .filter((id) => id !== form.responsable)
    .map((id) => ({ id, nombre: nombreDe(id) }));
  return {
    cliente_id: form.cliente.id,
    cliente_nombre: form.cliente.nombre.trim(),
    status: 'en_proceso',
    quien_autorizo: form.quien_autorizo.trim().slice(0, QUIEN_AUTORIZO_MAX),
    fecha_autorizacion: form.fecha_autorizacion,
    fechas_inicio: expandirRango(form.inicio_desde, form.inicio_hasta),
    hora_llegada: form.hora_llegada.trim(),
    tipos_trabajo: tipos,
    tipo_trabajo_id: tipos[0]?.id ?? null,
    tipo_trabajo_nombre: tipos[0]?.nombre ?? '',
    // Sin «Alarmas» no aplica: se manda `null` aunque se hubiera tocado antes.
    monitoreo: proyectoTieneTipoAlarmas(tipos) ? form.monitoreo : null,
    tecnicos,
    auxiliares,
    tecnico_id: tecnicos[0]?.id ?? null,
    tecnico_nombre: tecnicos[0]?.nombre ?? '',
    auxiliar_id: auxiliares[0]?.id ?? null,
    auxiliar_nombre: auxiliares[0]?.nombre ?? '',
    vehiculo_asignado: form.vehiculo_asignado.trim(),
    herramientas_generales: form.herramientas_generales.trim(),
  };
}
