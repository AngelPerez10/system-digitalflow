import { fetchApi } from "@/config/api";
import {
  createEmptyProyectoDraft,
  displayCotizacionFolio,
  displayProyectoFolio,
  flattenPresupuesto,
  formatCotizacionesFolioLabel,
  normalizeDraftCotizaciones,
  normalizeNotasPorDia,
  normalizeTiposTrabajo,
  tiposTrabajoFromLegacy,
} from "./proyectoFormUtils";
import type {
  CotizacionOrigen,
  CotizacionResumen,
  ProyectoCotizacionBloque,
  ProyectoDraft,
  ProyectoEquipoLinea,
  ProyectoEstado,
  ProyectoNotaDia,
  ProyectoPersonaAsignada,
  ProyectoRow,
  ProyectoTipoTrabajo,
} from "./proyectoTypes";

export type ApiProyecto = {
  id: number;
  idx: number | null;
  folio: string | null;
  cliente_id: number | null;
  cliente_nombre: string;
  status: ProyectoEstado;
  motivo_pausa: string;
  tipo_trabajo_id: number | null;
  tipo_trabajo_nombre: string;
  tipos_trabajo?: ProyectoTipoTrabajo[] | null;
  fecha_autorizacion: string | null;
  quien_autorizo?: string;
  fechas_inicio: string[];
  hora_llegada: string;
  hora_salida: string;
  tecnico_id: number | null;
  tecnico_nombre: string;
  auxiliar_id: number | null;
  auxiliar_nombre: string;
  vehiculo_asignado: string;
  herramientas_generales: string;
  cotizaciones: ProyectoCotizacionBloque[];
  cotizacion_adicional: CotizacionResumen | null;
  equipos: ProyectoEquipoLinea[];
  notas_por_dia: ProyectoNotaDia[];
  porcentaje_avance: number;
  incidencias: string;
  requerimientos_adicionales: string;
  requiere_presupuesto_adicional: boolean;
  evidencias_urls: string[];
  firma_cliente_url: string;
  firma_tecnico_url: string;
  equipos_total?: number;
  equipos_entregados?: number;
  equipos_instalados?: number;
  cotizaciones_count?: number;
  cotizacion_folio?: string;
  cotizacion_origen?: CotizacionOrigen | string;
  created_at?: string;
  updated_at?: string;
};

export type ProyectoApiError = {
  status: number;
  message: string;
  body: unknown;
};

type ApiListPayload = unknown[] | { results?: unknown[] };

const asRecord = (value: unknown): Record<string, unknown> =>
  (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

const listFromPayload = (payload: ApiListPayload): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
};

