import type { ClienteOpcion, ServicioOpcion } from '@/types/cotizacion';
import type { OrdenCreatePayload, PrioridadPool } from '@/types/orden';
import { esFechaValida, esHoraValida, hoyISO } from '@/utils/fecha';

/**
 * Alta de orden desde la app, con las reglas de la web
 * (`useOrdenFormDraft.validateForm`): cliente del catálogo, teléfono y al
 * menos un servicio; la prioridad de la bolsa solo la fija (y la exige) un
 * administrador. La orden nace «Pendiente».
 */

export interface ClienteOrden {
  id: number;
  nombre: string;
  prospecto: boolean;
}

export interface CrearOrdenFormState {
  cliente: ClienteOrden | null;
  /** Quien recibe el servicio en sitio (puede no ser el titular). */
  nombre_cliente: string;
  telefono_cliente: string;
  direccion: string;
  problematica: string;
  /** Ids del catálogo de servicios; al guardar se mandan los nombres. */
  servicios: number[];
  /** `null` = sin asignar. */
  tecnico_asignado: number | null;
  prioridad_pool: PrioridadPool | '';
  fecha_inicio: string;
  hora_inicio: string;
}

export type CrearOrdenErrors = Partial<Record<keyof CrearOrdenFormState, string>>;

export const SECCIONES_CREAR = ['cliente', 'servicio', 'asignacion', 'agenda'] as const;
export type SeccionCrear = (typeof SECCIONES_CREAR)[number];

export const TITULO_SECCION: Record<SeccionCrear, string> = {
  cliente: 'Cliente',
  servicio: 'Servicio',
  asignacion: 'Asignación',
  agenda: 'Agenda',
};

/**
 * Teléfono a 10 dígitos: México, EE. UU. y Canadá usan números nacionales de
 * 10 dígitos. Mismo tope y normalización que el backend (`ordenes/telefono.py`).
 */
export const TELEFONO_MAX = 10;
export const PROBLEMATICA_MAX = 1000;

const SECCION_DE_CAMPO: Record<keyof CrearOrdenFormState, SeccionCrear> = {
  cliente: 'cliente',
  nombre_cliente: 'cliente',
  telefono_cliente: 'cliente',
  direccion: 'cliente',
  problematica: 'servicio',
  servicios: 'servicio',
  tecnico_asignado: 'asignacion',
  prioridad_pool: 'asignacion',
  fecha_inicio: 'agenda',
  hora_inicio: 'agenda',
};

/** Solo dígitos, sin lada de país (+52, +52 1, +1). No recorta. */
export function normalizarTelefono(valor: string): string {
  const d = valor.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('521')) return d.slice(3);
  if (d.length === 12 && d.startsWith('52')) return d.slice(2);
  // Ningún número nacional de MX/EE. UU./Canadá empieza con 1: es la lada +1.
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  return d;
}

