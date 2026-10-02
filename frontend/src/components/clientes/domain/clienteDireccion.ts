/**
 * Direcciones de un cliente (libreta de sucursales): borrador editable,
 * resúmenes legibles y conversión desde el formulario. Puro.
 */
import type { ClienteDireccion } from "@/types/cliente";
import type { ClienteFormData } from "./clienteFormData";

export type ClienteDireccionInput = {
  etiqueta: string;
  direccion: string;
  calle: string;
  numero_exterior: string;
  interior: string;
  colonia: string;
  localidad: string;
  municipio: string;
  codigo_postal: string;
  ciudad: string;
  pais: string;
  estado: string;
  is_principal: boolean;
};

export const emptyClienteDireccionInput = (overrides?: Partial<ClienteDireccionInput>): ClienteDireccionInput => ({
  etiqueta: "",
  direccion: "",
  calle: "",
  numero_exterior: "",
  interior: "",
  colonia: "",
  localidad: "",
  municipio: "",
  codigo_postal: "",
  ciudad: "",
  pais: "México",
  estado: "",
  is_principal: false,
  ...overrides,
});

export const direccionToInput = (d: ClienteDireccion): ClienteDireccionInput => ({
  etiqueta: d.etiqueta,
  direccion: d.direccion,
  calle: d.calle,
  numero_exterior: d.numero_exterior,
  interior: d.interior,
  colonia: d.colonia,
  localidad: d.localidad,
  municipio: d.municipio,
  codigo_postal: d.codigo_postal,
  ciudad: d.ciudad,
  pais: d.pais,
  estado: d.estado,
  is_principal: d.is_principal,
});

type DireccionResumible = Pick<ClienteDireccion, "calle" | "numero_exterior" | "colonia" | "ciudad" | "estado" | "direccion">;

/** Resumen legible de una dirección de la libreta (calle / colonia / ciudad). */
export function direccionResumen(d: DireccionResumible): string {
  const linea1 = [d.calle, d.numero_exterior].filter(Boolean).join(" ");
  const linea2 = [d.colonia, d.ciudad, d.estado].filter(Boolean).join(", ");
  const resumen = [linea1, linea2].filter(Boolean).join(" — ");
  if (resumen) return resumen;
  return String(d.direccion || "").trim() || "Sin datos capturados";
}

/**
 * Valor a copiar en `Orden.direccion` al elegir una sucursal: la referencia
 * capturada (liga de Maps o texto libre) o, si no hay, el resumen estructurado.
 */
export function direccionParaOrden(d: DireccionResumible): string {
  const raw = String(d.direccion || "").trim();
  if (raw) return raw;
  const resumen = direccionResumen(d);
  return resumen === "Sin datos capturados" ? "" : resumen;
}

const ADDRESS_FORM_FIELD_KEYS = [
  "direccion",
  "calle",
  "numero_exterior",
  "interior",
  "colonia",
  "localidad",
  "municipio",
  "codigo_postal",
  "ciudad",
  "estado",
] as const;

/** true si el formulario trae al menos un dato de domicilio capturado. */
export function hasAnyAddressData(formData: ClienteFormData): boolean {
  return ADDRESS_FORM_FIELD_KEYS.some((k) => String(formData[k] || "").trim());
}

/** Domicilio del formulario simplificado → dirección «Principal» de la libreta. */
export function direccionInputFromFormData(formData: ClienteFormData): ClienteDireccionInput {
  const str = (k: string) => String(formData[k] || "");
  return emptyClienteDireccionInput({
    etiqueta: "Principal",
    direccion: str("direccion"),
    calle: str("calle"),
    numero_exterior: str("numero_exterior"),
    interior: str("interior"),
    colonia: str("colonia"),
    localidad: str("localidad"),
    municipio: str("municipio"),
    codigo_postal: str("codigo_postal"),
    ciudad: str("ciudad"),
    pais: String(formData.pais || "México"),
    estado: str("estado"),
    is_principal: true,
  });
}
