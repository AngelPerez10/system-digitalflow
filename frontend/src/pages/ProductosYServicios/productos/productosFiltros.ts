/**
 * Stock y filtros «en pantalla» de Productos (funciones puras).
 *
 * Stock: SYSCOM (y el catálogo de Intrax) topan la existencia publicada en 500;
 * un 500 significa «500 o más». TVC y los manuales dan la cifra exacta.
 */
import { getPrecioPublicoUsd, type SyscomProducto } from "../syscomCatalog";

export const STOCK_TOPE = 500;
const IVA_MX = 1.16;

/** Existencia numérica (acepta número o texto); null si el proveedor no la da. */
export const stockDe = (p: Pick<SyscomProducto, "total_existencia">): number | null => {
  const raw = p.total_existencia as unknown;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
};

/** ¿La cifra es el tope del proveedor (hay 500 o más)? */
export const stockEsTope = (p: Pick<SyscomProducto, "total_existencia" | "fuente">): boolean => {
  const n = stockDe(p);
  return n != null && n >= STOCK_TOPE && p.fuente !== "manual" && p.fuente !== "tvc";
};

/** Texto de existencia: «500+», «31», «Sin stock» o null si no hay dato. */
export const stockTexto = (p: Pick<SyscomProducto, "total_existencia" | "fuente">): string | null => {
  const n = stockDe(p);
  if (n == null) return null;
  if (n === 0) return "Sin stock";
  return stockEsTope(p) ? `${STOCK_TOPE}+` : n.toLocaleString("es-MX");
};

/** Precio público numérico (MXN con IVA), mismo cálculo que `formatPrecioPublicoMxnConIva`. */
export const precioPublico = (p: SyscomProducto, tipoCambio: number | null): number | null => {
  const directo = p.precio_mxn;
  if (directo != null && directo !== "") {
    const n = Number(directo);
    if (Number.isFinite(n)) return n;
  }
  const usd = getPrecioPublicoUsd(p);
  if (usd == null || !tipoCambio) return null;
  return usd * tipoCambio * IVA_MX;
};

export type FiltrosPantalla = {
  soloExistencia: boolean;
  precioMin: string;
  precioMax: string;
};

const numero = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return v.trim() && Number.isFinite(n) ? n : null;
};

export const filtrosPantallaActivos = (f: FiltrosPantalla) =>
  f.soloExistencia || numero(f.precioMin) != null || numero(f.precioMax) != null;

/**
 * Aplica existencia y rango de precio a los resultados cargados. Un producto
 * sin precio conocido se excluye solo si hay rango de precio.
 */
export const filtrarEnPantalla = (rows: SyscomProducto[], f: FiltrosPantalla, tipoCambio: number | null) => {
  const min = numero(f.precioMin);
  const max = numero(f.precioMax);
  return rows.filter((p) => {
    if (f.soloExistencia) {
      const n = stockDe(p);
      if (n == null || n <= 0) return false;
    }
    if (min != null || max != null) {
      const precio = precioPublico(p, tipoCambio);
      if (precio == null) return false;
      if (min != null && precio < min) return false;
      if (max != null && precio > max) return false;
    }
    return true;
  });
};

/** Texto de precio para la lista: «Bajo cotización» cuando el proveedor no lo publica. */
export const precioTexto = (
  p: SyscomProducto,
  formatear: (p: SyscomProducto) => string,
): string => (p.precio_bajo_cotizacion ? "Bajo cotización" : formatear(p));

/**
 * HTML del proveedor → párrafos de texto (sin inyectar HTML en la página).
 * Usa DOMParser, que no ejecuta scripts ni carga recursos.
 */
export const htmlAParrafos = (html: string | null | undefined): string[] => {
  const src = (html || "").trim();
  if (!src) return [];
  const doc = new DOMParser().parseFromString(
    src
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/(p|div|li|h[1-6]|tr)\s*>|<br\s*\/?>/gi, "\n"),
    "text/html",
  );
  return (doc.body.textContent || "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
};
