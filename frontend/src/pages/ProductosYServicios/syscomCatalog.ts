import { apiUrl } from "@/config/api";

export const SYSCOM_SITE_URL = "https://www.syscom.mx";

export type SyscomCategoria = {
  id: string;
  nombre: string;
  nivel: number | string;
};

export type SyscomMarca = {
  id: string;
  nombre: string;
};

export type SyscomProducto = {
  producto_id: string;
  modelo: string;
  sku?: string;
  total_existencia: number;
  titulo: string;
  marca: string;
  fuente?: string;
  estado?: string;
  estado_inventario?: string;
  precio_mxn?: string | number;
  sat_key?: string;
  img_portada?: string;
  categorías?: Array<{ id: string; nombre: string }>;
  marca_logo?: string;
  link?: string;
  iconos?: Record<string, string> | null;
  precios?: {
    precio_lista?: string | number | null;
    precio_especial?: string | number | null;
    precio_descuento?: string | number | null;
  } | null;
};

export type SyscomProductosResponse = {
  cantidad?: number;
  pagina?: number;
  paginas?: number;
  productos?: SyscomProducto[];
};

export type SyscomSearchParams = {
  busqueda?: string;
  categoria?: string;
  marca?: string;
  sucursal?: string;
  orden?: "precio:asc" | "precio:desc" | "modelo:asc" | "modelo:desc" | "marca:asc" | "marca:desc" | "relevancia" | "topseller";
  pagina?: number;
  stock?: "0" | "1";
  agrupar?: "0" | "1";
};

export type SyscomPriceKind = "lista" | "especial" | "descuento" | "auto";
export type IntraxFuente = "syscom" | "manual";

export const getAuthToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

