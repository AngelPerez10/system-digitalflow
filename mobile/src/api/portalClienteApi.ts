import type { Orden, OrdenCalificacion, OrdenListItem } from '@/types/orden';
import { apiClient } from './client';
import { parseCalificacion, parseOrden, parseOrdenList } from './parsers';

/**
 * Portal cliente (`backend/apps/clientes/portal_views.py`). Superficie aparte
 * del módulo `ordenes` del ERP: **solo lectura**, filtrada por el `cliente_id`
 * de la cuenta. Los parsers de órdenes son tolerantes, así que el subconjunto
 * de campos del portal se lee con `parseOrdenList` / `parseOrden`.
 */

export interface CambiarContrasenaPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export async function cambiarContrasenaCliente(
  payload: CambiarContrasenaPayload,
): Promise<string> {
  const raw = await apiClient.request<{ detail?: unknown }>(
    '/portal-cliente/cambiar-contrasena/',
    { method: 'POST', body: payload },
  );
  return typeof raw?.detail === 'string' ? raw.detail : 'Contraseña actualizada.';
}

export interface ListOrdenesClienteParams {
  /** `YYYY-MM`; sin él, el portal devuelve todas las órdenes del cliente. */
  mes?: string;
  signal?: AbortSignal;
}

export async function listOrdenesCliente({
  mes,
  signal,
}: ListOrdenesClienteParams = {}): Promise<OrdenListItem[]> {
  const raw = await apiClient.request<unknown>('/portal-cliente/ordenes/', {
    query: { mes },
    signal,
  });
  return parseOrdenList(raw);
}

export async function getOrdenCliente(id: number, signal?: AbortSignal): Promise<Orden> {
  return parseOrden(await apiClient.request<unknown>(`/portal-cliente/ordenes/${id}/`, { signal }));
}

/**
 * Califica al técnico de una orden propia. Única escritura del portal: el
 * servidor exige que la orden esté resuelta y que no tenga calificación previa.
 */
export async function calificarOrdenCliente(
  id: number,
  estrellas: number,
  comentario: string,
): Promise<OrdenCalificacion> {
  const raw = await apiClient.request<unknown>(`/portal-cliente/ordenes/${id}/calificar/`, {
    method: 'POST',
    body: { estrellas, comentario: comentario.trim() },
  });
  const calificacion = parseCalificacion(raw);
  if (!calificacion) throw new Error('El servidor no devolvió la calificación.');
  return calificacion;
}
