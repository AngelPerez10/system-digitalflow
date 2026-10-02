import { fetchApi } from "@/config/api";
import type { ClienteContacto } from "@/types/cliente";
import { formatApiErrors } from "./clienteFormShared";

export type ClienteContactoInput = {
  nombre_apellido: string;
  titulo: string;
  area_puesto: string;
  celular: string;
  correo: string;
  is_principal: boolean;
};

function unwrapList(data: unknown): ClienteContacto[] {
  if (Array.isArray(data)) return data as ClienteContacto[];
  const results = (data as { results?: ClienteContacto[] } | null)?.results;
  return Array.isArray(results) ? results : [];
}

export async function listClienteContactos(clienteId: number): Promise<ClienteContacto[]> {
  const res = await fetchApi(`/api/cliente-contactos/?cliente=${clienteId}`, {
    cache: "no-store" as RequestCache,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return [];
  return unwrapList(data);
}

export async function createClienteContacto(
  clienteId: number,
  input: ClienteContactoInput
): Promise<ClienteContacto> {
  const res = await fetchApi("/api/cliente-contactos/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cliente: clienteId, ...input }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || "No se pudo guardar el contacto.");
  }
  return res.json();
}

export async function updateClienteContacto(
  id: number,
  input: ClienteContactoInput
): Promise<ClienteContacto> {
  const res = await fetchApi(`/api/cliente-contactos/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || "No se pudo actualizar el contacto.");
  }
  return res.json();
}

export async function deleteClienteContacto(id: number): Promise<void> {
  const res = await fetchApi(`/api/cliente-contactos/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || "No se pudo eliminar el contacto.");
  }
}

export const emptyClienteContactoInput = (overrides?: Partial<ClienteContactoInput>): ClienteContactoInput => ({
  nombre_apellido: "",
  titulo: "",
  area_puesto: "",
  celular: "",
  correo: "",
  is_principal: false,
  ...overrides,
});
