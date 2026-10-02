import { fetchApi } from "@/config/api";
import type { Cliente } from "@/types/cliente";

/** Lista clientes para buscadores (órdenes, cotizaciones, etc.). */
export async function fetchClientesCatalog(
  search = "",
  pageSize = 50,
  signal?: AbortSignal
): Promise<Cliente[]> {
  const params = new URLSearchParams({
    search: search.trim(),
    page_size: String(pageSize),
  });
  const res = await fetchApi(`/api/clientes/?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error("No se pudieron cargar los contactos.");
  }
  const data = await res.json().catch(() => ({ results: [] }));
  const rows: Cliente[] = Array.isArray(data) ? data : (data.results || []);
  return dedupeClientesByIdentity(rows);
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
