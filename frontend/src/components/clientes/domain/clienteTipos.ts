/** Tipos y catálogos base del registro de cliente (sin dependencias). */

export type ClienteTipo = "EMPRESA" | "PERSONA_FISICA" | "PROVEEDOR";

/** Pestañas / pasos del formulario de cliente. */
export type ClienteFormTab = "general" | "contacto" | "more";

export const TIPO_OPTIONS: { value: ClienteTipo; label: string }[] = [
  { value: "EMPRESA", label: "Empresa" },
  { value: "PERSONA_FISICA", label: "Persona física" },
  { value: "PROVEEDOR", label: "Proveedor" },
];
