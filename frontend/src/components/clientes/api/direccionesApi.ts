/** `/api/cliente-direcciones/`: libreta de direcciones (sucursales) de un cliente. */
import type { ClienteDireccion } from "@/types/cliente";
import {
  direccionInputFromFormData,
  hasAnyAddressData,
  type ClienteDireccionInput,
} from "../domain/clienteDireccion";
import type { ClienteFormData } from "../domain/clienteFormData";
import { requestJson, unwrapList } from "./http";

const BASE = "/api/cliente-direcciones/";

export async function listClienteDirecciones(clienteId: number, signal?: AbortSignal): Promise<ClienteDireccion[]> {
  const params = new URLSearchParams({ cliente: String(clienteId) });
  const data = await requestJson<unknown>(`${BASE}?${params.toString()}`, {
    signal,
    fallbackError: "No se pudieron cargar las direcciones.",
  });
  return unwrapList<ClienteDireccion>(data);
}

export const createClienteDireccion = (clienteId: number, input: ClienteDireccionInput) =>
  requestJson<ClienteDireccion>(BASE, {
    method: "POST",
    body: { cliente: clienteId, ...input },
    fallbackError: "No se pudo guardar la dirección.",
  });

export const updateClienteDireccion = (id: number, input: ClienteDireccionInput) =>
  requestJson<ClienteDireccion>(`${BASE}${id}/`, {
    method: "PATCH",
    body: input,
    fallbackError: "No se pudo actualizar la dirección.",
  });

export const deleteClienteDireccion = (id: number) =>
  requestJson<void>(`${BASE}${id}/`, { method: "DELETE", fallbackError: "No se pudo eliminar la dirección." });

/**
 * Siembra la dirección principal de un cliente recién creado en su libreta.
 * No lanza: devuelve `false` si falló (el cliente ya quedó guardado y la
 * dirección se puede agregar desde la libreta), para avisarlo al usuario.
 */
export async function seedPrincipalDireccion(clienteId: number, formData: ClienteFormData): Promise<boolean> {
  if (!hasAnyAddressData(formData)) return true;
  try {
    await createClienteDireccion(clienteId, direccionInputFromFormData(formData));
    return true;
  } catch {
    return false;
  }
}
