import type { Cliente } from "@/types/cliente";

export type ClienteSelectOption = { value: string; label: string };

const TIPO_CONTACTO: Record<string, string> = {
  EMPRESA: "Empresa",
  PERSONA_FISICA: "Persona",
  PROVEEDOR: "Proveedor",
};

export function clienteToSelectOption(cliente: Pick<Cliente, "id" | "nombre" | "tipo">): ClienteSelectOption {
  const tipo = TIPO_CONTACTO[String(cliente.tipo || "").trim()] || "";
  const nombre = String(cliente.nombre || "").trim() || `Cliente ${cliente.id}`;
  return {
    value: String(cliente.id),
    label: tipo ? `${nombre} · ${tipo}` : nombre,
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