/** Agrupa para leerlo (3-3-4, igual en MX, EE. UU. y Canadá); se guarda sin espacios. */
export function formatearTelefono(digitos: string): string {
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)} ${digitos.slice(3)}`;
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
}

/** Para el campo mientras se escribe o pega: normaliza y corta a `TELEFONO_MAX`. */
export function limpiarTelefono(valor: string): string {
  return normalizarTelefono(valor).slice(0, TELEFONO_MAX);
}

export function formVacio(tecnicoId: number | null, hoy: Date = new Date()): CrearOrdenFormState {
  return {
    cliente: null,
    nombre_cliente: '',
    telefono_cliente: '',
    direccion: '',
    problematica: '',
    servicios: [],
    tecnico_asignado: tecnicoId,
    prioridad_pool: '',
    fecha_inicio: hoyISO(hoy),
    hora_inicio: '',
  };
}

/** Elige cliente y precarga contacto y teléfono sin pisar lo que ya se tecleó. */
export function aplicarCliente(form: CrearOrdenFormState, c: ClienteOpcion): CrearOrdenFormState {
  // Del catálogo pueden venir con lada o separadores.
  const telefono = normalizarTelefono(c.contacto_telefono || c.telefono || '').slice(-TELEFONO_MAX);
  return {
    ...form,
    cliente: { id: c.id, nombre: c.nombre, prospecto: c.es_prospecto },
    nombre_cliente: form.nombre_cliente.trim() ? form.nombre_cliente : c.contacto_principal.trim(),
    telefono_cliente: form.telefono_cliente.trim() ? form.telefono_cliente : telefono,
  };
}

export function validarForm(form: CrearOrdenFormState, esAdmin: boolean): CrearOrdenErrors {
  const e: CrearOrdenErrors = {};
  if (!form.cliente) e.cliente = 'Elige un cliente del catálogo.';
  const tel = form.telefono_cliente.trim();
  if (!tel) e.telefono_cliente = 'El teléfono es obligatorio.';
  else if (tel.length > TELEFONO_MAX) e.telefono_cliente = `Máximo ${TELEFONO_MAX} dígitos.`;
  if (form.servicios.length === 0) e.servicios = 'Elige al menos un servicio.';
  if (esAdmin && !form.prioridad_pool) e.prioridad_pool = 'Elige el nivel de prioridad.';
  if (!esFechaValida(form.fecha_inicio)) e.fecha_inicio = 'Fecha inválida.';
  if (form.hora_inicio.trim() && !esHoraValida(form.hora_inicio)) e.hora_inicio = 'Hora inválida.';
  return e;
}

export function hayErrores(errores: CrearOrdenErrors): boolean {
  return Object.values(errores).some(Boolean);
}

export function primeraSeccionConError(errores: CrearOrdenErrors): SeccionCrear | null {
  const conError = new Set(
    (Object.keys(errores) as (keyof CrearOrdenFormState)[]).filter((k) => errores[k]).map((k) => SECCION_DE_CAMPO[k]),
  );
  return SECCIONES_CREAR.find((s) => conError.has(s)) ?? null;
}

export function seccionesCompletas(form: CrearOrdenFormState, esAdmin: boolean): Record<SeccionCrear, boolean> {
  return {
    cliente: Boolean(form.cliente) && form.telefono_cliente.trim().length > 0,
    servicio: form.servicios.length > 0,
    asignacion: !esAdmin || Boolean(form.prioridad_pool),
    agenda: esFechaValida(form.fecha_inicio),
  };
}

export type EstadoSeccion = 'vacio' | 'incompleto' | 'completo';

/** Estado visual del chip de cada grupo: vacío / empezado / listo. */
export function estadoSeccion(
  form: CrearOrdenFormState,
  seccion: SeccionCrear,
  esAdmin: boolean,
): EstadoSeccion {
  if (seccionesCompletas(form, esAdmin)[seccion]) return 'completo';
  const empezada =
    seccion === 'cliente'
      ? Boolean(form.cliente || form.telefono_cliente.trim() || form.nombre_cliente.trim() || form.direccion.trim())
      : seccion === 'servicio'
        ? form.servicios.length > 0 || form.problematica.trim().length > 0
        : seccion === 'asignacion'
          ? form.tecnico_asignado !== null || Boolean(form.prioridad_pool)
          : Boolean(form.hora_inicio.trim());
  return empezada ? 'incompleto' : 'vacio';
}

/** Avance para la barra marina: cuántas secciones están listas y cuál sigue. */
export function progresoCrear(
  form: CrearOrdenFormState,
  esAdmin: boolean,
): { completadas: number; total: number; siguiente: SeccionCrear | null; siguienteTitulo: string | null } {
  const listas = seccionesCompletas(form, esAdmin);
  const total = SECCIONES_CREAR.length;
  const completadas = SECCIONES_CREAR.filter((s) => listas[s]).length;
  const siguiente = SECCIONES_CREAR.find((s) => !listas[s]) ?? null;
  return {
    completadas,
    total,
    siguiente,
    siguienteTitulo: siguiente ? TITULO_SECCION[siguiente] : null,
  };
}

/** Lo que falta para poder crear, en el orden del formulario. */
export function requisitosPendientes(
  form: CrearOrdenFormState,
  esAdmin: boolean,
): { clave: SeccionCrear; texto: string }[] {
  const r: { clave: SeccionCrear; texto: string }[] = [];
  if (!form.cliente) r.push({ clave: 'cliente', texto: 'Elegir el cliente' });
  if (!form.telefono_cliente.trim()) r.push({ clave: 'cliente', texto: 'Capturar el teléfono' });
  if (form.servicios.length === 0) r.push({ clave: 'servicio', texto: 'Elegir al menos un servicio' });
  if (esAdmin && !form.prioridad_pool) r.push({ clave: 'asignacion', texto: 'Elegir la prioridad' });
  return r;
}

/** Hay algo capturado que se perdería al salir. */
export function hayCaptura(form: CrearOrdenFormState): boolean {
  return Boolean(
    form.cliente ||
      form.nombre_cliente.trim() ||
      form.telefono_cliente.trim() ||
      form.direccion.trim() ||
      form.problematica.trim() ||
      form.servicios.length,
  );
}

export function construirPayload(
  form: CrearOrdenFormState,
  servicios: ServicioOpcion[],
  esAdmin: boolean,
): OrdenCreatePayload {
  if (!form.cliente) throw new Error('Falta el cliente.');
  const nombres = new Map(servicios.map((s) => [s.id, s.nombre]));
  const payload: OrdenCreatePayload = {
    cliente_id: form.cliente.id,
    cliente: form.cliente.nombre.slice(0, 100),
    nombre_cliente: form.nombre_cliente.trim().slice(0, 100),
    telefono_cliente: form.telefono_cliente.trim(),
    direccion: form.direccion.trim(),
    problematica: form.problematica.trim(),
    servicios_realizados: form.servicios.map((id) => nombres.get(id)).filter((n): n is string => Boolean(n)),
    tecnico_asignado: form.tecnico_asignado,
    status: 'pendiente',
    fecha_inicio: form.fecha_inicio,
    hora_inicio: form.hora_inicio.trim() || null,
  };
  if (esAdmin && form.prioridad_pool) payload.prioridad_pool = form.prioridad_pool;
  return payload;
}
