import type { Orden, OrdenFieldPatch, OrdenListItem } from '@/types/orden';
import { apiClient } from './client';
import { parseOrden, parseOrdenList } from './parsers';

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
