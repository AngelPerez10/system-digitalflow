import type { Reporte, ReportePayload } from '@/types/reporte';
import { apiClient } from './client';
import { asRecord } from './parsers';
import { parseReporte, parseReporteList } from './reporteParsers';

const BASE = '/reportes-mantenimiento';

/** Todos los reportes visibles (el servidor ya recorta a «los míos» con `own_only`). */
export async function listReportes(signal?: AbortSignal): Promise<Reporte[]> {
  return parseReporteList(await apiClient.request<unknown>(`${BASE}/`, { signal }));
}

export async function getReporte(id: number, signal?: AbortSignal): Promise<Reporte> {
  return parseReporte(await apiClient.request<unknown>(`${BASE}/${id}/`, { signal }));
}

export async function crearReporte(payload: ReportePayload): Promise<Reporte> {
  return parseReporte(await apiClient.request<unknown>(`${BASE}/`, { method: 'POST', body: payload }));
}

export async function actualizarReporte(id: number, payload: ReportePayload): Promise<Reporte> {
  return parseReporte(await apiClient.request<unknown>(`${BASE}/${id}/`, { method: 'PATCH', body: payload }));
}

export async function eliminarReporte(id: number): Promise<void> {
  await apiClient.request<unknown>(`${BASE}/${id}/`, { method: 'DELETE' });
}

/** Proyectos que ya tienen reporte (un proyecto admite uno solo): id de proyecto → folio del reporte. */
export async function proyectosConReporte(
  excluirReporteId: number | null,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const raw = await apiClient.request<unknown>(`${BASE}/proyectos-ocupados/`, {
    query: excluirReporteId ? { exclude_reporte_id: String(excluirReporteId) } : undefined,
    signal,
  });
  const porId = asRecord(asRecord(raw).by_id);
  const salida: Record<string, string> = {};
  for (const [id, valor] of Object.entries(porId)) {
    salida[id] = String(asRecord(valor).folio ?? '');
  }
  return salida;
}

/** Sube una foto ya comprimida (data URL) a la carpeta de reportes y regresa su URL https. */
export async function subirFotoReporte(dataUrl: string): Promise<string> {
  const raw = await apiClient.request<{ url?: unknown }>(`${BASE}/upload-image/`, {
    method: 'POST',
    body: { data_url: dataUrl },
  });
  const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  if (!url) throw new Error('El servidor no devolvió la URL de la foto.');
  return url;
}
