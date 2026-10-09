import type { Cliente } from "@/types/cliente";

export type ClienteTipoContacto = "Empresa" | "Persona" | "Proveedor";

export type ClienteSelectOption = {
  value: string;
  label: string;
  /** Datos para pintar la fila del combobox; `label` sigue siendo el texto del campo. */
  nombre?: string;
  tipo?: ClienteTipoContacto | "";
  correo?: string;
};

const TIPO_CONTACTO: Record<string, ClienteTipoContacto> = {
  EMPRESA: "Empresa",
  PERSONA_FISICA: "Persona",
  PROVEEDOR: "Proveedor",
};

export function clienteToSelectOption(
  cliente: Pick<Cliente, "id" | "nombre" | "tipo"> & Partial<Pick<Cliente, "correo">>
): ClienteSelectOption {
  const tipo = TIPO_CONTACTO[String(cliente.tipo || "").trim()] || "";
  const nombre = String(cliente.nombre || "").trim() || `Cliente ${cliente.id}`;
  return {
    value: String(cliente.id),
    label: tipo ? `${nombre} · ${tipo}` : nombre,
    nombre,
    tipo,
    correo: String(cliente.correo || "").trim(),
  };
}

export function clienteNombreFromOptionLabel(label: string): string {
  return String(label || "").replace(/ · (Empresa|Persona|Proveedor)$/, "").trim();
}

export function mergeClienteOptions(
  rows: ClienteSelectOption[],
  extra?: ClienteSelectOption | null
): ClienteSelectOption[] {
  if (!extra?.value) return rows;
  if (rows.some((row) => row.value === extra.value)) return rows;
  return [extra, ...rows];
}
