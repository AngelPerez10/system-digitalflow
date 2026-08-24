import { fetchApi } from "@/config/api";
import type { ReporteApiError, ReporteDraft, ReporteMantenimiento, ReporteSeccion } from "./reporteTypes";
import { REPORTE_MAX_FOTOS_POR_LADO } from "./reporteTypes";

const BASE = "/api/reportes-mantenimiento/";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

function messageFromDrf(data: unknown, fallback: string): string {
  const rec = asRecord(data);
  if (typeof rec.detail === "string" && rec.detail.trim()) return rec.detail.trim();
  for (const value of Object.values(rec)) {
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0].trim();
    }
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

export function isReporteApiError(err: unknown): err is ReporteApiError {
  return Boolean(err && typeof err === "object" && "status" in err && "message" in err);
}

function normalizeUrlList(raw: unknown, legacy: unknown): string[] {
  const urls: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const u = String(item || "").trim();
      if (u && !urls.includes(u)) urls.push(u);
    }
  }
  const single = String(legacy || "").trim();
  if (single && !urls.includes(single)) urls.unshift(single);
  return urls.slice(0, REPORTE_MAX_FOTOS_POR_LADO);
}

function normalizeSecciones(raw: unknown): ReporteSeccion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = asRecord(item);
    return {
      id: String(row.id || `sec-${index + 1}`),
      titulo: String(row.titulo || ""),
      fotos_antes: normalizeUrlList(row.fotos_antes, row.foto_antes_url),
      fotos_despues: normalizeUrlList(row.fotos_despues, row.foto_despues_url),
    };
  });
}

function mapReporte(raw: unknown): ReporteMantenimiento {
  const row = asRecord(raw);
  const ordenId = row.orden_id == null ? null : Number(row.orden_id);
  return {
    id: Number(row.id) || 0,
    idx: Number(row.idx) || 0,
    folio: String(row.folio || ""),
    orden_id: Number.isFinite(ordenId) && (ordenId as number) > 0 ? (ordenId as number) : null,
    orden_folio: String(row.orden_folio || ""),
    orden_cliente: String(row.orden_cliente || ""),
    fecha_servicio: String(row.fecha_servicio || "").slice(0, 10),
    tecnico_nombre: String(row.tecnico_nombre || ""),
    foto_orden_url: String(row.foto_orden_url || ""),
    secciones: normalizeSecciones(row.secciones),
    creado_por: row.creado_por == null ? null : Number(row.creado_por),
    creado_por_username:
      typeof row.creado_por_username === "string" ? row.creado_por_username : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const rec = asRecord(data);
  return Array.isArray(rec.results) ? rec.results : [];
}

function payloadFromDraft(draft: ReporteDraft): Record<string, unknown> {
  return {
    orden_id: Number(draft.orden_id),
    fecha_servicio: draft.fecha_servicio,
    tecnico_nombre: draft.tecnico_nombre.trim(),
    foto_orden_url: draft.foto_orden_url.trim(),
    secciones: draft.secciones.map((s) => ({
      id: s.id,
      titulo: s.titulo.trim(),
      fotos_antes: s.fotos_antes.map((u) => u.trim()).filter(Boolean),
      fotos_despues: s.fotos_despues.map((u) => u.trim()).filter(Boolean),
    })),
  };
}

export async function listReportes(): Promise<ReporteMantenimiento[]> {
  const res = await fetchApi(BASE, { cache: "no-store" as RequestCache });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo cargar el listado.") };
  }
  return unwrapList(data).map(mapReporte);
}

export async function getReporte(id: number): Promise<ReporteMantenimiento> {
  const res = await fetchApi(`${BASE}${id}/`, { cache: "no-store" as RequestCache });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo cargar el reporte.") };
  }
  return mapReporte(data);
}

export async function createReporte(draft: ReporteDraft): Promise<ReporteMantenimiento> {
  const res = await fetchApi(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadFromDraft(draft)),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo guardar el reporte.") };
  }
  return mapReporte(data);
}

export async function updateReporte(id: number, draft: ReporteDraft): Promise<ReporteMantenimiento> {
  const res = await fetchApi(`${BASE}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadFromDraft(draft)),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo actualizar el reporte.") };
  }
  return mapReporte(data);
}

export async function deleteReporte(id: number): Promise<void> {
  const res = await fetchApi(`${BASE}${id}/`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, message: messageFromDrf(data, "No se pudo eliminar el reporte.") };
  }
}

export async function uploadReporteImage(dataUrl: string): Promise<string> {
  const res = await fetchApi(`${BASE}upload-image/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_url: dataUrl }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo subir la imagen.") };
  }
  const url = String(asRecord(data).url || "").trim();
  if (!url) {
    throw { status: 502, message: "El servidor no devolvió la URL de la imagen." };
  }
  return url;
}

/** Borra una imagen de Cloudinary (carpeta reportes-mantenimiento/). */
export async function deleteReporteImage(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  const res = await fetchApi(`${BASE}delete-image/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, message: messageFromDrf(data, "No se pudo eliminar la imagen.") };
  }
}

/** Abre el PDF generado en el servidor (blob + pestaña nueva). */
export async function openReportePdf(id: number): Promise<void> {
  const res = await fetchApi(`${BASE}${id}/pdf/`, { cache: "no-store" as RequestCache });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, message: messageFromDrf(data, "No se pudo generar el PDF.") };
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
