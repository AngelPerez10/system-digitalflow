import { fetchApi } from "@/config/api";

import type {
  ApiCotizacion,
  CatalogoConcepto,
  Cliente,
  CloneCotizacionRow,
  ProductoManualCatalogo,
  ServicioOption,
} from "./cotizacionFormTypes";

type ApiListPayload = unknown[] | { results?: unknown[] };

const listFromPayload = (payload: ApiListPayload): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export async function fetchCotizacionClientes(search = ""): Promise<Cliente[]> {
  const query = new URLSearchParams({
    search: search.trim(),
    page_size: "20",
  });
  const res = await fetchApi(`/api/clientes/?${query.toString()}`);
  const data = (await res.json().catch(() => ({ results: [] }))) as ApiListPayload;
  if (!res.ok) return [];
  return listFromPayload(data) as Cliente[];
}

export async function fetchCotizacionClienteById(id: number): Promise<Cliente | null> {
  const res = await fetchApi(`/api/clientes/${id}/`);
  const data = (await res.json().catch(() => null)) as Cliente | null;
  if (!res.ok || !data || typeof data.id !== "number") return null;
  return data;
}

export async function createCotizacionDraft(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const res = await fetchApi("/api/cotizaciones/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data) return null;
  return data;
}

export async function fetchCotizacionDetail(id: string | number): Promise<ApiCotizacion | null> {
  const res = await fetchApi(`/api/cotizaciones/${id}/`);
  const data = (await res.json().catch(() => null)) as ApiCotizacion | null;
  if (!res.ok || !data) return null;
  return data;
}

export async function searchCotizacionesForClone(search: string): Promise<CloneCotizacionRow[]> {
  return searchCotizacionesLite(search, 60);
}

/** Listado liviano para importar a factura CFDI (menos datos por petición). */
export async function searchCotizacionesLite(
  search: string,
  pageSize = 20
): Promise<CloneCotizacionRow[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  params.set("page_size", String(pageSize));
  params.set("ordering", "-fecha");
  const res = await fetchApi(`/api/cotizaciones/?${params.toString()}`);
  const data = (await res.json().catch(() => null)) as ApiListPayload | null;
  if (!res.ok || !data) return [];

  return listFromPayload(data)
    .map((item) => {
      const x = asRecord(item);
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
    .slice(0, pageSize);
}

export async function fetchCatalogoConceptos(): Promise<CatalogoConcepto[]> {
  const res = await fetchApi("/api/conceptos/?ordering=folio");
  const data = (await res.json().catch(() => ({ results: [] }))) as ApiListPayload;
  if (!res.ok) throw new Error("No se pudieron cargar conceptos del catálogo.");

  return listFromPayload(data).map((item, idx) => {
    const c = asRecord(item);
    return {
      id: Number(c.id ?? idx + 1),
      folio: String(c.folio ?? c.idx ?? c.id ?? idx + 1),
      concepto: String(c.concepto ?? c.nombre ?? "").trim(),
      descripcion: String(c.descripcion ?? "").trim(),
      precio1: Number(c.precio1 ?? c.precio ?? 0),
      imagen_url: String(c.imagen_url ?? "").trim(),
    };
  });
}

export async function fetchProductosManualesCatalogo(): Promise<ProductoManualCatalogo[]> {
  const res = await fetchApi("/api/productos-manuales/?ordering=-fecha_creacion&page_size=500");
  const data = (await res.json().catch(() => ({ results: [] }))) as ApiListPayload;
  if (!res.ok) throw new Error("No se pudieron cargar productos manuales.");

  return listFromPayload(data)
    .map((item) => {
      const p = asRecord(item);
      return {
        id: Number(p.id ?? 0),
        producto: String(p.producto ?? "").trim(),
        marca: String(p.marca ?? "").trim(),
        modelo: String(p.modelo ?? "").trim(),
        caracteristicas: String(p.caracteristicas ?? "").trim(),
        precio: Number(p.precio ?? 0),
        stock: Number(p.stock ?? 0),
        imagen_url: String(p.imagen_url ?? "").trim(),
      };
    })
    .filter((producto) => producto.id > 0 && producto.producto);
}

export async function fetchServiciosCotizacion(): Promise<ServicioOption[]> {
  const res = await fetchApi("/api/servicios/?page_size=500&ordering=idx");
  const data = (await res.json().catch(() => ({ results: [] }))) as ApiListPayload;
  if (!res.ok) return [];

  return listFromPayload(data)
    .filter((item) => asRecord(item).activo !== false)
    .map((item) => {
      const servicio = asRecord(item);
      return { id: Number(servicio.id), nombre: String(servicio.nombre || "") };
    })
    .filter((servicio) => Number.isFinite(servicio.id) && servicio.id > 0);
}