function parseClientePk(clienteId: string): number | null {
  const raw = String(clienteId || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function personaFromApi(id: number | null | undefined, nombre: string | null | undefined): ProyectoPersonaAsignada {
  return {
    id: typeof id === "number" && Number.isFinite(id) ? id : null,
    nombre: String(nombre || "").trim(),
  };
}

function draftFromApi(api: ApiProyecto): ProyectoDraft {
  const base = createEmptyProyectoDraft();
  const cotizaciones = normalizeDraftCotizaciones({
    ...base,
    cotizaciones: Array.isArray(api.cotizaciones) ? api.cotizaciones : [],
    cotizacion: null,
    presupuesto: [],
  });
  const primary = cotizaciones[0]?.cotizacion ?? null;
  const tiposTrabajo = (() => {
    const fromApi = normalizeTiposTrabajo(api.tipos_trabajo);
    if (fromApi.length) return fromApi;
    return tiposTrabajoFromLegacy(api.tipo_trabajo_id, api.tipo_trabajo_nombre);
  })();
  return {
    ...base,
    cliente: String(api.cliente_nombre || "").trim(),
    clienteId: api.cliente_id != null ? String(api.cliente_id) : "",
    cotizaciones,
    cotizacion: primary,
    presupuesto: flattenPresupuesto(cotizaciones),
    equipos: Array.isArray(api.equipos) ? api.equipos : [],
    tiposTrabajo,
    tipoTrabajoId: tiposTrabajo[0]?.id ?? null,
    tipoTrabajoNombre: tiposTrabajo[0]?.nombre ?? "",
    status: (api.status as ProyectoEstado) || "en_proceso",
    motivoPausa: String(api.motivo_pausa || ""),
    fechaAutorizacion: api.fecha_autorizacion ? String(api.fecha_autorizacion) : "",
    quienAutorizo: String(api.quien_autorizo || ""),
    fechasInicio: Array.isArray(api.fechas_inicio) && api.fechas_inicio.length
      ? api.fechas_inicio.map((d) => String(d || ""))
      : [""],
    horaLlegada: String(api.hora_llegada || ""),
    horaSalida: String(api.hora_salida || ""),
    tecnico: personaFromApi(api.tecnico_id, api.tecnico_nombre),
    auxiliar: personaFromApi(api.auxiliar_id, api.auxiliar_nombre),
    vehiculoAsignado: String(api.vehiculo_asignado || ""),
    herramientasGenerales: String(api.herramientas_generales || ""),
    notasPorDia: normalizeNotasPorDia(api.notas_por_dia),
    porcentajeAvance: Number(api.porcentaje_avance) || 0,
    incidencias: String(api.incidencias || ""),
    requerimientosAdicionales: String(api.requerimientos_adicionales || ""),
    requierePresupuestoAdicional: Boolean(api.requiere_presupuesto_adicional),
    cotizacionAdicional: api.cotizacion_adicional ?? null,
    evidenciasUrls: Array.isArray(api.evidencias_urls) ? api.evidencias_urls : [],
    firmaClienteUrl: String(api.firma_cliente_url || ""),
    firmaTecnicoUrl: String(api.firma_tecnico_url || ""),
  };
}

export function proyectoRowFromApi(api: ApiProyecto): ProyectoRow {
  const draft = draftFromApi(api);
  const cotizaciones = draft.cotizaciones;
  const equipos = draft.equipos;
  const entregados =
    typeof api.equipos_entregados === "number"
      ? api.equipos_entregados
      : equipos.filter((e) => e.equipoEntregado).length;
  const instalados =
    typeof api.equipos_instalados === "number"
      ? api.equipos_instalados
      : equipos.filter((e) => e.estadoInstalacion === "instalado").length;
  const total =
    typeof api.equipos_total === "number" ? api.equipos_total : equipos.length;
  const origenRaw = String(api.cotizacion_origen || cotizaciones[0]?.cotizacion?.origen || "digitalflow");
  const origen: CotizacionOrigen = origenRaw === "sicar" ? "sicar" : "digitalflow";
  const fecha =
    (api.created_at && String(api.created_at).slice(0, 10)) ||
    draft.fechaAutorizacion ||
    new Date().toISOString().slice(0, 10);

  return {
    id: String(api.id),
    folio: displayProyectoFolio(api.folio || api.idx),
    cliente: draft.cliente.trim() || "Sin cliente",
    cotizacionFolio:
      api.cotizacion_folio != null && String(api.cotizacion_folio).trim()
        ? String(api.cotizacion_folio)
        : formatCotizacionesFolioLabel(cotizaciones),
    cotizacionOrigen: origen,
    cotizacionesCount:
      typeof api.cotizaciones_count === "number" ? api.cotizaciones_count : cotizaciones.length,
    equiposTotal: total,
    equiposEntregados: entregados,
    equiposInstalados: instalados,
    estado: draft.status,
    fecha,
    draft,
  };
}

export function draftToApiPayload(
  draft: ProyectoDraft,
  options?: { omitTechnicianLockedFields?: boolean }
): Record<string, unknown> {
  const cotizaciones = normalizeDraftCotizaciones(draft);
  const tiposTrabajo = normalizeTiposTrabajo(
    draft.tiposTrabajo?.length
      ? draft.tiposTrabajo
      : tiposTrabajoFromLegacy(draft.tipoTrabajoId, draft.tipoTrabajoNombre)
  );
  const payload: Record<string, unknown> = {
    cliente_id: parseClientePk(draft.clienteId),
    cliente_nombre: draft.cliente.trim(),
    status: draft.status,
    motivo_pausa: draft.status === "pausado" ? draft.motivoPausa.trim() : "",
    quien_autorizo: draft.quienAutorizo.trim(),
    fechas_inicio: draft.fechasInicio?.length ? draft.fechasInicio : [""],
    hora_llegada: draft.horaLlegada || "",
    hora_salida: draft.horaSalida || "",
    tecnico_id: draft.tecnico?.id ?? null,
    tecnico_nombre: draft.tecnico?.nombre?.trim() || "",
    auxiliar_id: draft.auxiliar?.id ?? null,
    auxiliar_nombre: draft.auxiliar?.nombre?.trim() || "",
    vehiculo_asignado: draft.vehiculoAsignado.trim(),
    herramientas_generales: draft.herramientasGenerales.trim(),
    cotizacion_adicional: draft.cotizacionAdicional,
    equipos: draft.equipos,
    notas_por_dia: normalizeNotasPorDia(draft.notasPorDia),
    porcentaje_avance: draft.porcentajeAvance,
    incidencias: draft.incidencias.trim(),
    requerimientos_adicionales: draft.requerimientosAdicionales.trim(),
    requiere_presupuesto_adicional: Boolean(draft.requierePresupuestoAdicional),
    evidencias_urls: draft.evidenciasUrls,
    firma_cliente_url: draft.firmaClienteUrl || "",
    firma_tecnico_url: draft.firmaTecnicoUrl || "",
  };

  // El técnico asignado no puede tocar estos campos; omitirlos evita 400 por ruido
  // de serialización al guardar entrega/instalación/evidencias.
  if (!options?.omitTechnicianLockedFields) {
    payload.tipos_trabajo = tiposTrabajo;
    payload.tipo_trabajo_id = tiposTrabajo[0]?.id ?? null;
    payload.tipo_trabajo_nombre = tiposTrabajo[0]?.nombre?.trim() || "";
    payload.fecha_autorizacion = draft.fechaAutorizacion.trim() || null;
    payload.cotizaciones = cotizaciones;
  }

  return payload;
}

function messageFromErrorBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const rec = body as Record<string, unknown>;
  if (typeof rec.detail === "string" && rec.detail.trim()) return rec.detail;
  if (Array.isArray(rec.status) && rec.status[0]) return String(rec.status[0]);
  if (typeof rec.status === "string" && rec.status.trim()) return rec.status;
  for (const value of Object.values(rec)) {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && value[0]) return String(value[0]);
  }
  return fallback;
}

