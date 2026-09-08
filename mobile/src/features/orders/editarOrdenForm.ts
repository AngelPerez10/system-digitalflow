import type { EquipoInventarioItem, Orden, OrdenFieldPatch, OrdenStatus } from '@/types/orden';
import { esFechaValida, esHoraValida } from '@/utils/fecha';

/** Estado del formulario de campo (todo string: lo que el usuario teclea). */
export interface EditarOrdenFormState {
  status: OrdenStatus;
  motivo_pausa: string;
  comentario_tecnico: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  fotos_urls: string[];
  /** URL https de Cloudinary, data URL pendiente de subir, o vacío. */
  firma_cliente_url: string;
  equipos_inventario: EquipoInventarioItem[];
}

export type EditarOrdenErrors = Partial<Record<keyof EditarOrdenFormState, string>>;

export const MOTIVO_PAUSA_MAX = 500;
export const COMENTARIO_TECNICO_MAX = 4000;
/** Mínimo obligatorio en edición de campo (mismo umbral que el ERP web). */
export const COMENTARIO_TECNICO_MIN = 150;

export function formStateFromOrden(orden: Orden): EditarOrdenFormState {
  return {
    status: orden.status,
    motivo_pausa: orden.motivo_pausa ?? '',
    comentario_tecnico: orden.comentario_tecnico ?? '',
    fecha_inicio: orden.fecha_inicio ?? '',
    hora_inicio: recortarHora(orden.hora_inicio),
    fecha_finalizacion: orden.fecha_finalizacion ?? '',
    hora_termino: recortarHora(orden.hora_termino),
    fotos_urls: [...orden.fotos_urls],
    firma_cliente_url: orden.firma_cliente_url ?? '',
    equipos_inventario: orden.equipos_inventario.map((equipo) => ({ ...equipo })),
  };
}

function recortarHora(value: string | null): string {
  if (!value) return '';
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

export function validarForm(state: EditarOrdenFormState): EditarOrdenErrors {
  const errors: EditarOrdenErrors = {};

  if (state.status === 'pausado' && !state.motivo_pausa.trim()) {
    // Misma regla que `OrdenSerializer.validate`.
    errors.motivo_pausa = 'Indique por qué se pausó la orden.';
  }
  if (state.motivo_pausa.length > MOTIVO_PAUSA_MAX) {
    errors.motivo_pausa = `Máximo ${MOTIVO_PAUSA_MAX} caracteres.`;
  }

  const comentarioLen = state.comentario_tecnico.trim().length;
  if (comentarioLen === 0) {
    errors.comentario_tecnico = `El comentario técnico es obligatorio (mínimo ${COMENTARIO_TECNICO_MIN} caracteres).`;
  } else if (comentarioLen < COMENTARIO_TECNICO_MIN) {
    errors.comentario_tecnico = `Mínimo ${COMENTARIO_TECNICO_MIN} caracteres (lleva ${comentarioLen}).`;
  } else if (state.comentario_tecnico.length > COMENTARIO_TECNICO_MAX) {
    errors.comentario_tecnico = `Máximo ${COMENTARIO_TECNICO_MAX} caracteres.`;
  }
  for (const campo of ['fecha_inicio', 'fecha_finalizacion'] as const) {
    const value = state[campo].trim();
    if (value && !esFechaValida(value)) errors[campo] = 'Use el formato AAAA-MM-DD.';
  }
  for (const campo of ['hora_inicio', 'hora_termino'] as const) {
    const value = state[campo].trim();
    if (value && !esHoraValida(value)) errors[campo] = 'Use el formato HH:MM (24 h).';
  }

  return errors;
}

export function hayErrores(errors: EditarOrdenErrors): boolean {
  return Object.keys(errors).length > 0;
}

function mismasUrls(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((url, i) => url === b[i]);
}

function equiposParaEscritura(equipos: EquipoInventarioItem[]) {
  return equipos.map((equipo) => ({
    lineaId: equipo.lineaId,
    inventarioItemId: equipo.inventarioItemId,
    nombre: equipo.nombre,
    marca: equipo.marca,
    modelo: equipo.modelo,
    imagenUrl: equipo.imagenUrl,
    cantidad: equipo.cantidad,
    equipoEntregado: equipo.equipoEntregado,
    estadoInstalacion: equipo.estadoInstalacion,
  }));
}

function mismosEquipos(a: EquipoInventarioItem[], b: EquipoInventarioItem[]): boolean {
  return JSON.stringify(equiposParaEscritura(a)) === JSON.stringify(equiposParaEscritura(b));
}

/**
 * Construye el PATCH **solo** con lo que cambió y solo con campos que el
 * backend permite al técnico (`LIMITED_ORDEN_EDIT_FIELDS`). Mandar el objeto
 * completo arriesga pisar datos que el listado no trae.
 */
export function construirPatch(original: Orden, state: EditarOrdenFormState): OrdenFieldPatch {
  const base = formStateFromOrden(original);
  const patch: OrdenFieldPatch = {};

  if (state.status !== base.status) patch.status = state.status;
  if (state.motivo_pausa.trim() !== base.motivo_pausa.trim()) {
    patch.motivo_pausa = state.motivo_pausa.trim();
  }
  // El backend exige motivo cuando el status queda en pausado, aunque el texto no cambie.
  if (state.status === 'pausado' && patch.motivo_pausa === undefined) {
    patch.motivo_pausa = state.motivo_pausa.trim();
  }
  if (state.comentario_tecnico.trim() !== base.comentario_tecnico.trim()) {
    patch.comentario_tecnico = state.comentario_tecnico.trim();
  }

  for (const campo of ['fecha_inicio', 'fecha_finalizacion', 'hora_inicio', 'hora_termino'] as const) {
    const value = state[campo].trim();
    if (value === base[campo].trim()) continue;
    patch[campo] = value === '' ? null : value;
  }

  if (!mismasUrls(state.fotos_urls, base.fotos_urls)) {
    patch.fotos_urls = [...state.fotos_urls];
  }

  const firma = state.firma_cliente_url.trim();
  const firmaBase = base.firma_cliente_url.trim();
  if (firma !== firmaBase) {
    // "" limpia la firma en el backend; null se ignora (no tocar).
    patch.firma_cliente_url = firma;
  }

  if (!mismosEquipos(state.equipos_inventario, base.equipos_inventario)) {
    patch.equipos_inventario = equiposParaEscritura(state.equipos_inventario);
  }

  return patch;
}

export function tieneCambios(patch: OrdenFieldPatch): boolean {
  return Object.keys(patch).length > 0;
}
