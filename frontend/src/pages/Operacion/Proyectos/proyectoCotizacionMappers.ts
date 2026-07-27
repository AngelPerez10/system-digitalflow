import type { ApiCotizacion, ApiCotizacionItem, CloneCotizacionRow } from "@/pages/Ventas/Cotizacion/cotizacionFormTypes";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import type { CotizacionResumen, PresupuestoLinea } from "./proyectoTypes";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export function digitalFlowCotizacionId(id: number | string): string {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? `df-${Math.trunc(n)}` : `df-${String(id).trim()}`;
}

export function sicarCotizacionId(cotId: number | string): string {
  const n = Number(cotId);
  return Number.isFinite(n) && n > 0 ? `sicar-${Math.trunc(n)}` : `sicar-${String(cotId).trim()}`;
}

/** Extrae el id numérico de API desde el id de resumen (`df-12` / `sicar-89` / crudo). */
export function parseCotizacionApiId(resumenId: string, origen: "digitalflow" | "sicar"): number | null {
  const raw = String(resumenId || "").trim();
  const prefixed = raw.match(/^(?:df|sicar)-(\d+)$/i);
  if (prefixed) {
    const n = Number(prefixed[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (origen === "digitalflow" || origen === "sicar") {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function inferFuenteProducto(
  productoExternoId: string | null | undefined
): PresupuestoLinea["fuenteProducto"] | undefined {
  const id = String(productoExternoId || "").trim();
  if (!id) return undefined;
  if (id.startsWith("manual:")) return "manual";
  if (id.toLowerCase().startsWith("tvc")) return "tvc";
  return "syscom";
}

/** Equipo si hay producto de catálogo; conceptos libres / SERV no cuentan como equipo. */
export function inferEsEquipoDigitalFlow(item: Pick<ApiCotizacionItem, "producto_externo_id" | "unidad">): boolean {
  const productoId = String(item.producto_externo_id || "").trim();
  if (!productoId) return false;
  const unidad = String(item.unidad || "").trim().toUpperCase();
  if (unidad === "SERV" || unidad === "SERVICIO") return false;
  return true;
}

export function inferEsEquipoSicar(item: {
  unidad?: string;
  unidadVenta?: string;
  descripcion?: string;
}): boolean {
  const unidad = String(item.unidadVenta || item.unidad || "").trim().toUpperCase();
  if (unidad === "SERV" || unidad === "SERVICIO") return false;
  const desc = String(item.descripcion || "").toLowerCase();
  if (/\b(servicio|mano de obra|instalaci[oó]n)\b/.test(desc) && !/\b(c[aá]mara|dvr|nvr|gps|router)\b/.test(desc)) {
    return false;
  }
  return true;
}

export function mapDigitalFlowListRowToResumen(row: CloneCotizacionRow): CotizacionResumen {
  return {
    id: digitalFlowCotizacionId(row.id),
    origen: "digitalflow",
    folio: formatDocumentFolio(FOLIO_SERIE.cotizacion, row.idx || row.id),
    cliente: row.cliente || "—",
    fecha: String(row.fecha || "").slice(0, 10),
    contacto: row.contacto && row.contacto !== "—" ? row.contacto : undefined,
  };
}

export function mapDigitalFlowDetailToResumen(detail: ApiCotizacion): CotizacionResumen {
  return {
    id: digitalFlowCotizacionId(detail.id),
    origen: "digitalflow",
    folio: formatDocumentFolio(FOLIO_SERIE.cotizacion, detail.idx || detail.id),
    cliente: String(detail.cliente_nombre || detail.cliente || "—"),
    fecha: String(detail.fecha || "").slice(0, 10),
    contacto: detail.contacto || undefined,
  };
}

export function mapDigitalFlowItemsToPresupuesto(
  items: ApiCotizacionItem[],
  categorias?: { id?: string; nombre?: string }[]
): PresupuestoLinea[] {
  const catById = new Map(
    (categorias || [])
      .filter((c) => c?.id)
      .map((c) => [String(c.id), String(c.nombre || "").trim()])
  );

  return (items || []).map((item, index) => {
    const productoId = String(item.producto_externo_id || "").trim() || undefined;
    const categoriaNombre = item.categoria_id ? catById.get(String(item.categoria_id)) : undefined;
    return {
      id: item.id != null ? String(item.id) : `df-line-${index + 1}`,
      descripcion: String(item.producto_nombre || "").trim() || "Partida",
      detalle: String(item.producto_descripcion || item.pdf_descripcion_corta || "").trim() || undefined,
      cantidad: Number(item.cantidad) || 0,
      unidad: String(item.unidad || "PZA").trim() || "PZA",
      categoria: categoriaNombre || undefined,
      esEquipo: inferEsEquipoDigitalFlow(item),
      imagenUrl: String(item.thumbnail_url || "").trim() || undefined,
      productoId,
      fuenteProducto: inferFuenteProducto(productoId),
    };
  });
}

export function mapSicarListRowToResumen(row: Record<string, unknown>): CotizacionResumen | null {
  const cotId = Number(row.cot_id);
  if (!Number.isFinite(cotId) || cotId <= 0) return null;
  return {
    id: sicarCotizacionId(cotId),
    origen: "sicar",
    folio: String(cotId),
    cliente: String(row.cliente_nombre || "—"),
    fecha: String(row.fecha || "").slice(0, 10),
  };
}

export function mapSicarDetailToResumen(detail: Record<string, unknown>): CotizacionResumen | null {
  const cotId = Number(detail.cot_id ?? detail.id);
  if (!Number.isFinite(cotId) || cotId <= 0) return null;
  return {
    id: sicarCotizacionId(cotId),
    origen: "sicar",
    folio: String(cotId),
    cliente: String(detail.cliente_nombre || detail.cliente || "—"),
    fecha: String(detail.fecha || "").slice(0, 10),
  };
}

export function mapSicarItemsToPresupuesto(items: unknown[]): PresupuestoLinea[] {
  return (items || []).map((raw, index) => {
    const item = asRecord(raw);
    const clave = String(item.clave || "").trim();
    const orden = item.orden != null ? String(item.orden) : String(index + 1);
    const unidad = String(item.unidadVenta || item.unidad || "PZA").trim() || "PZA";
    return {
      id: clave ? `${orden}-${clave}` : `sicar-line-${index + 1}`,
      descripcion: String(item.descripcion || clave || "Partida").trim() || "Partida",
      cantidad: Number(item.cantidad) || 0,
      unidad,
      esEquipo: inferEsEquipoSicar({
        unidad: String(item.unidad || ""),
        unidadVenta: String(item.unidadVenta || ""),
        descripcion: String(item.descripcion || ""),
      }),
      productoId: clave || undefined,
    };
  });
}

export function clienteIdFromDigitalFlowDetail(detail: ApiCotizacion): string {
  return detail.cliente_id != null && Number(detail.cliente_id) > 0 ? String(detail.cliente_id) : "";
}

export function clienteIdFromSicarDetail(detail: Record<string, unknown>): string {
  const cliId = Number(detail.cli_id);
  return Number.isFinite(cliId) && cliId > 0 ? String(cliId) : "";
}
