import { fetchApi } from "@/config/api";
import { fetchCotizacionDetail } from "@/pages/Ventas/Cotizacion/cotizacionApi";
import type { CloneCotizacionRow } from "@/pages/Ventas/Cotizacion/cotizacionFormTypes";
import { fetchSicarApi } from "@/pages/Ventas/FacturasCFDI/sicarApi";
import {
  clienteIdFromDigitalFlowDetail,
  clienteIdFromSicarDetail,
  mapDigitalFlowDetailToResumen,
  mapDigitalFlowItemsToPresupuesto,
  mapDigitalFlowListRowToResumen,
  mapSicarDetailToResumen,
  mapSicarItemsToPresupuesto,
  mapSicarListRowToResumen,
  parseCotizacionApiId,
} from "./proyectoCotizacionMappers";
import type { CotizacionOrigen, CotizacionResumen, PresupuestoLinea } from "../../shared/proyectoTypes";

export type ProyectoCotizacionLoadResult = {
  resumen: CotizacionResumen;
  lineas: PresupuestoLinea[];
  clienteNombre: string;
  clienteId: string;
};

export type ProyectoCotizacionSearchError = {
  status?: number;
  message: string;
};

const PERMISO_COTIZACIONES_MSG =
  "No tienes permiso del módulo Cotizaciones para buscar o vincular cotizaciones.";

export async function searchProyectoCotizaciones(
  origen: CotizacionOrigen,
  query: string
): Promise<{ rows: CotizacionResumen[]; error: ProyectoCotizacionSearchError | null }> {
  try {
    if (origen === "digitalflow") {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      params.set("page_size", "20");
      params.set("ordering", "-fecha");
      const res = await fetchApi(`/api/cotizaciones/?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        return { rows: [], error: { status: 403, message: PERMISO_COTIZACIONES_MSG } };
      }
      if (!res.ok) {
        return {
          rows: [],
          error: {
            status: res.status,
            message: "No se pudieron cargar cotizaciones DigitalFlow.",
          },
        };
      }
      const list = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { results?: unknown[] }).results)
          ? (data as { results: unknown[] }).results
          : [];
      const rows: CloneCotizacionRow[] = list
        .map((item) => {
          const x = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            id: Number(x.id || 0),
            idx: Number(x.idx || 0),
            cliente: String(x.cliente_nombre || x.cliente || "—"),
            contacto: String(x.contacto || "—"),
            fecha: String(x.fecha || ""),
            total: Number(x.total ?? 0),
          };
        })
        .filter((row) => row.id > 0)
        .slice(0, 20);
      return { rows: rows.map(mapDigitalFlowListRowToResumen), error: null };
    }

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("limit", "20");
    const res = await fetchSicarApi(`/api/cotizaciones-sicar/cotizaciones/?${params.toString()}`, {
      method: "GET",
    });
    const data = await res.json().catch(() => null);
    if (res.status === 403) {
      return { rows: [], error: { status: 403, message: PERMISO_COTIZACIONES_MSG } };
    }
    if (!res.ok) {
      return {
        rows: [],
        error: {
          status: res.status,
          message: String(
            data && typeof data === "object" && "detail" in data
              ? (data as { detail?: unknown }).detail
              : "No se pudieron cargar cotizaciones SICAR."
          ),
        },
      };
    }
    if (!Array.isArray(data)) {
      return { rows: [], error: { message: "Respuesta SICAR inválida." } };
    }
    const rows = data
      .map((row) => mapSicarListRowToResumen(row as Record<string, unknown>))
      .filter((r): r is CotizacionResumen => Boolean(r));
    return { rows, error: null };
  } catch {
    return {
      rows: [],
      error: {
        message:
          origen === "digitalflow"
            ? "No se pudieron buscar cotizaciones DigitalFlow. Revisa conexión o permisos."
            : "No se pudieron buscar cotizaciones SICAR. Revisa conexión o permisos.",
      },
    };
  }
}

export async function loadProyectoCotizacionDetalle(
  resumen: CotizacionResumen
): Promise<{ result: ProyectoCotizacionLoadResult | null; error: string | null }> {
  const apiId = parseCotizacionApiId(resumen.id, resumen.origen);
  if (apiId == null) {
    return { result: null, error: "Identificador de cotización inválido." };
  }

  try {
    if (resumen.origen === "digitalflow") {
      const detail = await fetchCotizacionDetail(apiId);
      if (!detail) {
        return {
          result: null,
          error: "No se pudo cargar la cotización DigitalFlow (¿sin permiso de cotizaciones?).",
        };
      }
      const mappedResumen = mapDigitalFlowDetailToResumen(detail);
      const lineas = mapDigitalFlowItemsToPresupuesto(detail.items || [], detail.categorias_productos);
      return {
        result: {
          resumen: mappedResumen,
          lineas,
          clienteNombre: mappedResumen.cliente,
          clienteId: clienteIdFromDigitalFlowDetail(detail),
        },
        error: null,
      };
    }

    const res = await fetchSicarApi(`/api/cotizaciones-sicar/cotizaciones/${apiId}/`, { method: "GET" });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.status === 403) {
      return { result: null, error: PERMISO_COTIZACIONES_MSG };
    }
    if (!res.ok || !data) {
      return {
        result: null,
        error: String(data?.detail || "No se pudo cargar la cotización SICAR."),
      };
    }
    const mappedResumen = mapSicarDetailToResumen(data);
    if (!mappedResumen) {
      return { result: null, error: "Cotización SICAR inválida." };
    }
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.detallecot)
        ? data.detallecot
        : [];
    return {
      result: {
        resumen: mappedResumen,
        lineas: mapSicarItemsToPresupuesto(items),
        clienteNombre: mappedResumen.cliente,
        clienteId: clienteIdFromSicarDetail(data),
      },
      error: null,
    };
  } catch {
    return {
      result: null,
      error:
        resumen.origen === "digitalflow"
          ? "Error de red al cargar cotización DigitalFlow."
          : "Error de red al cargar cotización SICAR.",
    };
  }
}
