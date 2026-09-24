import type {
  ClienteOpcion,
  ConceptoCatalogo,
  Cotizacion,
  CotizacionListItem,
  CotizacionPayload,
  ServicioOpcion,
} from '@/types/cotizacion';
import { apiClient } from './client';
import {
  parseClientes,
  parseConceptos,
  parseCotizacion,
  parseCotizacionList,
  parseServicios,
} from './cotizacionParsers';

/**
 * Cotizaciones del mes (`YYYY-MM`, por `fecha`). El backend ya recorta a «solo
 * las mías» cuando el permiso lo pide; `page_size` alto trae el mes completo
 * en una sola página.
 */
export async function listCotizaciones(mes: string, signal?: AbortSignal): Promise<CotizacionListItem[]> {
  const raw = await apiClient.request<unknown>('/cotizaciones/', {
    query: { month: mes, page_size: 500 },
    signal,
  });
  return parseCotizacionList(raw);
}

export async function getCotizacion(id: number, signal?: AbortSignal): Promise<Cotizacion> {
  return parseCotizacion(await apiClient.request<unknown>(`/cotizaciones/${id}/`, { signal }));
}

export async function crearCotizacion(payload: CotizacionPayload): Promise<Cotizacion> {
  return parseCotizacion(await apiClient.request<unknown>('/cotizaciones/', { method: 'POST', body: payload }));
}

export async function actualizarCotizacion(id: number, payload: Partial<CotizacionPayload>): Promise<Cotizacion> {
  return parseCotizacion(
    await apiClient.request<unknown>(`/cotizaciones/${id}/`, { method: 'PATCH', body: payload }),
  );
}

export async function eliminarCotizacion(id: number): Promise<void> {
  await apiClient.request<unknown>(`/cotizaciones/${id}/`, { method: 'DELETE' });
}

/** Clientes para elegir en la cotización (búsqueda del servidor, 20 resultados). */
export async function buscarClientes(termino: string, signal?: AbortSignal): Promise<ClienteOpcion[]> {
  const raw = await apiClient.request<unknown>('/clientes/', {
    query: { search: termino.trim(), page_size: 20 },
    signal,
  });
  return parseClientes(raw);
}

export async function listServicios(signal?: AbortSignal): Promise<ServicioOpcion[]> {
  const raw = await apiClient.request<unknown>('/servicios/', {
    query: { page_size: 500, ordering: 'idx' },
    signal,
  });
  return parseServicios(raw);
}

export async function listConceptosCatalogo(signal?: AbortSignal): Promise<ConceptoCatalogo[]> {
  const raw = await apiClient.request<unknown>('/conceptos/', { query: { ordering: 'folio' }, signal });
  return parseConceptos(raw);
}
