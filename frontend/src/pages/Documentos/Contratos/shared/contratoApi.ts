import { fetchApi } from "@/config/api";

export type ContratoEstado =
  | "borrador"
  | "enviado"
  | "firmado_cliente"
  | "firmado_prestador"
  | "completado"
  | "cancelado";

export type TipoPersona = "moral" | "fisica";

export type PrestadorDatos = {
  razon_social: string;
  rfc: string;
  representante: string;
  representante_cargo: string;
  correo: string;
  cuenta_bancaria: string;
  clabe: string;
  telefono_soporte: string;
  telefono_emergencias: string;
  jurisdiccion: string;
};

export type EnlaceActivo = {
  expira_at: string;
  correo_destino: string;
  verificado: boolean;
  bloqueado: boolean;
  created_at: string;
};

export type Contrato = {
  id: number;
  idx: number;
  folio: string;
  cliente: number | null;
  cliente_tipo_persona: TipoPersona;
  cliente_razon_social: string;
  cliente_rfc: string;
  cliente_regimen_fiscal: string;
  cliente_domicilio_fiscal: string;
  cliente_representante: string;
  cliente_clave_elector: string;
  cliente_curp: string;
  cliente_correo: string;
  domicilio_instalacion: string;
  plan_mbps: number;
  precio_mensual: string;
  vigencia_meses: number;
  fecha_firma: string | null;
  ciudad_firma: string;
  prestador_datos: PrestadorDatos;
  estado: ContratoEstado;
  estado_display: string;
  documento_sha256: string;
  firmado_prestador_at: string | null;
  firmado_prestador_nombre: string;
  firmado_prestador_por_nombre: string;
  firma_cliente_nombre: string;
  firmado_cliente_at: string | null;
  firmado_cliente_correo: string;
  firma_prestador: string;
  firma_cliente: string;
  tiene_pdf_sellado: boolean;
  pdf_sellado_sha256: string;
  sellado_at: string | null;
  enlace_activo: EnlaceActivo | null;
  creado_por_nombre: string;
  created_at: string;
  updated_at: string;
};

export type ContratoEvento = {
  id: number;
  tipo: string;
  tipo_display: string;
  ip: string | null;
  user_agent: string;
  usuario_nombre: string;
  created_at: string;
};

export type ContratoFormValues = Pick<
  Contrato,
  | "cliente"
  | "cliente_tipo_persona"
  | "cliente_razon_social"
  | "cliente_rfc"
  | "cliente_regimen_fiscal"
  | "cliente_domicilio_fiscal"
  | "cliente_representante"
  | "cliente_clave_elector"
  | "cliente_curp"
  | "cliente_correo"
  | "domicilio_instalacion"
  | "plan_mbps"
  | "precio_mensual"
  | "vigencia_meses"
  | "fecha_firma"
  | "ciudad_firma"
  | "prestador_datos"
>;

export type EnlaceFirmaResult = {
  url: string;
  expira_at: string;
  correo_destino: string;
  correo_enviado: boolean;
  correo_error: string;
  contrato: Contrato;
};

export class ContratoApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const BASE = "/api/v1/contratos/";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Mensaje legible de una respuesta de error DRF (`detail` o el primer error de campo). */
export function messageFromDrf(data: unknown, fallback: string): string {
  const rec = asRecord(data);
  if (typeof rec.detail === "string" && rec.detail.trim()) return rec.detail.trim();
  for (const value of Object.values(rec)) {
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) return value[0].trim();
    if (typeof value === "string" && value.trim()) return value.trim();
    const nested = asRecord(value);
    for (const inner of Object.values(nested)) {
      if (Array.isArray(inner) && typeof inner[0] === "string") return inner[0];
    }
  }
  return fallback;
}

/** Errores por campo (primer mensaje de cada uno). */
export function fieldErrorsFromDrf(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(asRecord(data))) {
    if (key === "detail") continue;
    if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
    else if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const rec = asRecord(data);
  return Array.isArray(rec.results) ? (rec.results as T[]) : [];
}

async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await fetchApi(path, init);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ContratoApiError(messageFromDrf(data, fallback), res.status, fieldErrorsFromDrf(data));
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export async function listContratos(params: { search?: string; estado?: string } = {}): Promise<Contrato[]> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.estado) q.set("estado", params.estado);
  const qs = q.toString();
  const data = await request<unknown>(`${BASE}${qs ? `?${qs}` : ""}`, { method: "GET" }, "No se pudieron cargar los contratos.");
  return unwrapList<Contrato>(data);
}

export const getContrato = (id: number | string) =>
  request<Contrato>(`${BASE}${id}/`, { method: "GET" }, "No se pudo cargar el contrato.");

export const createContrato = (values: ContratoFormValues) =>
  request<Contrato>(BASE, json("POST", values), "No se pudo crear el contrato.");

export const updateContrato = (id: number, values: ContratoFormValues) =>
  request<Contrato>(`${BASE}${id}/`, json("PATCH", values), "No se pudo guardar el contrato.");

export const deleteContrato = (id: number) =>
  request<null>(`${BASE}${id}/`, { method: "DELETE" }, "No se pudo eliminar el contrato.");

export const getPrestadorDefaults = () =>
  request<PrestadorDatos>(`${BASE}defaults-prestador/`, { method: "GET" }, "No se pudieron cargar los datos del prestador.");

export const listEventos = (id: number) =>
  request<ContratoEvento[]>(`${BASE}${id}/eventos/`, { method: "GET" }, "No se pudo cargar la bitácora.");

export const generarEnlaceFirma = (id: number, enviarCorreo: boolean) =>
  request<EnlaceFirmaResult>(
    `${BASE}${id}/enlace-firma/`,
    json("POST", { enviar_correo: enviarCorreo }),
    "No se pudo generar el enlace de firma.",
  );

export const revocarEnlace = (id: number) =>
  request<Contrato>(`${BASE}${id}/revocar-enlace/`, json("POST", {}), "No se pudo revocar el enlace.");

export const cancelarContrato = (id: number) =>
  request<Contrato>(`${BASE}${id}/cancelar/`, json("POST", {}), "No se pudo cancelar el contrato.");

export type FirmanteRegistrado = {
  id: number;
  nombre: string;
  username: string;
  /** URL de Cloudinary de la firma registrada en el perfil. */
  firma_url: string;
  es_yo: boolean;
  /** El usuario actual puede aplicarla (es el firmante o un administrador). */
  puede_aplicar?: boolean;
};

export const listFirmantes = () =>
  request<FirmanteRegistrado[]>(`${BASE}firmantes/`, { method: "GET" }, "No se pudieron cargar las firmas registradas.");

/** Aplica la firma registrada (Cloudinary) de un usuario como firma de EL PRESTADOR. */
export const firmarComoPrestador = (id: number, body: { firmante_id: number; documento_sha256?: string }) =>
  request<Contrato>(`${BASE}${id}/firmar-prestador/`, json("POST", body), "No se pudo registrar la firma.");

/** PDF (o HTML de vista previa si el servidor no tiene motor de PDF). */
export async function fetchContratoDocumento(id: number): Promise<Blob> {
  const res = await fetchApi(`${BASE}${id}/pdf/`, { method: "GET", cache: "no-store" as RequestCache });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ContratoApiError(messageFromDrf(data, "No se pudo generar el documento."), res.status);
  }
  return res.blob();
}
