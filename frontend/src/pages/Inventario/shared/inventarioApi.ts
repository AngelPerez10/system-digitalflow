import { fetchApi } from "@/config/api";
import type {
  CatalogoCandidato,
  FacturaPreview,
  FacturaProveedor,
  ImportarFacturaResponse,
  InventarioPendiente,
  RecepcionLinea,
  RecibirPendienteResponse,
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

/** Error de la API con su `code` para reaccionar en la UI. */
export class InventarioApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "InventarioApiError";
    this.code = code;
    this.status = status;
  }
}

async function throwApiError(res: Response): Promise<never> {
  const data = (await res.json().catch(() => null)) as { detail?: string; code?: string } | null;
  throw new InventarioApiError(data?.detail || `Error ${res.status}`, data?.code || "", res.status);
}

export async function scanInventario(
  codigo: string,
  modo: ScanModo,
  nota?: string,
): Promise<ScanResponse> {
  const body: { codigo_barras: string; modo: ScanModo; nota?: string } = {
    codigo_barras: codigo,
    modo,
  };
  const notaTrim = (nota ?? "").trim();
  if (notaTrim) body.nota = notaTrim.slice(0, 255);
  const res = await fetchApi("/api/inventario/scan/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res);
  return (await res.json()) as ScanResponse;
}

export async function listInventarioItems(
  params?: InventarioItemsParams,
): Promise<PaginatedResponse<InventarioItem>> {
  const searchParams = new URLSearchParams();
  if (params?.search?.trim()) searchParams.set("search", params.search.trim());
  if (params?.seccion?.trim()) searchParams.set("seccion", params.seccion.trim());
  if (params?.ubicacion?.trim()) searchParams.set("ubicacion", params.ubicacion.trim());
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

/** Busca en SYSCOM/TVC/manuales por nombre o modelo; los catálogos no indexan el EAN. */
export async function searchCatalogo(
  search: string,
  init?: Pick<RequestInit, "signal">,
): Promise<CatalogoCandidato[]> {
  const term = search.trim();
  if (term.length < 3) return [];
  const res = await fetchApi(`/api/inventario/catalogo/?search=${encodeURIComponent(term)}`, {
    method: "GET",
    signal: init?.signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CatalogoCandidato[];
}

export type RegistrarCatalogoPayload = {
  fuente: "syscom" | "tvc" | "manual";
  ref: string;
  modelo?: string;
  nombre?: string;
  marca?: string;
  imagen_url?: string;
};

/** Alta en inventario con stock 0 (o reutiliza el ítem si ya existe). No mueve stock. */
export async function registrarDesdeCatalogo(
  payload: RegistrarCatalogoPayload,
): Promise<{ item: InventarioItem; creado: boolean }> {
  const res = await fetchApi("/api/inventario/registrar-catalogo/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { item: InventarioItem; creado: boolean };
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
  fuente: InventarioFuente | "manual",
  ref: string,
  modelo: string,
): Promise<CatalogoCandidato | null> {
  if (fuente === "desconocido" || fuente === "manual") return null;
  const qs = new URLSearchParams({ fuente, ref: ref.trim(), modelo: modelo.trim() });
  const res = await fetchApi(`/api/inventario/catalogo/detalle/?${qs.toString()}`, {
    method: "GET",
  });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CatalogoCandidato;
}

/** Importa todos los productos de una factura de proveedor (SYSCOM hoy; TVC después). */
/** Trae las líneas de la factura sin tocar el inventario. */
export async function previsualizarFactura(
  proveedor: FacturaProveedor,
  folio: string,
): Promise<FacturaPreview> {
  const res = await fetchApi("/api/inventario/importar-factura/previsualizar/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proveedor, folio: folio.trim() }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as FacturaPreview;
}

/**
 * Importa la factura. Con `recepcion`, solo da entrada a lo recibido y deja el
 * resto en espera; sin ella, importa todo (comportamiento anterior).
 */
export async function importarFactura(
  proveedor: FacturaProveedor,
  folio: string,
  recepcion?: RecepcionLinea[],
): Promise<ImportarFacturaResponse> {
  const res = await fetchApi("/api/inventario/importar-factura/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proveedor, folio: folio.trim(), ...(recepcion ? { recepcion } : {}) }),
  });
  if (!res.ok) await throwApiError(res);
  return (await res.json()) as ImportarFacturaResponse;
}

export async function listInventarioPendientes(): Promise<InventarioPendiente[]> {
  const res = await fetchApi("/api/inventario/pendientes/", { method: "GET" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as InventarioPendiente[];
}

/** Da entrada a un producto en espera; sin `cantidad` recibe todas sus unidades. */
export async function recibirInventarioPendiente(
  id: number,
  cantidad?: number,
): Promise<RecibirPendienteResponse> {
  const res = await fetchApi(`/api/inventario/pendientes/${id}/recibir/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cantidad != null ? { cantidad } : {}),
  });
  if (!res.ok) await throwApiError(res);
  return (await res.json()) as RecibirPendienteResponse;
}

/** Descarta un producto en espera (no llegará). No toca el inventario. */
export async function descartarInventarioPendiente(id: number): Promise<void> {
  const res = await fetchApi(`/api/inventario/pendientes/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readError(res));
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

export type PrecioSincronizado = Pick<
  InventarioItem,
  "id" | "precio_mercado" | "precio_mercado_anterior" | "precio_mercado_actualizado"
>;

export type SincronizarPreciosResponse = {
  revisados: number;
  actualizados: number;
  pendientes_restantes: number;
  /** Valores nuevos de cada ítem revisado (para pintarlos sin recargar la lista). */
  items: PrecioSincronizado[];
};

/**
 * Refresca el precio de venta (lista SYSCOM/TVC) de un lote de ítems vencidos.
 * `ids` (los visibles) se consultan primero.
 */
export async function sincronizarPreciosMercado(limit = 6, ids: number[] = []): Promise<SincronizarPreciosResponse> {
  const res = await fetchApi("/api/inventario/sincronizar-precios/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit, ids }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as SincronizarPreciosResponse;
}

/** Consulta ya el precio de mercado de un ítem (SYSCOM/TVC). */
export async function actualizarPrecioMercado(id: number): Promise<InventarioItem> {
  const res = await fetchApi(`/api/inventario/items/${id}/precio-mercado/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as InventarioItem;
}
