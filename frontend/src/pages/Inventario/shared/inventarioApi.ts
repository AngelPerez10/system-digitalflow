import { fetchApi } from "@/config/api";
import type {
  InventarioItem,
  InventarioItemPatch,
  InventarioMovimiento,
  InventarioMovimientosParams,
  ScanModo,
  ScanResponse,
} from "./inventarioTypes";

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

export async function listInventarioItems(search?: string): Promise<InventarioItem[]> {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await fetchApi(`/api/inventario/items/${qs}`, { method: "GET" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as InventarioItem[];
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

export async function listInventarioMovimientos(
  params?: InventarioMovimientosParams,
): Promise<InventarioMovimiento[]> {
  const searchParams = new URLSearchParams();
  if (params?.item != null && String(params.item).trim()) {
    searchParams.set("item", String(params.item));
  }
  if (params?.desde?.trim()) {
    searchParams.set("desde", params.desde.trim());
  }
  const qs = searchParams.toString();
  const res = await fetchApi(`/api/inventario/movimientos/${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as InventarioMovimiento[];
}
