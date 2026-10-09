/**
 * Precios del producto manual a partir del costo.
 *
 * La utilidad es un porcentaje sobre el costo (markup):
 *   precio = costo × (1 + utilidad / 100)
 * Los precios se capturan sin IVA; el IVA solo se suma para mostrarlo.
 */

export const IVA_TASA = 0.16;

export const NIVELES_PRECIO = [1, 2, 3, 4] as const;
export type NivelPrecio = (typeof NIVELES_PRECIO)[number];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Número desde el texto del campo; `null` si está vacío o no es válido. */
export function numeroCampo(value: string | null | undefined): number | null {
  const t = String(value ?? "").trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Precio sin IVA para una utilidad dada. `null` si no hay costo. */
export function precioDesdeUtilidad(costo: number | null, utilidad: number | null): number | null {
  if (costo == null || costo <= 0 || utilidad == null) return null;
  return round2(costo * (1 + utilidad / 100));
}

/** Utilidad (%) que deja un precio. `null` si no hay costo. */
export function utilidadDesdePrecio(costo: number | null, precio: number | null): number | null {
  if (costo == null || costo <= 0 || precio == null) return null;
  return round2((precio / costo - 1) * 100);
}

export function conIva(precio: number | null): number | null {
  return precio == null ? null : round2(precio * (1 + IVA_TASA));
}

/** Texto para el campo: dos decimales en dinero, sin ceros sobrantes en porcentaje. */
export const textoDinero = (n: number | null) => (n == null ? "" : n.toFixed(2));
export const textoPorcentaje = (n: number | null) => (n == null ? "" : String(round2(n)));
