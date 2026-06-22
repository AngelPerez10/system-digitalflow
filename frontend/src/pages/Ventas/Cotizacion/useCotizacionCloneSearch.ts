import { useCallback, useEffect, useState } from "react";

import { searchCotizacionesForClone } from "./cotizacionApi";
import type { CloneCotizacionRow } from "./cotizacionFormTypes";

type UseCotizacionCloneSearchOptions = {
  canSearch: boolean;
  isOpen: boolean;
};

export function useCotizacionCloneSearch({ canSearch, isOpen }: UseCotizacionCloneSearchOptions) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<CloneCotizacionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setRows([]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isOpen || !canSearch) return;
    if (debouncedSearch.length < 1) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    searchCotizacionesForClone(debouncedSearch)
      .then((nextRows) => {
        if (!cancelled) setRows(nextRows);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canSearch, debouncedSearch, isOpen]);

  return {
    cloneListLoading: isLoading,
    cloneRows: rows,
    cloneSearch: search,
    cloneSearchDebounced: debouncedSearch,
    resetCloneSearch: reset,
    setCloneSearch: setSearch,
  };
}
