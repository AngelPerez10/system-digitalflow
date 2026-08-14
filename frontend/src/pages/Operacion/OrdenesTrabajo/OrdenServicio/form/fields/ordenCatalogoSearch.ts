import { fetchApi } from "@/config/api";
import {
  registrarDesdeCatalogo,
  searchCatalogo,
} from "@/pages/Inventario/shared/inventarioApi";
import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import type { ProductoManualCatalogo } from "@/pages/Ventas/Cotizacion/cotizacionFormTypes";
import {
  fetchSyscomProductosSugerencia,
  fetchTvcProductosSugerencia,
  getCatalogProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";

export type CatalogFuenteOrden = "syscom" | "tvc" | "manual";

export type CatalogoProductoOrden = {
  key: string;
  fuente: CatalogFuenteOrden;
  ref: string;
  nombre: string;
  marca: string;
  modelo: string;
  imagenUrl: string;
};

const FUENTE_LABEL: Record<CatalogFuenteOrden, string> = {
  syscom: "SYSCOM",
  tvc: "TVC",
  manual: "Manual",
};

export function catalogFuenteLabel(fuente: CatalogFuenteOrden): string {
  return FUENTE_LABEL[fuente];
}

function catalogKey(fuente: CatalogFuenteOrden, ref: string, modelo: string): string {
  const id = ref.trim() || modelo.trim();
  return `${fuente}:${id.toLowerCase()}`;
}

function fromSyscom(p: SyscomProducto, fuente: "syscom" | "tvc"): CatalogoProductoOrden | null {
  const ref = String(p.producto_id ?? "").trim();
  const modelo = String(p.modelo ?? p.sku ?? "").trim();
  if (!ref && !modelo) return null;
  const nombre = String(p.titulo ?? "").trim() || modelo;
  return {
    key: catalogKey(fuente, ref, modelo),
    fuente,
    ref: ref || modelo,
    nombre,
    marca: String(p.marca ?? "").trim(),
    modelo,
    imagenUrl: getCatalogProductoImageUrl(p) || "",
  };
}

function fromManual(pm: ProductoManualCatalogo): CatalogoProductoOrden | null {
  const ref = String(pm.id ?? "").trim();
  const modelo = String(pm.modelo ?? "").trim();
  if (!ref && !modelo) return null;
  return {
    key: catalogKey("manual", ref, modelo),
    fuente: "manual",
    ref: ref || modelo,
    nombre: String(pm.producto ?? "").trim() || modelo,
    marca: String(pm.marca ?? "").trim(),
    modelo,
    imagenUrl: String(pm.imagen_url ?? "").trim(),
  };
}

function mergeCatalogo(rows: CatalogoProductoOrden[]): CatalogoProductoOrden[] {
  const seen = new Set<string>();
  const out: CatalogoProductoOrden[] = [];
  for (const row of rows) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    out.push(row);
    if (out.length >= 24) break;
  }
  return out;
}

async function searchManuales(
  q: string,
  signal?: AbortSignal,
): Promise<CatalogoProductoOrden[]> {
  const res = await fetchApi(
    `/api/productos-manuales/?search=${encodeURIComponent(q)}&page_size=8&page=1`,
    { method: "GET", signal },
  );
  if (res.status === 403) return [];
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as
    | { results?: ProductoManualCatalogo[] }
    | ProductoManualCatalogo[]
    | null;
  const rows = Array.isArray(data) ? data : data?.results ?? [];
  return rows.map(fromManual).filter((row): row is CatalogoProductoOrden => row != null);
}

/**
 * Misma lista que Productos (manuales + SYSCOM + TVC).
 * Si un origen falla (permiso o proveedor caído), los demás siguen.
 */
export async function searchProductosPageCatalog(
  q: string,
  signal?: AbortSignal,
): Promise<CatalogoProductoOrden[]> {
  const term = q.trim();
  if (term.length < 2) return [];

  const settled = await Promise.allSettled([
    searchManuales(term, signal),
    fetchSyscomProductosSugerencia(term, { signal }),
    fetchTvcProductosSugerencia(term, { signal }),
    searchCatalogo(term, { signal }).catch(() => [] as Awaited<ReturnType<typeof searchCatalogo>>),
  ]);

  if (signal?.aborted) return [];

  const rows: CatalogoProductoOrden[] = [];

  const manuals = settled[0].status === "fulfilled" ? settled[0].value : [];
  rows.push(...manuals);

  if (settled[1].status === "fulfilled") {
    for (const p of settled[1].value.productos) {
      const row = fromSyscom(p, "syscom");
      if (row) rows.push(row);
    }
  }
  if (settled[2].status === "fulfilled") {
    for (const p of settled[2].value.productos) {
      const row = fromSyscom({ ...p, fuente: p.fuente || "tvc" }, "tvc");
      if (row) rows.push(row);
    }
  }
  if (settled[3].status === "fulfilled") {
    for (const c of settled[3].value) {
      const fuente: CatalogFuenteOrden =
        c.fuente === "tvc" ? "tvc" : c.fuente === "manual" ? "manual" : "syscom";
      if (c.fuente === "desconocido") continue;
      rows.push({
        key: catalogKey(fuente, c.ref_externa, c.modelo),
        fuente,
        ref: c.ref_externa || c.modelo,
        nombre: c.nombre || c.modelo,
        marca: c.marca,
        modelo: c.modelo,
        imagenUrl: c.imagen_url,
      });
    }
  }

  return mergeCatalogo(rows);
}

export async function registrarCatalogoComoInventario(
  producto: CatalogoProductoOrden,
): Promise<InventarioItem> {
  const { item } = await registrarDesdeCatalogo({
    fuente: producto.fuente,
    ref: producto.ref,
    modelo: producto.modelo,
    nombre: producto.nombre,
    marca: producto.marca,
    imagen_url: producto.imagenUrl,
  });
  return item;
}
