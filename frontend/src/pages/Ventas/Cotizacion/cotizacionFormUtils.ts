import type { SyscomProducto } from "@/pages/ProductosYServicios/syscomCatalog";

export const MAX_COTIZ_CLIENTE_LEN = 255;
export const MAX_COTIZ_THUMB_URL_LEN = 512;
export const MAX_COTIZ_PRODUCTO_NOMBRE_LEN = 255;
export const IVA_MX = 1.16;

export const toNumber = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const clampPct = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
};

export const normalizeTipoTrabajoIds = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .map((item) => {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (typeof item === "string" && item.trim()) return Number(item);
      if (item && typeof item === "object" && "id" in item) return Number((item as { id: unknown }).id);
      return NaN;
    })
    .filter((id) => Number.isFinite(id) && id > 0);
  return [...new Set(ids)];
};

export const round2 = (v: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

export const truncateStr = (v: unknown, max: number) => String(v ?? "").slice(0, max);

export const formatCotizacionApiError = (data: unknown): string => {
  if (data == null || typeof data !== "object") return "No se pudo guardar la cotización.";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string" && d.detail.trim()) {
    const detail = d.detail.trim();
    if (/csrf/i.test(detail)) {
      return "La sesión no pudo validarse (CSRF). Cierra sesión, vuelve a entrar e intenta guardar de nuevo.";
    }
    return detail;
  }
  if (Array.isArray(d.detail) && d.detail.length) return d.detail.map(String).join(" ");
  const parts: string[] = [];
  for (const [key, val] of Object.entries(d)) {
    if (key === "detail") continue;
    if (Array.isArray(val)) {
      parts.push(`${key}: ${val.join(", ")}`);
    } else if (val && typeof val === "object") {
      for (const [k2, v2] of Object.entries(val as Record<string, unknown>)) {
        const msg = Array.isArray(v2) ? v2.join(", ") : String(v2);
        parts.push(`${key}.${k2}: ${msg}`);
      }
    } else if (val != null) {
      parts.push(`${key}: ${String(val)}`);
    }
  }
  return parts.length ? parts.join(" | ") : JSON.stringify(data);
};

export const formatMoney = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Detalle de línea para productos del catálogo manual (marca/modelo + características). */
export const buildManualProductoDescripcion = (producto: {
  marca?: string;
  modelo?: string;
  caracteristicas?: string;
}): string => {
  const parts: string[] = [];
  const meta = [String(producto.marca || "").trim(), String(producto.modelo || "").trim()].filter(Boolean).join(" · ");
  if (meta) parts.push(meta);
  const caracteristicas = String(producto.caracteristicas || "").trim();
  if (caracteristicas) parts.push(caracteristicas);
  return parts.join("\n\n");
};

export const resolveConceptoDescripcion = (
  concepto: { producto_externo_id?: string; producto_descripcion?: string },
  catalogoManual: Array<{ id: number; marca?: string; modelo?: string; caracteristicas?: string }>
): string => {
  const extId = String(concepto.producto_externo_id || "").trim().toLowerCase();
  if (extId.startsWith("manual:")) {
    const manualId = Number(extId.split(":")[1]);
    const manual = catalogoManual.find((p) => p.id === manualId);
    if (manual) return buildManualProductoDescripcion(manual);
  }
  return String(concepto.producto_descripcion ?? "").trim();
};

export const toFinite = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const getSyscomPrecioListaMxnConIva = (p: SyscomProducto, tipoCambio: number | null) => {
  const directMxn = toFinite(p.precio_mxn);
  if (directMxn !== null && directMxn > 0) return Math.max(0, directMxn);

  const lista = toFinite(p.precios?.precio_lista);
  const especial = toFinite(p.precios?.precio_especial);
  const usdBase = especial ?? lista;

  if (usdBase == null) return 0;
  if (!tipoCambio) {
    return Math.max(0, usdBase);
  }

  return Math.max(0, usdBase * tipoCambio * IVA_MX);
};

export const asBool = (v: unknown, defaultValue: boolean) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return defaultValue;
};
