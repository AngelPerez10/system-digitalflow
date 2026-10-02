import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  parseClientesListQuery,
  writeClientesListQuery,
  type ClientesListQuery,
} from "../shared/clientesListQuery";

/**
 * Estado del listado guardado en la URL: se puede compartir, recargar y usar
 * «Atrás» sin perder búsqueda, filtros, orden ni página.
 *
 * Cambiar búsqueda, tipo u orden regresa a la página 1. Los cambios de filtro
 * usan `replace` (no llenan el historial); los cambios de página sí apilan.
 */
export function useClientesQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseClientesListQuery(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<ClientesListQuery>, opts: { push?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const current = parseClientesListQuery(prev);
          const resetsPage = "q" in patch || "tipos" in patch || "orden" in patch;
          const next = { ...current, ...(resetsPage ? { page: 1 } : null), ...patch };
          return writeClientesListQuery(prev, next);
        },
        { replace: !opts.push },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback((page: number) => update({ page }, { push: true }), [update]);

  return { query, update, setPage };
}
