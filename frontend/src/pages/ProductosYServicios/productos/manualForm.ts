/** Estado del formulario de producto manual (alta / edición). */
import type { NivelPrecio } from "./precioUtilidad";

export type ManualForm = {
  imagen_url: string;
  producto: string;
  caracteristicas: string;
  marca: string;
  modelo: string;
  sat_key: string;
  stock: string;
  /** Id del contacto proveedor ("" = sin proveedor). */
  proveedor: string;
  /** Cuánto nos costó, sin IVA. */
  costo: string;
  /** Precio 1 (el que usan cotizaciones). */
  precio: string;
  precio_2: string;
  precio_3: string;
  precio_4: string;
  utilidad_1: string;
  utilidad_2: string;
  utilidad_3: string;
  utilidad_4: string;
  aplica_iva: boolean;
};

export const emptyManualForm = (): ManualForm => ({
  imagen_url: "",
  producto: "",
  caracteristicas: "",
  marca: "",
  modelo: "",
  sat_key: "",
  stock: "",
  proveedor: "",
  costo: "",
  precio: "",
  precio_2: "",
  precio_3: "",
  precio_4: "",
  utilidad_1: "",
  utilidad_2: "",
  utilidad_3: "",
  utilidad_4: "",
  aplica_iva: true,
});

export type ProveedorOpcion = { id: number; nombre: string };

type PrecioKey = "precio" | "precio_2" | "precio_3" | "precio_4";
type UtilidadKey = "utilidad_1" | "utilidad_2" | "utilidad_3" | "utilidad_4";
export const precioKey = (n: NivelPrecio): PrecioKey => (n === 1 ? "precio" : (`precio_${n}` as PrecioKey));
export const utilidadKey = (n: NivelPrecio): UtilidadKey => `utilidad_${n}` as UtilidadKey;