async function parseApiProyecto(res: Response): Promise<ApiProyecto> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err: ProyectoApiError = {
      status: res.status,
      message: messageFromErrorBody(body, "No se pudo guardar el proyecto."),
      body,
    };
    throw err;
  }
  return body as ApiProyecto;
}

export async function listProyectos(): Promise<ProyectoRow[]> {
  const res = await fetchApi("/api/proyectos/");
  const data = (await res.json().catch(() => null)) as ApiListPayload | null;
  if (!res.ok || !data) {
    const err: ProyectoApiError = {
      status: res.status,
      message: "No se pudo cargar el listado de proyectos.",
      body: data,
    };
    throw err;
  }
  return listFromPayload(data)
    .map((item) => asRecord(item) as unknown as ApiProyecto)
    .filter((item) => typeof item.id === "number")
    .map(proyectoRowFromApi);
}

export async function createProyecto(draft: ProyectoDraft): Promise<ProyectoRow> {
  const res = await fetchApi("/api/proyectos/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draftToApiPayload(draft)),
  });
  const api = await parseApiProyecto(res);
  return proyectoRowFromApi(api);
}

export async function updateProyecto(
  id: string | number,
  draft: ProyectoDraft,
  options?: { omitTechnicianLockedFields?: boolean }
): Promise<ProyectoRow> {
  const res = await fetchApi(`/api/proyectos/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draftToApiPayload(draft, options)),
  });
  const api = await parseApiProyecto(res);
  return proyectoRowFromApi(api);
}

export async function deleteProyecto(id: string | number): Promise<void> {
  const res = await fetchApi(`/api/proyectos/${id}/`, { method: "DELETE" });
  if (res.ok || res.status === 204) return;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const err: ProyectoApiError = {
    status: res.status,
    message: messageFromErrorBody(data, `Error al eliminar proyecto (${res.status})`),
    body: data,
  };
  throw err;
}

/** Helper para tests / UI: muestra folio de cotización normalizado. */
export function formatApiCotizacionFolio(folio: string): string {
  return displayCotizacionFolio(folio);
}
