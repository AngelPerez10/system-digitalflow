import { fetchApi } from "@/config/api";
import type { ClienteDireccion } from "@/types/cliente";
import { formatApiErrors } from "./clienteFormShared";

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

function unwrapList(data: unknown): ClienteDireccion[] {
  if (Array.isArray(data)) return data as ClienteDireccion[];
  const results = (data as { results?: ClienteDireccion[] } | null)?.results;
  return Array.isArray(results) ? results : [];
}

export async function listClienteDirecciones(clienteId: number): Promise<ClienteDireccion[]> {
  const res = await fetchApi(`/api/cliente-direcciones/?cliente=${clienteId}`, {
    cache: "no-store" as RequestCache,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return [];
  return unwrapList(data);
}

export async function createClienteDireccion(
  clienteId: number,
  input: ClienteDireccionInput
): Promise<ClienteDireccion> {
  const res = await fetchApi("/api/cliente-direcciones/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cliente: clienteId, ...input }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || "No se pudo guardar la dirección.");
  }
  return res.json();
}

export async function updateClienteDireccion(
  id: number,
  input: ClienteDireccionInput
): Promise<ClienteDireccion> {
  const res = await fetchApi(`/api/cliente-direcciones/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || "No se pudo actualizar la dirección.");
  }
  return res.json();
}

export async function deleteClienteDireccion(id: number): Promise<void> {
  const res = await fetchApi(`/api/cliente-direcciones/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || "No se pudo eliminar la dirección.");
  }
}

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
export function hasAnyAddressData(formData: Record<string, unknown>): boolean {
  return ADDRESS_FORM_FIELD_KEYS.some((k) => String(formData[k] || "").trim());
}

/** Convierte los campos de domicilio del formulario simplificado en el input de la libreta de direcciones. */
export function direccionInputFromFormData(formData: Record<string, unknown>): ClienteDireccionInput {
  return emptyClienteDireccionInput({
    etiqueta: "Principal",
    direccion: String(formData.direccion || ""),
    calle: String(formData.calle || ""),
    numero_exterior: String(formData.numero_exterior || ""),
    interior: String(formData.interior || ""),
    colonia: String(formData.colonia || ""),
    localidad: String(formData.localidad || ""),
    municipio: String(formData.municipio || ""),
    codigo_postal: String(formData.codigo_postal || ""),
    ciudad: String(formData.ciudad || ""),
    pais: String(formData.pais || "México"),
    estado: String(formData.estado || ""),
    is_principal: true,
  });
}

/** Siembra la dirección principal de un cliente recién creado en su libreta de direcciones. */
export async function seedPrincipalDireccion(
  clienteId: number,
  formData: Record<string, unknown>
): Promise<void> {
  if (!hasAnyAddressData(formData)) return;
  try {
    await createClienteDireccion(clienteId, direccionInputFromFormData(formData));
  } catch {
    // No bloquear el guardado del cliente si esto falla; se puede agregar
    // la dirección manualmente desde la libreta al reabrir el registro.
  }
}
