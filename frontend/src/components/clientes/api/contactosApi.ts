/** `/api/cliente-contactos/`: libreta de contactos de un cliente. */
import type { ClienteContacto } from "@/types/cliente";
import { contactoPrincipalFromForm, type ClienteContactoInput } from "../domain/clienteContacto";
import type { ClienteFormData } from "../domain/clienteFormData";
import { requestJson, unwrapList } from "./http";

const BASE = "/api/cliente-contactos/";

export async function listClienteContactos(clienteId: number, signal?: AbortSignal): Promise<ClienteContacto[]> {
  const params = new URLSearchParams({ cliente: String(clienteId) });
  const data = await requestJson<unknown>(`${BASE}?${params.toString()}`, {
    signal,
    fallbackError: "No se pudieron cargar los contactos.",
  });
  return unwrapList<ClienteContacto>(data);
}

export const createClienteContacto = (clienteId: number, input: ClienteContactoInput) =>
  requestJson<ClienteContacto>(BASE, {
    method: "POST",
    body: { cliente: clienteId, ...input },
    fallbackError: "No se pudo guardar el contacto.",
  });

export const updateClienteContacto = (id: number, input: ClienteContactoInput) =>
  requestJson<ClienteContacto>(`${BASE}${id}/`, {
    method: "PATCH",
    body: input,
    fallbackError: "No se pudo actualizar el contacto.",
  });

export const deleteClienteContacto = (id: number) =>
  requestJson<void>(`${BASE}${id}/`, { method: "DELETE", fallbackError: "No se pudo eliminar el contacto." });

/**
 * Crea o actualiza el contacto principal capturado en el formulario del
 * cliente. No hace nada si el formulario no trae nombre de contacto.
 */
export async function upsertContactoPrincipal(clienteId: number, formData: ClienteFormData): Promise<void> {
  const input = contactoPrincipalFromForm(formData);
  if (!input) return;
  const contactoId = Number(formData.contacto_id);
  if (Number.isFinite(contactoId) && contactoId > 0) await updateClienteContacto(contactoId, input);
  else await createClienteContacto(clienteId, input);
}
