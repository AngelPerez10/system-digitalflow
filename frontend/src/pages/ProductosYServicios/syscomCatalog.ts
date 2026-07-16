import { fetchApi, hasAuthSessionFlag, hasBearerFallback } from "@/config/api";

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
export type IntraxFuente = "syscom" | "manual" | "tvc";
export type CatalogFuente = IntraxFuente | "tvc" | "";

/**
 * Sesión lista para llamar al API (cookies HttpOnly y/o Bearer de respaldo).
 * No usar document.cookie: en producción el csrftoken vive en el dominio del API.
 */
export function isCatalogAuthReady(): boolean {
  return hasAuthSessionFlag() || hasBearerFallback();
}

/** @deprecated Usar isCatalogAuthReady */
export const getAuthToken = isCatalogAuthReady;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reintenta una vez ante 502 (OAuth SYSCOM lento o timeout intermitente). */
export const fetchSyscom = async (path: string, init?: Pick<RequestInit, "signal">) => {
  const cleanPath = path.replace(/^\//, "");
  const url = `/api/productos/syscom/${cleanPath}`;
  const opts: RequestInit = { method: "GET", signal: init?.signal };
  let last: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchApi(url, opts);
    if (res.ok || res.status !== 502 || attempt === 1) return res;
    last = res;
    await sleep(500 * (attempt + 1));
  }
  return last!;
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

/** Límite de `busqueda` hacia SYSCOM (textos mayores suelen error 500 o poca relevancia). */
export const SYSCOM_BUSQUEDA_MAX_CHARS = 280;

/** Recorta en límite de palabra para no cortar a medias. */
export function clipBusquedaSyscom(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= SYSCOM_BUSQUEDA_MAX_CHARS) return t;
  const cut = t.slice(0, SYSCOM_BUSQUEDA_MAX_CHARS);
  const sp = cut.lastIndexOf(" ");
  return (sp > SYSCOM_BUSQUEDA_MAX_CHARS / 2 ? cut.slice(0, sp) : cut).trim();
}

/**
 * Semillas de búsqueda para descripciones largas (ficha comercial): cada frase por coma/punto y coma,
 * luego el texto completo recortado — SYSCOM suele matchear mejor con la primera línea o con términos sueltos.
 */
function seedsFromDescripcionSyscom(raw: string): string[] {
  const t = raw.trim().replace(/\s+/g, " ");
  const parts = t.split(/[,;]/).map((x) => x.trim()).filter((x) => x.length >= 4);
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const c = clipBusquedaSyscom(s);
    if (c.length < 2 || seen.has(c)) return;
    seen.add(c);
    out.push(c);
  };
  for (const p of parts) {
    add(p);
    if (out.length >= 8) break;
  }
  add(t);
  return out;
}

/**
 * Incluye productos aunque no tengan existencias en almacén (SYSCOM `stock=0`).
 * Sin esto, algunas marcas (p. ej. Icom) pueden quedar fuera del listado según política del catálogo API.
 */
export const SYSCOM_BUSQUEDA_AMPLIA: Pick<SyscomSearchParams, "stock" | "agrupar"> = {
  stock: "0",
  agrupar: "0",
};

