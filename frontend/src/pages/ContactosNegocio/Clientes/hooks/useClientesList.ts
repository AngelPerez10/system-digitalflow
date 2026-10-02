import { useCallback, useEffect, useState } from "react";
import { fetchApi } from "@/config/api";
import type { Cliente } from "@/types/cliente";
import { buildClientesApiParams, type ClientesListQuery } from "../shared/clientesListQuery";

type ListState = {
  rows: Cliente[];
  count: number;
  /** Primera carga (sin datos previos que mostrar). */
  initialLoading: boolean;
  /** Recarga con datos previos en pantalla (se atenúan en lugar de vaciarse). */
  refreshing: boolean;
  error: string | null;
  /** Página que el backend rechazó por no existir (404) y a cuál conviene ir. */
  outOfRange: { page: number; fallbackPage: number } | null;
  /** Última consulta que respondió bien (para saber si una 404 viene de un borrado). */
  okQuery: string | null;
};

const INITIAL: ListState = {
  rows: [],
  count: 0,
  initialLoading: true,
  refreshing: false,
  error: null,
  outOfRange: null,
  okQuery: null,
};

function parseListResponse(data: unknown): { rows: Cliente[]; count: number } {
  if (Array.isArray(data)) return { rows: data as Cliente[], count: data.length };
  const page = data as { results?: unknown; count?: unknown } | null;
  const rows = Array.isArray(page?.results) ? (page.results as Cliente[]) : [];
  const count = typeof page?.count === "number" ? page.count : rows.length;
  return { rows, count };
}

/**
 * Página de contactos para la consulta dada.
 *
 * - Cancela la petición anterior (AbortController) y descarta respuestas
 *   tardías, así una búsqueda vieja nunca pisa a la nueva.
 * - Mientras recarga conserva los renglones actuales (patrón «contenido
 *   viejo atenuado» de React) para no provocar saltos de diseño.
 */
export function useClientesList(query: ClientesListQuery, enabled: boolean) {
  const [state, setState] = useState<ListState>(INITIAL);
  const [reloadKey, setReloadKey] = useState(0);
  const apiQuery = buildClientesApiParams(query).toString();
  const page = query.page;

  useEffect(() => {
    if (!enabled) {
      setState({ ...INITIAL, initialLoading: false });
      return;
    }
    const controller = new AbortController();
    let ignore = false;
    setState((prev) => ({ ...prev, refreshing: !prev.initialLoading, error: null }));

    (async () => {
      try {
        const res = await fetchApi(`/api/clientes/?${apiQuery}`, { signal: controller.signal });
        const data: unknown = await res.json().catch(() => null);
        if (ignore) return;
        // DRF responde 404 a una página que ya no existe. Si esta misma consulta
        // ya había respondido bien, se vació por un borrado: basta retroceder una
        // página. Si no (enlace viejo), lo seguro es ir a la primera.
        if (res.status === 404 && page > 1) {
          setState((prev) => ({
            ...prev,
            initialLoading: false,
            refreshing: false,
            outOfRange: { page, fallbackPage: prev.okQuery === apiQuery ? page - 1 : 1 },
          }));
          return;
        }
        if (!res.ok) {
          setState((prev) => ({
            ...prev,
            initialLoading: false,
            refreshing: false,
            error: res.status === 403 ? "No tienes permiso para ver este listado." : "No se pudo cargar el listado.",
          }));
          return;
        }
        const { rows, count } = parseListResponse(data);
        setState({ rows, count, initialLoading: false, refreshing: false, error: null, outOfRange: null, okQuery: apiQuery });
      } catch {
        if (ignore) return;
        setState((prev) => ({
          ...prev,
          initialLoading: false,
          refreshing: false,
          error: "Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.",
        }));
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [apiQuery, page, enabled, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Derivado de la página actual: deja de aplicar en cuanto la página cambia.
  const redirectPage = state.outOfRange?.page === page ? state.outOfRange.fallbackPage : null;
  const { rows, count, initialLoading, refreshing, error } = state;
  return { rows, count, initialLoading, refreshing, error, redirectPage, reload };
}
