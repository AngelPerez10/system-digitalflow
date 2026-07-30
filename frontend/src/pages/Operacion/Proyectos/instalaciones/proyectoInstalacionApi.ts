import { fetchApi } from "@/config/api";
import type {
  ProyectoInstalacionApiError,
  ProyectoInstalacionRow,
} from "./proyectoInstalacionTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function makeError(message: string, status: number, body?: unknown): ProyectoInstalacionApiError {
  return { message, status, body };
}

function rowFromApi(raw: unknown): ProyectoInstalacionRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const proyecto = Number(row.proyecto);
  const payload = asRecord(row.payload) ?? {};
  return {
    id,
    idx: row.idx == null ? null : Number(row.idx),
    proyecto: Number.isFinite(proyecto) ? proyecto : 0,
    proyecto_idx: row.proyecto_idx == null ? null : Number(row.proyecto_idx),
    proyecto_folio: String(row.proyecto_folio || "").trim() || "—",
    cliente_nombre: String(row.cliente_nombre || "").trim() || "—",
    payload,
    dibujo_url: String(row.dibujo_url || ""),
    creado_por: row.creado_por == null ? null : Number(row.creado_por),
    fecha_creacion: row.fecha_creacion == null ? null : String(row.fecha_creacion),
    fecha_actualizacion: row.fecha_actualizacion == null ? null : String(row.fecha_actualizacion),
  };
}

async function parseError(res: Response): Promise<ProyectoInstalacionApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  const rec = asRecord(body);
  const detail = rec?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map(String).join(" ")
        : `Error HTTP ${res.status}`;
  return makeError(message, res.status, body);
}

export async function listProyectoInstalaciones(
  proyectoId?: number
): Promise<ProyectoInstalacionRow[]> {
  const qs =
    proyectoId != null && Number.isFinite(proyectoId)
      ? `?proyecto=${encodeURIComponent(String(proyectoId))}`
      : "";
  const res = await fetchApi(`/api/proyecto-instalaciones/${qs}`);
  if (!res.ok) throw await parseError(res);
  const body = await res.json().catch(() => null);
  const rows = Array.isArray(body) ? body : [];
  return rows.map(rowFromApi).filter((r): r is ProyectoInstalacionRow => Boolean(r));
}

export async function createProyectoInstalacion(input: {
  proyecto: number;
  payload: Record<string, unknown>;
  dibujo_url?: string;
}): Promise<ProyectoInstalacionRow> {
  const res = await fetchApi("/api/proyecto-instalaciones/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proyecto: input.proyecto,
      payload: input.payload,
      dibujo_url: input.dibujo_url || "",
    }),
  });
  if (!res.ok) throw await parseError(res);
  const row = rowFromApi(await res.json().catch(() => null));
  if (!row) throw makeError("Respuesta inválida al crear instalación.", res.status);
  return row;
}

export async function updateProyectoInstalacion(
  id: number,
  input: {
    proyecto?: number;
    payload?: Record<string, unknown>;
    dibujo_url?: string;
  }
): Promise<ProyectoInstalacionRow> {
  const res = await fetchApi(`/api/proyecto-instalaciones/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res);
  const row = rowFromApi(await res.json().catch(() => null));
  if (!row) throw makeError("Respuesta inválida al actualizar instalación.", res.status);
  return row;
}

export async function deleteProyectoInstalacion(id: number): Promise<void> {
  const res = await fetchApi(`/api/proyecto-instalaciones/${id}/`, { method: "DELETE" });
  if (!res.ok) throw await parseError(res);
}

export function isProyectoInstalacionApiError(err: unknown): err is ProyectoInstalacionApiError {
  return Boolean(err && typeof err === "object" && "message" in err && "status" in err);
}
