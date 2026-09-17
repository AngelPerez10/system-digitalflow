import type { Proyecto, ProyectoFieldPatch, ProyectoListItem } from '@/types/proyecto';
import { apiClient } from './client';
import { parseProyecto, parseProyectoList } from './parsers';

export async function listProyectos(signal?: AbortSignal): Promise<ProyectoListItem[]> {
  const raw = await apiClient.request<unknown>('/proyectos/', { signal });
  return parseProyectoList(raw);
}

/**
 * Detalle completo. El listado hace `defer` de cotizaciones/equipos/bitácora
 * y notas; guardar desde ahí borraría lo que el listado nunca trajo.
 */
export async function getProyecto(id: number, signal?: AbortSignal): Promise<Proyecto> {
  return parseProyecto(await apiClient.request<unknown>(`/proyectos/${id}/`, { signal }));
}

/**
 * Campos de campo permitidos en `PATCH` — el servidor vuelve a validar y
 * rechaza cualquier intento de tocar `tipos_trabajo`, `fecha_autorizacion` o
 * la lista de `cotizaciones` vinculadas si el actor es el técnico asignado.
 */
export async function updateProyecto(id: number, patch: ProyectoFieldPatch): Promise<Proyecto> {
  return parseProyecto(
    await apiClient.request<unknown>(`/proyectos/${id}/`, { method: 'PATCH', body: patch }),
  );
}

export type ProyectoImageFolder =
  | 'proyectos/evidencias'
  | 'proyectos/bitacora'
  | 'proyectos/firmas';

/**
 * Sube una imagen (data URL) a Cloudinary vía el backend.
 * Body: `{ data_url, folder }` — carpetas permitidas en `upload_image`.
 */
export async function uploadProyectoImage(
  dataUrl: string,
  folder: ProyectoImageFolder = 'proyectos/evidencias',
): Promise<string> {
  const raw = await apiClient.request<{ url?: unknown }>('/proyectos/upload-image/', {
    method: 'POST',
    body: { data_url: dataUrl, folder },
  });
  const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  if (!url) throw new Error('El servidor no devolvió la URL de la imagen.');
  return url;
}
