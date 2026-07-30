export type InstalacionSubtipo = "" | "gps";

export type InstalacionFormValue = {
  tipo_vehiculo: string;
  placas: string;
  tipo_gps: string;
  tipo_chip: string;
  telefono: string;
  tipo_plataforma: string;
  tipo_corte: string;
  ubicacion_corte: string;
  color_cable_cortado: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  imei: string;
  icc: string;
  boton_panico: string;
  ubicacion_boton_panico: string;
  microfono: string;
  ubicacion_microfono: string;
  temperatura: string;
  humedad: string;
  contacto_magnetico: string;
  identificacion_conductores: string;
  comentario: string;
};

export const EMPTY_INSTALACION_FORM: InstalacionFormValue = {
  tipo_vehiculo: "",
  placas: "",
  tipo_gps: "",
  tipo_chip: "",
  telefono: "",
  tipo_plataforma: "",
  tipo_corte: "",
  ubicacion_corte: "",
  color_cable_cortado: "",
  marca: "",
  modelo: "",
  anio: "",
  color: "",
  imei: "",
  icc: "",
  boton_panico: "",
  ubicacion_boton_panico: "",
  microfono: "",
  ubicacion_microfono: "",
  temperatura: "",
  humedad: "",
  contacto_magnetico: "",
  identificacion_conductores: "",
  comentario: "",
};

export type ProyectoInstalacionRow = {
  id: number;
  idx: number | null;
  proyecto: number;
  proyecto_idx: number | null;
  proyecto_folio: string;
  cliente_nombre: string;
  payload: Record<string, unknown>;
  dibujo_url: string;
  creado_por: number | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
};

export type ProyectoInstalacionApiError = {
  message: string;
  status: number;
  body?: unknown;
};

export function displayInstalacionFolio(idx: number | null | undefined): string {
  if (idx == null || Number(idx) <= 0) return "—";
  return `INS-${Number(idx)}`;
}

export function payloadFromApi(raw: unknown): InstalacionFormValue {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next = { ...EMPTY_INSTALACION_FORM };
  for (const key of Object.keys(EMPTY_INSTALACION_FORM) as (keyof InstalacionFormValue)[]) {
    const v = src[key];
    if (typeof v === "string") next[key] = v;
  }
  return next;
}

export function subtipoFromPayload(raw: unknown): InstalacionSubtipo {
  if (!raw || typeof raw !== "object") return "";
  const src = raw as Record<string, unknown>;
  const t = String(src.tipo_instalacion || "").trim().toLowerCase();
  if (t === "gps") return "gps";
  if (src.tipo_gps) return "gps";
  return "";
}

export function buildInstalacionPayload(
  form: InstalacionFormValue,
  subtipo: InstalacionSubtipo
): Record<string, unknown> {
  return { ...form, tipo_instalacion: subtipo };
}

export function payloadPlacas(payload: Record<string, unknown> | null | undefined): string {
  const v = payload?.placas;
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

export function payloadImei(payload: Record<string, unknown> | null | undefined): string {
  const v = payload?.imei;
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

export type ProyectoInstalacionDraft = {
  form: InstalacionFormValue;
  subtipo: InstalacionSubtipo;
};

export function emptyInstalacionDraft(): ProyectoInstalacionDraft {
  return { form: { ...EMPTY_INSTALACION_FORM }, subtipo: "" };
}