export const fetchSyscom = (path: string, token: string, init?: Pick<RequestInit, "signal">) => {
  const cleanPath = path.replace(/^\//, "");
  return fetch(apiUrl(`/api/productos/syscom/${cleanPath}`), {
    headers: { Authorization: `Bearer ${token}` },
    signal: init?.signal,
  });
};

const INTRAX_PRODUCTOS_URL = "https://intrax.mx/wp-json/custom/v1/productos";

export type IntraxProducto = {
  id_producto: number;
  nombre: string;
  sku: string;
  fuente: IntraxFuente;
  estado: string;
  precio_normal: string;
  precio_mayoreo: string;
  existencias: number;
  estado_inventario: string;
  imagen?: string;
};

type IntraxResumen = {
  total_resultados?: number;
  pagina?: number;
  resultados_por_pagina?: number;
  total_paginas?: number;
};

export type IntraxProductosResponse = {
  resumen?: IntraxResumen;
  productos?: IntraxProducto[];
};

export type IntraxSearchParams = {
  fuente?: IntraxFuente;
  estado?: string;
  sku?: string;
  buscar?: string;
  pagina?: number;
  por_pagina?: number;
};

export const buildIntraxProductosQuery = (params: IntraxSearchParams) => {
  const sp = new URLSearchParams();
  if (params.fuente) sp.set("fuente", params.fuente);
  if (params.estado) sp.set("estado", params.estado);
  if (params.sku) sp.set("sku", params.sku.trim());
  if (params.buscar) sp.set("buscar", params.buscar.trim());
  if (params.pagina) sp.set("pagina", String(params.pagina));
  if (params.por_pagina) sp.set("por_pagina", String(params.por_pagina));
  return sp.toString();
};

export async function fetchIntraxProductos(params: IntraxSearchParams): Promise<IntraxProductosResponse> {
  const query = buildIntraxProductosQuery(params);
  const res = await fetch(query ? `${INTRAX_PRODUCTOS_URL}?${query}` : INTRAX_PRODUCTOS_URL);
  if (!res.ok) {
    throw new Error("No se pudo consultar el catalogo de Intrax.");
  }
  const data = await res.json().catch(() => ({}));
  return data as IntraxProductosResponse;
}

export const mapIntraxProductoToSyscom = (p: IntraxProducto): SyscomProducto => ({
  producto_id: String(p.id_producto),
  modelo: p.sku || "",
  sku: p.sku || "",
  total_existencia: Number.isFinite(p.existencias) ? p.existencias : 0,
  titulo: p.nombre || "",
  marca: "Intrax",
  fuente: p.fuente,
  estado: p.estado,
  estado_inventario: p.estado_inventario,
  precio_mxn: p.precio_normal,
  img_portada: p.imagen,
  link: `https://intrax.mx/?s=${encodeURIComponent(p.sku || p.nombre || "")}&post_type=product`,
  precios: {
    precio_lista: p.precio_normal,
  },
});

/** Syscom rechaza o falla con URLs muy largas; modelos/SKU suelen ser cortos. */
export const SYSCOM_BUSQUEDA_MAX_CHARS = 120;

export const buildProductosQuery = (params: SyscomSearchParams) => {
  const sp = new URLSearchParams();
  if (params.busqueda) {
    const b = params.busqueda.trim().slice(0, SYSCOM_BUSQUEDA_MAX_CHARS).replace(/\s+/g, "+");
    if (b) sp.set("busqueda", b);
  }
  if (params.categoria) sp.set("categoria", params.categoria);
  if (params.marca) sp.set("marca", params.marca);
  if (params.sucursal) sp.set("sucursal", params.sucursal);
  if (params.orden) sp.set("orden", params.orden);
  if (params.pagina) sp.set("pagina", String(params.pagina));
  if (params.stock) sp.set("stock", params.stock);
  if (params.agrupar) sp.set("agrupar", params.agrupar);
  return sp.toString();
};

export const getProductoImageUrl = (imgPortada?: string) => {
  const s = (imgPortada || "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${SYSCOM_SITE_URL}${s}`;
  return `${SYSCOM_SITE_URL}/${s}`;
};

export const getProductoLink = (p: Pick<SyscomProducto, "link" | "producto_id">) => {
  const link = (p.link || "").trim();
  if (!link) return `${SYSCOM_SITE_URL}`;
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  return `${SYSCOM_SITE_URL}${link.startsWith("/") ? "" : "/"}${link}`;
};

/** Devuelve todas las URLs de imagen del producto (portada + galería) para el modal. */
export function getProductoImagenesUrls(p: SyscomProductoDetalle): string[] {
  const out: string[] = [];
  const portada = getProductoImageUrl(p.img_portada);
  if (portada) out.push(portada);
  const list = p.imagenes;
  if (Array.isArray(list)) {
    for (const item of list) {
      const path = typeof item === "string" ? item : (item?.url || item?.imagen || item?.src);
      const url = path ? getProductoImageUrl(path) : null;
      if (url && !out.includes(url)) out.push(url);
    }
  }
  return out;
}

const asNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const findNumberInObject = (obj: unknown): number | null => {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const v of Object.values(rec)) {
    const n = asNumber(v);
    if (n !== null) return n;
  }
  for (const v of Object.values(rec)) {
    if (v && typeof v === "object") {
      const inner = v as Record<string, unknown>;
      for (const vv of Object.values(inner)) {
        const n = asNumber(vv);
        if (n !== null) return n;
      }
    }
  }
  return null;
};

/** Selección de precio en USD según tipo; en modo auto: especial → lista → descuento. */
const pickUsdPrice = (p: SyscomProducto, kind: SyscomPriceKind): number | null => {
  const precios = p.precios || undefined;
  if (!precios) return null;
  const lista = asNumber(precios.precio_lista);
  const especial = asNumber(precios.precio_especial);
  const descuento = asNumber(precios.precio_descuento);
  if (kind === "lista") return lista;
  if (kind === "especial") return especial;
  if (kind === "descuento") return descuento;
  return especial ?? lista ?? descuento;
};

/** Precio preferido para cotización: precio_especial si existe; si no, precio_lista; luego descuento. */
export const getPrecioPublicoUsd = (p: SyscomProducto): number | null => {
  const precios = p.precios || undefined;
  if (!precios) return null;
  const lista = asNumber(precios.precio_lista);
  const especial = asNumber(precios.precio_especial);
  const descuento = asNumber(precios.precio_descuento);
  return especial ?? lista ?? descuento;
};

export async function fetchSyscomTipoCambio(token: string): Promise<number | null> {
  const res = await fetchSyscom("tipocambio/", token);
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  const direct = asNumber(data);
  if (direct) return direct;
  const candidates = [
    data?.tipo_cambio,
    data?.tipoCambio,
    data?.tipocambio,
    data?.tc,
    data?.exchange_rate,
    data?.exchangeRate,
    data?.rate,
    data?.valor,
    data?.data?.tipo_cambio,
    data?.data?.tipoCambio,
    data?.data?.tipocambio,
    data?.data?.tc,
  ];
  for (const c of candidates) {
    const n = asNumber(c);
    if (n) return n;
  }
  const fallback = findNumberInObject(data);
  return fallback;
}

export const formatPrecioSyscomMxnByKind = (p: SyscomProducto, tipoCambio: number | null, kind: SyscomPriceKind) => {
  const usd = pickUsdPrice(p, kind);
  if (usd === null) return "—";
  if (!tipoCambio) return "—";
  const mxn = usd * tipoCambio;
  return mxn.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

/** IVA 16% (México). Precio al público en MXN ya incluye IVA en la etiqueta. */
const IVA_MX = 1.16;

/** Precio en MXN con IVA incluido (precio preferido en USD × tipo de cambio × 1.16). */
export const formatPrecioPublicoMxnConIva = (p: SyscomProducto, tipoCambio: number | null): string => {
  const precioMxn = asNumber(p.precio_mxn);
  if (precioMxn !== null) {
    return precioMxn.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
  const usd = getPrecioPublicoUsd(p);
  if (usd === null) return "—";
  if (!tipoCambio) return "—";
  const mxnConIva = usd * tipoCambio * IVA_MX;
  return mxnConIva.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

/** Detalle de producto SYSCOM (endpoint productos/<id>/). Puede incluir imagenes[] (paths o URLs). */
export type SyscomProductoDetalle = SyscomProducto & {
  descripcion?: string;
  caracteristicas?: string[];
  imagenes?: (string | { url?: string; imagen?: string; src?: string })[];
};

export async function fetchSyscomProductoDetalle(
  token: string,
  productId: string
): Promise<SyscomProductoDetalle | null> {
  const res = await fetchSyscom(`productos/${productId}/`, token);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data as SyscomProductoDetalle;
}