/** Variantes de `busqueda` para el GET /productos de SYSCOM (slash en modelo, marca Icom vs ICOM). */
function collectSyscomBusquedaVariants(busqueda: string): string[] {
  const raw = busqueda.trim();
  if (raw.length < 2) return [];
  const candidates: string[] = [];

  const pushBase = (base: string) => {
    candidates.push(base);
    if (base.includes("/")) {
      candidates.push(base.replace(/\//g, " ").replace(/\s+/g, " ").trim());
      candidates.push(base.replace(/\//g, "-").trim());
    }
  };

  pushBase(raw);
  // Prefijo antes de `/` (p. ej. IC-M424G): la búsqueda con sufijo a veces no devuelve el SKU en página 1.
  if (raw.includes("/")) {
    const pre = raw.split("/")[0]?.trim() ?? "";
    if (pre.length >= 4) pushBase(pre);
  }
  const icomNorm = raw.replace(/\bicom\b/gi, "Icom");
  if (icomNorm !== raw) pushBase(icomNorm);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const t = c.trim();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export const buildProductosQuery = (params: SyscomSearchParams) => {
  const sp = new URLSearchParams();
  if (params.busqueda) {
    const b = clipBusquedaSyscom(params.busqueda).replace(/\s+/g, "+");
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

export async function fetchSyscomTipoCambio(): Promise<number | null> {
  const res = await fetchSyscom("tipocambio/");
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

/**
 * Detalle SYSCOM por `GET /productos/{id}/`.
 * El id debe ser **numérico** (producto_id del listado); slugs/modelo devuelven 422/404 y no se consultan.
 */
export async function fetchSyscomProductoDetalle(
  productId: string,
  init?: Pick<RequestInit, "signal">
): Promise<SyscomProductoDetalle | null> {
  const tid = String(productId).trim();
  if (!/^\d+$/.test(tid)) return null;
  const res = await fetchSyscom(`productos/${tid}/`, init);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data as SyscomProductoDetalle;
}

/**
 * Búsqueda SYSCOM para sugerencias (p. ej. cotización): descripciones largas (por frases con coma),
 * variantes de modelo (`/`, Icom), segunda página para `IC-…`, y `stock=0` / `agrupar=0`.
 */
export async function fetchSyscomProductosSugerencia(
  busqueda: string,
  init?: Pick<RequestInit, "signal">
): Promise<{ ok: boolean; productos: SyscomProducto[] }> {
  const raw = busqueda.trim();
  if (raw.length < 2) return { ok: true, productos: [] };
  const seeds = seedsFromDescripcionSyscom(raw);
  const variants: string[] = [];
  const seenVariant = new Set<string>();
  for (const seed of seeds) {
    for (const v of collectSyscomBusquedaVariants(seed)) {
      if (seenVariant.has(v)) continue;
      seenVariant.add(v);
      variants.push(v);
      if (variants.length >= 18) break;
    }
    if (variants.length >= 18) break;
  }
  const merged: SyscomProducto[] = [];
  const seen = new Set<string>();
  let anyOk = false;

  const ingestList = (list: SyscomProducto[]) => {
    for (const p of list) {
      const id = String(p?.producto_id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(p);
      if (merged.length >= 24) return true;
    }
    return false;
  };

  let page2UsedForIc = false;
  for (let vi = 0; vi < variants.length; vi++) {
    const v = variants[vi];
    const useSecondPage = /^IC-/i.test(v) && !page2UsedForIc;
    if (useSecondPage) page2UsedForIc = true;
    const maxPage = useSecondPage ? 2 : 1;
    for (let page = 1; page <= maxPage; page++) {
      const query = buildProductosQuery({
        busqueda: v,
        pagina: page,
        orden: "relevancia",
        ...SYSCOM_BUSQUEDA_AMPLIA,
      });
      const res = await fetchSyscom(`productos/?${query}`, init);
      const data: SyscomProductosResponse = await res.json().catch(() => ({}));
      if (res.ok) anyOk = true;
      else continue;
      if (ingestList((data.productos || []) as SyscomProducto[])) return { ok: anyOk, productos: merged };
    }
  }

  return { ok: anyOk, productos: merged.slice(0, 24) };
};

export const TVC_SITE_URL = "https://www.tvcenlinea.com";

/** Reintenta una vez ante 502 (token TVC inválido o TVC caído). */
export const fetchTvc = async (path: string, init?: Pick<RequestInit, "signal">) => {
  const cleanPath = path.replace(/^\//, "");
  const url = `/api/productos/tvc/${cleanPath}`;
  const opts: RequestInit = { method: "GET", signal: init?.signal };
  let last: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchApi(url, opts);
    if (res.ok || res.status !== 502 || attempt === 1) return res;
    last = res;
    await sleep(500 * (attempt + 1));
  }
  return last!;
};

export type TvcSearchParams = {
  busqueda?: string;
  categoria?: string;
  marca?: string;
  pagina?: number;
  por_pagina?: number;
};

export const buildTvcProductosQuery = (params: TvcSearchParams) => {
  const sp = new URLSearchParams();
  if (params.busqueda) {
    const b = clipBusquedaSyscom(params.busqueda).trim();
    if (b) sp.set("busqueda", b);
  }
  if (params.categoria) sp.set("categoria", params.categoria);
  if (params.marca) sp.set("marca", params.marca);
  if (params.pagina) sp.set("pagina", String(params.pagina));
  if (params.por_pagina) sp.set("por_pagina", String(params.por_pagina));
  return sp.toString();
};

export async function fetchTvcTipoCambio(): Promise<number | null> {
  const res = await fetchTvc("tipocambio/");
  if (!res.ok) return null;
  const data: unknown = await res.json().catch(() => null);
  const direct = asNumber(data);
  if (direct) return direct;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["tipo_cambio", "tipoCambio", "exchange_rate", "rate", "valor", "data"]) {
      const n = asNumber(rec[key]);
      if (n) return n;
    }
    const fallback = findNumberInObject(data);
    if (fallback) return fallback;
  }
  return null;
}

export async function fetchTvcProductoDetalle(
  productId: string,
  init?: Pick<RequestInit, "signal">
): Promise<SyscomProductoDetalle | null> {
  const tid = String(productId).trim();
  if (!tid) return null;
  const pathId = tid.toLowerCase().startsWith("tvc:") ? tid.slice(4) : tid;
  const res = await fetchTvc(`productos/${encodeURIComponent(pathId)}/`, init);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data as SyscomProductoDetalle;
}

export async function fetchTvcProductos(
  params: TvcSearchParams,
  init?: Pick<RequestInit, "signal">
): Promise<SyscomProductosResponse> {
  const query = buildTvcProductosQuery(params);
  const res = await fetchTvc(query ? `productos/?${query}` : "productos/", init);
  const data: SyscomProductosResponse = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error("No se pudo consultar el catálogo TVC.");
  }
  const productos = (data.productos ?? []).map((p) => ({ ...p, fuente: p.fuente || "tvc" }));
  return { ...data, productos };
}

/** Búsqueda TVC para sugerencias (cotización / autocomplete). */
export async function fetchTvcProductosSugerencia(
  busqueda: string,
  init?: Pick<RequestInit, "signal">
): Promise<{ ok: boolean; productos: SyscomProducto[] }> {
  const raw = busqueda.trim();
  if (raw.length < 2) return { ok: true, productos: [] };

  const variants: string[] = [];
  const seen = new Set<string>();
  const add = (v: string) => {
    const t = v.trim();
    if (t.length < 2 || seen.has(t)) return;
    seen.add(t);
    variants.push(t);
  };
  add(raw);
  if (raw.includes("/")) {
    add(raw.replace(/\//g, " ").trim());
    add(raw.split("/")[0]?.trim() ?? "");
  }
  if (raw.includes(" ")) add(raw.split(/\s+/)[0] ?? "");

  const merged: SyscomProducto[] = [];
  const seenIds = new Set<string>();
  let anyOk = false;

  for (const v of variants.slice(0, 6)) {
    try {
      const data = await fetchTvcProductos({ busqueda: v, pagina: 1, por_pagina: 24 }, init);
      anyOk = true;
      for (const p of data.productos ?? []) {
        const id = String(p.producto_id ?? "");
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        merged.push(p);
        if (merged.length >= 16) break;
      }
      if (merged.length >= 16) break;
    } catch {
      // intentar siguiente variante
    }
  }

  if (!merged.length) {
    try {
      const data = await fetchTvcProductos({ busqueda: raw, pagina: 1, por_pagina: 24 }, init);
      anyOk = true;
      for (const p of data.productos ?? []) {
        const id = String(p.producto_id ?? "");
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        merged.push(p);
      }
    } catch {
      return { ok: false, productos: [] };
    }
  }

  return { ok: anyOk, productos: merged.slice(0, 16) };
}

export const getTvcProductoImageUrl = (imgPortada?: string) => {
  const s = (imgPortada || "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `https://cdn.tvc.mx${s}`;
  return `https://cdn.tvc.mx/${s}`;
};

export const getCatalogProductoImageUrl = (p: Pick<SyscomProducto, "img_portada" | "fuente">) => {
  if (p.fuente === "tvc") return getTvcProductoImageUrl(p.img_portada);
  return getProductoImageUrl(p.img_portada);
};
