export const ORDEN_BASE_MAX_FOTOS = 5;
export const FOTOS_EXTRA_OPTIONS = [0, 2, 3, 4, 5] as const;
export type FotosExtraMax = (typeof FOTOS_EXTRA_OPTIONS)[number];

/** Mínimo de caracteres en el comentario del técnico al guardar. */
export const COMENTARIO_TECNICO_MIN_LENGTH = 150;

export type OrdenStatusAdministrativo = "pendiente" | "en_revision" | "enviado" | "cerrado";

export type OrdenCotizacionAdjunta = {
  id: string;
  origen: "digitalflow" | "sicar";
  folio: string;
  cliente: string;
  fecha: string;
  contacto?: string;
};

export type OrdenEquipoEstadoInstalacion = "no_instalado" | "instalado";

export type OrdenEquipoInventarioLinea = {
  lineaId: string;
  inventarioItemId: number;
  codigoBarras: string;
  nombre: string;
  marca: string;
  modelo: string;
  imagenUrl: string;
  cantidad: number;
  equipoEntregado: boolean;
  estadoInstalacion: OrdenEquipoEstadoInstalacion;
  movimientoSalidaId: number | null;
};

export interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  activo?: boolean;
}

export interface Orden {
  id: number;
  idx: number;
  folio?: string | null;
  cliente_id: number | null;
  cliente: string;
  direccion: string;
  telefono_cliente: string;
  problematica: string;
  servicios_realizados: string[];
  status: "pendiente" | "resuelto";
  /** Último cambio de status del técnico (ISO); null = sin resalte. */
  status_changed_at?: string | null;
  comentario_tecnico: string;
  /** Seguimiento de oficina (solo admins en UI). */
  status_administrativo?: "pendiente" | "en_revision" | "enviado" | "cerrado" | string | null;
  fecha_envio?: string | null;
  cotizaciones_adjuntas?: OrdenCotizacionAdjunta[] | null;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  nombre_encargado: string;
  nombre_cliente: string;
  tecnico_asignado?: number | null;
  tecnico_asignado_username?: string;
  tecnico_asignado_full_name?: string;
  creado_por?: number | null;
  creado_por_id?: number;
  quien_instalo?: number | null;
  quien_instalo_username?: string;
  quien_instalo_full_name?: string;
  quien_entrego?: number | null;
  quien_entrego_username?: string;
  quien_entrego_full_name?: string;
  firma_encargado_url: string;
  firma_cliente_url: string;
  fotos_urls: string[];
  fotos_extra_max?: number;
  pdf_url?: string;
  fecha_creacion: string;
  tipo_orden?: "servicio_tecnico" | "levantamiento" | string;
  equipos_inventario?: OrdenEquipoInventarioLinea[];
}

export interface Usuario {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export type OrdenStats = {
  monthTotal: number;
  monthCompleted: number;
  monthPending: number;
  estrella: string;
  estrellaServices: number;
};

export function normalizeFotosExtraFromOrden(
  orden: { fotos_extra_max?: unknown; permitir_fotos_extra?: boolean } | null | undefined
): FotosExtraMax {
  if (!orden) return 0;
  const v = Number(orden.fotos_extra_max);
  if (FOTOS_EXTRA_OPTIONS.includes(v as FotosExtraMax)) return v as FotosExtraMax;
  if (orden.permitir_fotos_extra === true) return 2;
  return 0;
}

export function normalizeStatusAdministrativo(raw: unknown): OrdenStatusAdministrativo {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "en_revision" || v === "enviado" || v === "cerrado") return v;
  return "pendiente";
}

export function normalizeCotizacionesAdjuntas(raw: unknown): OrdenCotizacionAdjunta[] {
  if (!Array.isArray(raw)) return [];
  const out: OrdenCotizacionAdjunta[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const origenRaw = String(row.origen || "").trim().toLowerCase();
    const origen = origenRaw === "sicar" ? "sicar" : origenRaw === "digitalflow" ? "digitalflow" : null;
    if (!origen) continue;
    const id = String(row.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const contacto = String(row.contacto || "").trim();
    out.push({
      id,
      origen,
      folio: String(row.folio || "").trim() || "—",
      cliente: String(row.cliente || "").trim() || "—",
      fecha: String(row.fecha || "").trim().slice(0, 10),
      ...(contacto ? { contacto } : {}),
    });
  }
  return out;
}

export const getCurrentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type OrdenStatsInput = {
  fecha_inicio?: string;
  fecha_creacion?: string;
  status?: string;
  cliente?: string;
  nombre_cliente?: string;
  cliente_id?: number | null;
  servicios_realizados?: string[];
};

export function computeOrdenStats(
  ordenes: OrdenStatsInput[] | null | undefined,
  statsMonthKey: string,
  options?: { includeEstrella?: boolean }
): OrdenStats {
  const list = Array.isArray(ordenes) ? ordenes : [];
  const monthList = list.filter((o) => {
    const base = (o.fecha_inicio || o.fecha_creacion || "").toString();
    return base.startsWith(statsMonthKey);
  });

  const completedMonth = monthList.filter((o) => (o.status || "").toString().toLowerCase() === "resuelto");
  const pendingMonth = monthList.filter((o) => (o.status || "").toString().toLowerCase() === "pendiente");

  let estrella = "—";
  let estrellaServices = 0;
  if (options?.includeEstrella !== false) {
    const byCliente: Record<string, { cliente: string; services: number }> = {};
    for (const o of monthList) {
      const name = (o.cliente || o.nombre_cliente || "—").toString().trim() || "—";
      const key = (o.cliente_id != null ? String(o.cliente_id) : name) || name;
      const services = Array.isArray(o.servicios_realizados) ? o.servicios_realizados.length : 0;
      if (!byCliente[key]) byCliente[key] = { cliente: name, services: 0 };
      byCliente[key].services += services;
    }

    let best: { cliente: string; services: number } | null = null;
    for (const k of Object.keys(byCliente)) {
      const cur = byCliente[k];
      if (!best || cur.services > best.services) best = cur;
    }
    estrella = best?.cliente || "—";
    estrellaServices = best?.services || 0;
  }

  return {
    monthTotal: monthList.length,
    monthCompleted: completedMonth.length,
    monthPending: pendingMonth.length,
    estrella,
    estrellaServices,
  };
}
