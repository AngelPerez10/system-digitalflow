/**
 * Precio de mercado (SYSCOM/TVC) frente al anterior y al costo de compra,
 * y etiquetas de ubicación. Funciones puras para la tabla, la lista móvil y
 * la ficha.
 */
import type { InventarioItem, InventarioUbicacion } from "./inventarioTypes";

export const UBICACION_LABEL: Record<InventarioUbicacion, string> = {
  exhibicion: "Exhibición",
  almacen: "Almacén",
};

export const UBICACIONES: InventarioUbicacion[] = ["exhibicion", "almacen"];

const toNumber = (v: string | number | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const formatMxn = (v: string | number | null | undefined): string | null => {
  const n = toNumber(v);
  return n == null ? null : n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

export type Tendencia = "sube" | "baja" | "igual";

export type PrecioMercadoInfo = {
  /** Precio actual del proveedor. */
  mercado: number | null;
  /** Costo de la última compra (factura / catálogo al dar de alta). */
  costo: number | null;
  /** Cambio respecto a la consulta anterior del proveedor. */
  tendencia: Tendencia | null;
  /** Variación porcentual respecto al precio de mercado anterior (p. ej. 5.2). */
  variacionPct: number | null;
  /** Cuánto está el mercado por encima (+) o por debajo (−) del costo, en %. */
  vsCostoPct: number | null;
};

const pct = (actual: number, base: number) => (base > 0 ? ((actual - base) / base) * 100 : null);

export const precioMercadoInfo = (
  item: Pick<InventarioItem, "precio_mercado" | "precio_mercado_anterior" | "precio_unitario">,
): PrecioMercadoInfo => {
  const mercado = toNumber(item.precio_mercado);
  const anterior = toNumber(item.precio_mercado_anterior);
  const costo = toNumber(item.precio_unitario);

  let tendencia: Tendencia | null = null;
  let variacionPct: number | null = null;
  if (mercado != null && anterior != null) {
    variacionPct = pct(mercado, anterior);
    tendencia = mercado > anterior ? "sube" : mercado < anterior ? "baja" : "igual";
  }
  return {
    mercado,
    costo,
    tendencia,
    variacionPct,
    vsCostoPct: mercado != null && costo != null ? pct(mercado, costo) : null,
  };
};

export const formatPct = (v: number | null) =>
  v == null ? "" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;

export const esDeProveedor = (item: Pick<InventarioItem, "fuente">) =>
  item.fuente === "syscom" || item.fuente === "tvc";
