import { fetchApi } from "@/config/api";
import { computePolizaEstado, TIPO_CCTV, TIPO_LABEL } from "./polizaDemoData";
import { parseIntervaloMeses, POLIZA_INTERVALO_DEFAULT, inferIntervaloMeses } from "../shared/polizaVisitas";
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
  intervalo_meses: number | null;
  fecha1: string | null;
  fecha2: string | null;
  fecha3: string | null;
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

function isoDate(value: string | null | undefined): string {
  return String(value || "").slice(0, 10);
}

function asTipo(value: string | null | undefined): PolizaTipo {
  return value === "cctv" ? TIPO_CCTV : TIPO_CCTV;
}

export function mapApiPoliza(row: ApiPoliza): PolizaRow {
  const tipo = asTipo(row.tipo);
  const fecha1 = isoDate(row.fecha1);
  const fecha2 = isoDate(row.fecha2);
  const intervaloMeses =
    row.intervalo_meses === 2 || row.intervalo_meses === 4
      ? parseIntervaloMeses(row.intervalo_meses)
      : fecha1 && fecha2
        ? inferIntervaloMeses(fecha1, fecha2)
        : POLIZA_INTERVALO_DEFAULT;
  const values: PolizaAltaValues = {
    clienteId: row.cliente_id != null ? String(row.cliente_id) : "",
    tipo,
    servicioTipo: row.servicio_tipo || "",
    equiposAtendidos: row.equipos_atendidos || "",
    cotizacionId: row.cotizacion_id != null ? String(row.cotizacion_id) : "",
    intervaloMeses,
    fecha1,
    fecha2,
    fecha3: isoDate(row.fecha3),
  };
  return {
    id: row.id,
    idx: row.idx,
    folio: row.folio,
    clienteId: values.clienteId,
    cliente: row.cliente_nombre || "Cliente",
    tipo,
    tipoLabel: row.tipo_label || TIPO_LABEL[tipo],
    servicioTipo: values.servicioTipo,
    equiposAtendidos: values.equiposAtendidos,
    cotizacionId: values.cotizacionId,
    cotizacionFolio: row.cotizacion_folio || "—",
    intervaloMeses: values.intervaloMeses,
    fecha1: values.fecha1,
    fecha2: values.fecha2,
    fecha3: values.fecha3,
    estado: computePolizaEstado(values),
  };
}

function unwrapList(data: unknown): ApiPoliza[] {
  if (Array.isArray(data)) return data as ApiPoliza[];
  const rec = asRecord(data);
  return Array.isArray(rec.results) ? (rec.results as ApiPoliza[]) : [];
}

export function payloadFromValues(values: PolizaAltaValues): Record<string, unknown> {
  return {
    cliente_id: Number(values.clienteId),
    tipo: values.tipo || TIPO_CCTV,
    servicio_tipo: values.servicioTipo,
    equipos_atendidos: values.equiposAtendidos,
    cotizacion_id: Number(values.cotizacionId),
    intervalo_meses: values.intervaloMeses,
    fecha1: values.fecha1,
    fecha2: values.fecha2,
    fecha3: values.fecha3,
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
