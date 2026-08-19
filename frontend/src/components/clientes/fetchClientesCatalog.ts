import { fetchApi } from "@/config/api";
import type { Cliente } from "@/types/cliente";

/** Lista clientes para buscadores (órdenes, cotizaciones, etc.). */
export async function fetchClientesCatalog(search = "", pageSize = 50): Promise<Cliente[]> {
  const params = new URLSearchParams({
    search: search.trim(),
    page_size: String(pageSize),
  });
  const res = await fetchApi(`/api/clientes/?${params.toString()}`);
  if (!res.ok) {
    throw new Error("No se pudieron cargar los contactos.");
  }
  const data = await res.json().catch(() => ({ results: [] }));
  return Array.isArray(data) ? data : (data.results || []);
}
