import { fetchApi } from "@/config/api";
import { computePolizaEstado, TIPO_CCTV, TIPO_LABEL } from "./polizaEstado";
import { MAX_VISITAS, normalizarVisitas } from "../shared/polizaVisitas";
import type { PolizaAltaValues, PolizaRow, PolizaTipo } from "./polizaListTypes";

export type ApiPoliza = {
  id: number;
  idx: number;
  folio: string;
  cliente_id: number | null;
  cliente_nombre: string;
  tipo: string;
  tipo_label: string;
  servicio_tipo: string;
  equipos_atendidos: string;
  cotizacion_id: number | null;
  cotizacion_folio: string;
  fecha1: string | null;
  fecha2: string | null;
  fecha3: string | null;
  fecha4?: string | null;
};

export type PolizaApiError = {
  status: number;
  message: string;
};

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

export function isPolizaApiError(err: unknown): err is PolizaApiError {
  return Boolean(err && typeof err === "object" && "status" in err && "message" in err);
}

export function mapApiPoliza(row: ApiPoliza): PolizaRow {
  // Hoy solo existe CCTV; cualquier otro valor se trata igual.
  const tipo: PolizaTipo = TIPO_CCTV;
  const visitas = normalizarVisitas(
    [row.fecha1, row.fecha2, row.fecha3, row.fecha4].map((f) => String(f || "").slice(0, 10)),
  );
  return {
    id: row.id,
    idx: row.idx,
    folio: row.folio,
    clienteId: row.cliente_id != null ? String(row.cliente_id) : "",
    cliente: row.cliente_nombre || "Cliente",
    tipo,
    tipoLabel: row.tipo_label || TIPO_LABEL[tipo],
    servicioTipo: row.servicio_tipo || "",
    equiposAtendidos: row.equipos_atendidos || "",
    cotizacionId: row.cotizacion_id != null ? String(row.cotizacion_id) : "",
    cotizacionFolio: row.cotizacion_folio || "—",
    visitas,
    estado: computePolizaEstado(visitas),
  };
}

function unwrapList(data: unknown): ApiPoliza[] {
  if (Array.isArray(data)) return data as ApiPoliza[];
  const rec = asRecord(data);
  return Array.isArray(rec.results) ? (rec.results as ApiPoliza[]) : [];
}

export function payloadFromValues(values: PolizaAltaValues): Record<string, unknown> {
  const visitas = normalizarVisitas(values.visitas);
  return {
    cliente_id: Number(values.clienteId),
    tipo: values.tipo || TIPO_CCTV,
    servicio_tipo: values.servicioTipo,
    equipos_atendidos: values.equiposAtendidos,
    cotizacion_id: Number(values.cotizacionId),
    // fecha1..fecha4 en orden; las que sobran van en null para limpiar las anteriores.
    ...Object.fromEntries(
      Array.from({ length: MAX_VISITAS }, (_, i) => [`fecha${i + 1}`, visitas[i] || null]),
    ),
  };
}

export async function listPolizas(): Promise<PolizaRow[]> {
  const res = await fetchApi("/api/polizas-mantenimiento/", { cache: "no-store" as RequestCache });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo cargar el listado de pólizas.") };
  }
  return unwrapList(data).map(mapApiPoliza);
}

export async function createPoliza(values: PolizaAltaValues): Promise<PolizaRow> {
  const res = await fetchApi("/api/polizas-mantenimiento/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadFromValues(values)),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo guardar la póliza.") };
  }
  return mapApiPoliza(data as ApiPoliza);
}

export async function updatePoliza(id: number, values: PolizaAltaValues): Promise<PolizaRow> {
  const res = await fetchApi(`/api/polizas-mantenimiento/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadFromValues(values)),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: messageFromDrf(data, "No se pudo actualizar la póliza.") };
  }
  return mapApiPoliza(data as ApiPoliza);
}

export async function deletePoliza(id: number): Promise<void> {
  const res = await fetchApi(`/api/polizas-mantenimiento/${id}/`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, message: messageFromDrf(data, "No se pudo eliminar la póliza.") };
  }
}

export type CotizacionOption = { value: string; label: string };

function formatCotizacionFecha(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export async function listCotizacionesDeCliente(clienteId: string): Promise<CotizacionOption[]> {
  if (!clienteId) return [];
  const params = new URLSearchParams({ cliente_id: clienteId });
  const res = await fetchApi(`/api/polizas-mantenimiento/cotizaciones/?${params.toString()}`, {
    cache: "no-store" as RequestCache,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((item) => {
      const x = asRecord(item);
      const id = Number(x.id || 0);
      if (!id) return null;
      const folio =
        (typeof x.folio === "string" && x.folio.trim()) ||
        (Number(x.idx) > 0 ? `COT-${Number(x.idx)}` : `COT-${id}`);
      const fecha = typeof x.fecha === "string" ? formatCotizacionFecha(x.fecha) : "";
      const status = typeof x.status === "string" && x.status.trim() ? x.status.trim() : "";
      const suffix = [fecha, status].filter(Boolean).join(" · ");
      return {
        value: String(id),
        label: suffix ? `${folio} · ${suffix}` : folio,
      };
    })
    .filter((row): row is CotizacionOption => row != null);
}
