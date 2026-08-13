import { fetchApi } from "@/config/api";
import type {
  CatalogoCandidato,
  FacturaProveedor,
  ImportarFacturaResponse,
  InventarioFuente,
  InventarioItem,
  InventarioItemPatch,
  InventarioItemsParams,
  InventarioMovimiento,
  InventarioMovimientosParams,
  InventarioStats,
  PaginatedResponse,
  ScanModo,
  ScanResponse,
} from "./inventarioTypes";

const DEFAULT_PAGE_SIZE = 20;

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { detail?: string } | null;
  return data?.detail || `Error ${res.status}`;
}

export async function scanInventario(codigo: string, modo: ScanModo): Promise<ScanResponse> {
  const res = await fetchApi("/api/inventario/scan/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo_barras: codigo, modo }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScanResponse;
}

export async function listInventarioItems(
  params?: InventarioItemsParams,
): Promise<PaginatedResponse<InventarioItem>> {
  const searchParams = new URLSearchParams();
  if (params?.search?.trim()) searchParams.set("search", params.search.trim());
  if (params?.seccion?.trim()) searchParams.set("seccion", params.seccion.trim());
  searchParams.set("page", String(params?.page ?? 1));
  searchParams.set("page_size", String(params?.page_size ?? DEFAULT_PAGE_SIZE));
  const qs = searchParams.toString();
  const res = await fetchApi(`/api/inventario/items/?${qs}`, { method: "GET" });
  if (!res.ok) {
    const err = new Error(await readError(res)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as PaginatedResponse<InventarioItem>;
}

export async function fetchInventarioStats(): Promise<InventarioStats> {
  const res = await fetchApi("/api/inventario/stats/", { method: "GET" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as InventarioStats;
}

/** Backfill de secciones vacías desde SYSCOM/TVC (ítems ya existentes). */
export async function sincronizarSeccionesInventario(
  limit = 40,
): Promise<{ revisados: number; actualizados: number; pendientes_restantes: number }> {
  const res = await fetchApi("/api/inventario/sincronizar-secciones/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as {
    revisados: number;
    actualizados: number;
    pendientes_restantes: number;
  };
}

export async function getInventarioItem(id: number): Promise<InventarioItem> {
  const res = await fetchApi(`/api/inventario/items/${id}/`, { method: "GET" });
  if (!res.ok) {
    const err = new Error(await readError(res)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as InventarioItem;
}

export async function patchInventarioItem(
  id: number,
  body: InventarioItemPatch,
): Promise<InventarioItem> {
  const res = await fetchApi(`/api/inventario/items/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as InventarioItem;
}

export async function deleteInventarioItem(id: number): Promise<void> {
  const res = await fetchApi(`/api/inventario/items/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readError(res));
}

/** Sube la foto del producto a Cloudinary y devuelve la URL guardable. */
export async function uploadInventarioImagen(dataUrl: string): Promise<string> {
  const res = await fetchApi("/api/inventario/upload-image/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_url: dataUrl }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("El servidor no devolvió la URL de la imagen");
  return data.url;
}

/** Busca en SYSCOM/TVC por nombre o modelo; los catálogos no indexan el EAN. */
export async function searchCatalogo(search: string): Promise<CatalogoCandidato[]> {
  const term = search.trim();
  if (term.length < 3) return [];
  const res = await fetchApi(`/api/inventario/catalogo/?search=${encodeURIComponent(term)}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CatalogoCandidato[];
}

/** Relee el catálogo de un ítem ya vinculado (recupera datos y foto por su ref). */
export async function fetchCatalogoDetalle(id: number): Promise<CatalogoCandidato | null> {
  const res = await fetchApi(`/api/inventario/items/${id}/catalogo/`, { method: "GET" });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CatalogoCandidato;
}

/**
 * Detalle del catálogo por fuente + referencia, para un candidato recién elegido
 * que todavía no se guarda: la búsqueda no trae las características, el detalle sí.
 */
export async function fetchCatalogoDetallePorRef(
  fuente: InventarioFuente,
  ref: string,
  modelo: string,
): Promise<CatalogoCandidato | null> {
  if (fuente === "desconocido") return null;
  const qs = new URLSearchParams({ fuente, ref: ref.trim(), modelo: modelo.trim() });
  const res = await fetchApi(`/api/inventario/catalogo/detalle/?${qs.toString()}`, {
    method: "GET",
  });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CatalogoCandidato;
}

/** Importa todos los productos de una factura de proveedor (SYSCOM hoy; TVC después). */
export async function importarFactura(
  proveedor: FacturaProveedor,
  folio: string,
): Promise<ImportarFacturaResponse> {
  const res = await fetchApi("/api/inventario/importar-factura/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proveedor, folio: folio.trim() }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ImportarFacturaResponse;
}

export async function listInventarioMovimientos(
  params?: InventarioMovimientosParams,
): Promise<PaginatedResponse<InventarioMovimiento>> {
  const searchParams = new URLSearchParams();
  if (params?.item != null && String(params.item).trim()) {
    searchParams.set("item", String(params.item));
  }
  if (params?.desde?.trim()) {
    searchParams.set("desde", params.desde.trim());
  }
  searchParams.set("page", String(params?.page ?? 1));
  searchParams.set("page_size", String(params?.page_size ?? DEFAULT_PAGE_SIZE));
  const qs = searchParams.toString();
  const res = await fetchApi(`/api/inventario/movimientos/?${qs}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as PaginatedResponse<InventarioMovimiento>;
}
