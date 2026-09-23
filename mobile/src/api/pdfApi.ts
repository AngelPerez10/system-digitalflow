import { apiClient } from './client';

/**
 * PDF de un documento (orden o proyecto). `base` es la ruta del documento
 * sin slash final, p. ej. `/ordenes/12` o `/proyectos/7`; el backend expone
 * las mismas tres acciones en ambos.
 */

export interface EnlacePdf {
  url: string;
  filename: string;
}

/**
 * Enlace firmado y temporal (7 días) al PDF. Sirve para abrirlo en el
 * navegador del teléfono o compartirlo por WhatsApp sin sesión.
 */
export async function obtenerEnlacePdf(base: string): Promise<EnlacePdf> {
  const raw = await apiClient.request<{ url?: unknown; filename?: unknown }>(`${base}/pdf-enlace/`, {
    method: 'POST',
  });
  const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  if (!/^https?:\/\//i.test(url)) throw new Error('El servidor no devolvió el enlace del PDF.');
  return { url, filename: typeof raw?.filename === 'string' ? raw.filename : 'reporte.pdf' };
}

/** Correo precargable para enviar el PDF (el del cliente o su contacto principal). */
export async function correoSugerido(base: string, signal?: AbortSignal): Promise<string> {
  const raw = await apiClient.request<{ correo?: unknown }>(`${base}/correo-sugerido/`, { signal });
  return typeof raw?.correo === 'string' ? raw.correo.trim() : '';
}

/**
 * El servidor genera el PDF y lo manda adjunto desde la cuenta de correo del
 * usuario. Generar el PDF tarda: el timeout es más largo que el normal.
 */
export async function enviarPdfPorCorreo(base: string, correo: string): Promise<string> {
  const raw = await apiClient.request<{ detail?: unknown }>(`${base}/enviar-pdf/`, {
    method: 'POST',
    body: { correo },
    timeoutMs: 75000,
  });
  return typeof raw?.detail === 'string' ? raw.detail : `PDF enviado a ${correo}.`;
}
