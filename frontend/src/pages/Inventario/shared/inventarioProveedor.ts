import type { InventarioFuente, InventarioItem, InventarioItemPatch } from "./inventarioTypes";

export const SIN_PROVEEDOR_LABEL = "Sin proveedor";

function fuenteLabel(fuente: InventarioFuente): string {
  if (fuente === "syscom") return "SYSCOM";
  if (fuente === "tvc") return "TVC";
  return "";
}

/**
 * A quién se le compró. Orden: «Sin proveedor» marcado a mano → contacto
 * proveedor → SYSCOM/TVC si solo hay vínculo de catálogo (ítems anteriores).
 */
export function proveedorVisible(item: InventarioItem): string {
  if (item.sin_proveedor) return SIN_PROVEEDOR_LABEL;
  const nombre = (item.proveedor_nombre ?? "").trim();
  if (nombre) return nombre;
  return fuenteLabel(item.fuente);
}

/** Tono de la píldora: el de SYSCOM/TVC solo cuando el proveedor mostrado es ese. */
export function proveedorBadgeFuente(item: InventarioItem): InventarioFuente {
  if (item.sin_proveedor) return "desconocido";
  if (item.fuente !== "syscom" && item.fuente !== "tvc") return "desconocido";
  const nombre = (item.proveedor_nombre ?? "").trim();
  if (!nombre || nombre.toUpperCase() === fuenteLabel(item.fuente)) return item.fuente;
  return "desconocido";
}

/* ---------- Selector de la ficha ---------- */

export type ProveedorModo = "catalogo" | "intrax" | "sin" | "otro";
export type ProveedorSeleccion = { modo: ProveedorModo; otroId: string };

const INTRAX = "intrax";

export function esIntrax(nombre: string | null | undefined): boolean {
  return (nombre ?? "").trim().toLowerCase() === INTRAX;
}

export function seleccionDesdeItem(item: InventarioItem): ProveedorSeleccion {
  if (item.sin_proveedor) return { modo: "sin", otroId: "" };
  if (item.proveedor != null && esIntrax(item.proveedor_nombre)) return { modo: "intrax", otroId: "" };
  if (item.proveedor != null) return { modo: "otro", otroId: String(item.proveedor) };
  return { modo: "catalogo", otroId: "" };
}

export function mismaSeleccion(a: ProveedorSeleccion, b: ProveedorSeleccion): boolean {
  return a.modo === b.modo && (a.modo !== "otro" || a.otroId === b.otroId);
}

/** Cambios a enviar; «Otro» sin contacto elegido no toca el proveedor guardado. */
export function patchDesdeSeleccion(sel: ProveedorSeleccion): InventarioItemPatch {
  switch (sel.modo) {
    case "intrax":
      return { proveedor_intrax: true, sin_proveedor: false };
    case "sin":
      return { proveedor: null, sin_proveedor: true };
    case "otro":
      return sel.otroId ? { proveedor: Number(sel.otroId), sin_proveedor: false } : {};
    default:
      return { proveedor: null, sin_proveedor: false };
  }
}


/* ---------- Píldora del listado ---------- */

export type ProveedorTipo = "intrax" | "sin" | "syscom" | "tvc" | "contacto" | "ninguno";

/** Qué clase de proveedor se muestra (define ícono y tono de la píldora). */
export function proveedorTipo(item: InventarioItem): ProveedorTipo {
  if (item.sin_proveedor) return "sin";
  const nombre = (item.proveedor_nombre ?? "").trim();
  if (nombre && esIntrax(nombre)) return "intrax";
  const tono = proveedorBadgeFuente(item);
  if (tono === "syscom" || tono === "tvc") return tono;
  return nombre ? "contacto" : "ninguno";
}
