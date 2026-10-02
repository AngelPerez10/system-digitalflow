/** `/api/clientes/`: búsqueda, alta, edición y baja de clientes. */
import { fetchApi } from "@/config/api";
import type { Cliente } from "@/types/cliente";
import { unwrapList } from "./http";

/** Lista clientes para buscadores (órdenes, cotizaciones, pólizas…), sin duplicados visuales. */
export async function fetchClientesCatalog(search = "", pageSize = 50, signal?: AbortSignal): Promise<Cliente[]> {
  const params = new URLSearchParams({ search: search.trim(), page_size: String(pageSize) });
  const res = await fetchApi(`/api/clientes/?${params.toString()}`, { signal });
  if (!res.ok) throw new Error("No se pudieron cargar los contactos.");
  const data: unknown = await res.json().catch(() => null);
  return dedupeClientesByIdentity(unwrapList<Cliente>(data));
}

/**
 * Colapsa clientes duplicados (mismo nombre + teléfono, distinto id) para que
 * los buscadores no repitan la misma fila varias veces — la causa real es
 * data duplicada en la BD, pero mientras se limpia, aquí no debe confundir.
 */
function dedupeClientesByIdentity(rows: Cliente[]): Cliente[] {
  const seen = new Set<string>();
  const result: Cliente[] = [];
  for (const c of rows) {
    const nombre = String(c.nombre || "").trim().toLowerCase();
    const telefono = String(c.telefono || c.celular || "").replace(/\D/g, "");
    const key = `${nombre}::${telefono}`;
    if (nombre && seen.has(key)) continue;
    if (nombre) seen.add(key);
    result.push(c);
  }
  return result;
}

/** Búsqueda corta (posibles duplicados). Silenciosa: ante error devuelve `[]`. */
export async function searchClientes(query: string, signal?: AbortSignal, pageSize = 5): Promise<Cliente[]> {
  const params = new URLSearchParams({ search: query, page_size: String(pageSize) });
  const res = await fetchApi(`/api/clientes/?${params.toString()}`, { signal });
  if (!res.ok) return [];
  return unwrapList<Cliente>(await res.json().catch(() => null));
}

/** Resultado de guardar: el formulario necesita el status y el cuerpo crudo para mapear errores por campo. */
export type SaveClienteResult = { ok: true; cliente: Cliente } | { ok: false; status: number; body: string };

/**
 * Crea (POST) o actualiza (PATCH: solo los campos enviados) un cliente.
 * Lanza solo ante fallas de red; los errores HTTP vienen en el resultado.
 */
export async function saveCliente(id: number | null, payload: Record<string, unknown>): Promise<SaveClienteResult> {
  const res = await fetchApi(id ? `/api/clientes/${id}/` : "/api/clientes/", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false, status: res.status, body: await res.text().catch(() => "") };
  const cliente = (await res.json().catch(() => null)) as Cliente | null;
  if (!cliente?.id) return { ok: false, status: 0, body: "" };
  return { ok: true, cliente };
}

/** Elimina un cliente. Devuelve el resultado HTTP para que la vista explique el error. */
export async function deleteCliente(id: number): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const res = await fetchApi(`/api/clientes/${id}/`, { method: "DELETE" });
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, body: await res.text().catch(() => "") };
}
