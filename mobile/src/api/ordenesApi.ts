import type { Orden, OrdenCreatePayload, OrdenFieldPatch, OrdenListItem, TecnicoOpcion } from '@/types/orden';
import { apiClient } from './client';
import { parseOrden, parseOrdenList, parseTecnicoOpciones } from './parsers';

export interface ListOrdenesParams {
  /** `YYYY-MM`; el backend filtra por fecha_inicio (o fecha_creacion si falta). */
  mes?: string;
  signal?: AbortSignal;
}

export async function listOrdenes({ mes, signal }: ListOrdenesParams = {}): Promise<OrdenListItem[]> {
  const raw = await apiClient.request<unknown>('/ordenes/', { query: { mes }, signal });
  return parseOrdenList(raw);
}

/**
 * Detalle completo. Obligatorio antes de editar: el listado hace `defer` de
 * fotos y firmas, y guardar desde la fila del listado las borraría.
 */
export async function getOrden(id: number, signal?: AbortSignal): Promise<Orden> {
  return parseOrden(await apiClient.request<unknown>(`/ordenes/${id}/`, { signal }));
}

/** Campos de campo permitidos en `PATCH`; el servidor vuelve a validar. */
export async function updateOrden(id: number, patch: OrdenFieldPatch): Promise<Orden> {
  return parseOrden(await apiClient.request<unknown>(`/ordenes/${id}/`, { method: 'PATCH', body: patch }));
}

/** Alta de orden; exige permiso `create` en órdenes (lo valida el servidor). */
export async function crearOrden(payload: OrdenCreatePayload): Promise<Orden> {
  return parseOrden(await apiClient.request<unknown>('/ordenes/', { method: 'POST', body: payload }));
}

/** Usuarios a los que se les puede asignar una orden (staff o con acceso a órdenes). */
export async function listTecnicosOpciones(signal?: AbortSignal): Promise<TecnicoOpcion[]> {
  return parseTecnicoOpciones(await apiClient.request<unknown>('/ordenes/tecnico-opciones/', { signal }));
}

/**
 * Órdenes disponibles ("liberar / tomar", estilo Uber).
 * `liberar` suelta la orden al pool; `tomar` la reclama (el primero gana, un
 * segundo intento recibe 409); `listOrdenesPool` trae las disponibles.
 */
export async function liberarOrden(id: number): Promise<Orden> {
  return parseOrden(await apiClient.request<unknown>(`/ordenes/${id}/liberar/`, { method: 'POST' }));
}

export async function tomarOrden(id: number): Promise<Orden> {
  return parseOrden(await apiClient.request<unknown>(`/ordenes/${id}/tomar/`, { method: 'POST' }));
}

export async function listOrdenesPool(signal?: AbortSignal): Promise<OrdenListItem[]> {
  const raw = await apiClient.request<unknown>('/ordenes/pool/', { signal });
  return parseOrdenList(raw);
}

/**
 * Sube una imagen (data URL) a Cloudinary vía el backend.
 * Body: `{ data_url, folder }` — carpetas permitidas en `upload_image`.
 */
export async function uploadOrdenImage(
  dataUrl: string,
  folder: 'ordenes/fotos' | 'ordenes/firmas' = 'ordenes/fotos',
): Promise<string> {
  const raw = await apiClient.request<{ url?: unknown }>('/ordenes/upload-image/', {
    method: 'POST',
    body: { data_url: dataUrl, folder },
  });
  const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  if (!url) throw new Error('El servidor no devolvió la URL de la imagen.');
  return url;
}

