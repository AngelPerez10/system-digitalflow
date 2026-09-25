import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchOrdenesMes, fetchOrdenesSearch, OrdenesFetchError } from "./ordenesFetch";
import {
  computeOrdenStats,
  getCurrentYearMonth,
  type Orden,
  type Usuario,
} from "./ordenesPageTypes";
import { normalizeStatus } from "./ordenesPageUtils";
import { sortOrdenesByFolio } from "./ordenFolioSort";
import {
  EMPTY_ALERT,
  ORDENES_PAGE_INIT_THROTTLE_MS,
  ordenMatchesSearch,
  type AlertState,
  type AlertVariant,
} from "./useOrdenesShared";

/** Mínimo de caracteres para buscar en todos los meses (alineado con el API). */
export const ORDENES_GLOBAL_SEARCH_MIN = 2;
const SEARCH_DEBOUNCE_MS = 300;

// variant admin: stats include estrella; shownList sorts by folio (idx desc).
// variant tecnico: stats omit estrella (includeEstrella: false); same folio sort.
// Init/throttle stay in each page (shared module var below).

export type OrdenesListVariant = "admin" | "tecnico";

export type OrdenListFilterStatus = "" | "pendiente" | "pausado" | "resuelto" | "cancelada";

export type OrdenListFilters = {
  status: OrdenListFilterStatus;
  servicio: string[];
  date: string;
  /** `null` = todos; `0` = sin técnico asignado; id > 0 = técnico concreto. */
  tecnicoId: number | null;
};

export function ordenPassesListFilters(orden: Orden, filters: OrdenListFilters): boolean {
  if (filters.status && normalizeStatus(orden.status) !== normalizeStatus(filters.status)) {
    return false;
  }
  if (filters.servicio.length > 0) {
    const ordenServicios = Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : [];
    if (!filters.servicio.every((sel) => ordenServicios.includes(sel))) return false;
  }
  if (filters.date) {
    const base = (orden.fecha_inicio || orden.fecha_creacion || "").toString();
    if (!base.startsWith(filters.date)) return false;
  }
  if (filters.tecnicoId != null) {
    const assigned =
      orden.tecnico_asignado != null && Number.isFinite(Number(orden.tecnico_asignado))
        ? Number(orden.tecnico_asignado)
        : null;
    if (filters.tecnicoId === 0) {
      if (assigned != null) return false;
    } else if (assigned !== filters.tecnicoId) {
      return false;
    }
  }
  return true;
}

export function countActiveListFilters(filters: OrdenListFilters): number {
  let n = 0;
  if (filters.status) n += 1;
  if (filters.servicio.length > 0) n += 1;
  if (filters.date) n += 1;
  if (filters.tecnicoId != null) n += 1;
  return n;
}

/** Filtros del popover (sin estado: el estado vive en la barra segmentada del listado). */
export function countSecondaryListFilters(filters: OrdenListFilters): number {
  let n = 0;
  if (filters.servicio.length > 0) n += 1;
  if (filters.date) n += 1;
  if (filters.tecnicoId != null) n += 1;
  return n;
}

export type OrdenStatusCountKey = "pendiente" | "pausado" | "resuelto" | "cancelada";

export function ordenStatusCountKey(status: unknown): OrdenStatusCountKey {
  const s = normalizeStatus(status);
  if (s === "pausado" || s === "resuelto" || s === "cancelada") return s;
  return "pendiente";
}

/** Shared with page init effects (servicios/usuarios/clientes + fetchOrdenes). */
let ordenesListInitialLoadAt = 0;

export function markOrdenesListInitialLoad(): boolean {
  const now = Date.now();
  if (now - ordenesListInitialLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return false;
  ordenesListInitialLoadAt = now;
  return true;
}

export function useOrdenesList(opts: {
  variant: OrdenesListVariant;
  canView: boolean;
  usuarios?: Usuario[];
}) {
  const { variant, canView, usuarios = [] } = opts;

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTermState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const [filterStatus, setFilterStatus] = useState<OrdenListFilterStatus>("");
  const [filterServicio, setFilterServicio] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterTecnicoId, setFilterTecnicoId] = useState<number | null>(null);
  const [alert, setAlert] = useState<AlertState>(EMPTY_ALERT);

  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Evita que un fetch lento de un mes pise el resultado del mes actual. */
  const fetchGenerationRef = useRef(0);
  /** Cache en memoria por mes (cambio de mes instantáneo al volver). */
  const monthCacheRef = useRef(new Map<string, Orden[]>());
  /** Mes cuyo payload está en `ordenes` (null = aún no hay datos para el mes pedido). */
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  /** Query cuyo resultado global está en `ordenes` (modo búsqueda todos los meses). */
  const [loadedSearch, setLoadedSearch] = useState<string | null>(null);
  const debouncedSearchRef = useRef(debouncedSearch);
  debouncedSearchRef.current = debouncedSearch;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  const searchActive = debouncedSearch.length >= ORDENES_GLOBAL_SEARCH_MIN;

  const setSearchTerm = useCallback((value: string | ((prev: string) => string)) => {
    setSearchTermState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (next.trim() && !prev.trim()) setFilterStatus("");
      return next;
    });
  }, []);

  const clearAlert = useCallback(() => {
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = null;
    }
    setAlert(EMPTY_ALERT);
  }, []);

  const showAlert = useCallback(
    (alertVariant: AlertVariant, title: string, message: string, ms = 3500) => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      setAlert({ show: true, variant: alertVariant, title, message });
      alertTimerRef.current = setTimeout(() => {
        setAlert((prev) => ({ ...prev, show: false }));
        alertTimerRef.current = null;
      }, ms);
    },
    [],
  );

  const fetchOrdenes = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    const q = debouncedSearch.trim();
    const globalSearch = q.length >= ORDENES_GLOBAL_SEARCH_MIN;
    const mes = selectedMonth || getCurrentYearMonth();
    const withArrastre = mes === getCurrentYearMonth();
    const cacheKey = withArrastre ? `${mes}:arrastre` : mes;
    const hadCache = globalSearch ? false : monthCacheRef.current.has(cacheKey);
    try {
      if (!canView) {
        if (generation === fetchGenerationRef.current) {
          setOrdenes([]);
          setLoadedMonth(null);
          setLoadedSearch(null);
          setLoading(false);
        }
        return;
      }

      if (!hadCache) {
        setLoading(true);
      }

      const logLabel = variant === "admin" ? "OrdenesPage" : "OrdenesTecnicoPage";

      if (globalSearch) {
        const rows = await fetchOrdenesSearch(q);
        if (generation !== fetchGenerationRef.current) return;
        console.debug(`[${logLabel}] fetchOrdenes search=${q} count=${rows.length}`);
        setOrdenes(rows);
        setLoadedMonth(null);
        setLoadedSearch(q);
        return;
      }

      const rows = await fetchOrdenesMes(mes, { arrastreAbiertas: withArrastre });

      if (generation !== fetchGenerationRef.current) return;

      console.debug(
        `[${logLabel}] fetchOrdenes mes=${mes} arrastre=${withArrastre} count=${rows.length}`,
      );
      monthCacheRef.current.set(cacheKey, rows);
      setOrdenes(rows);
      setLoadedMonth(mes);
      setLoadedSearch(null);

      // Prefetch del mes anterior para que “atrás” sea instantáneo (sin arrastre).
      const [yStr, mStr] = mes.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
        const prev = new Date(y, m - 2, 1);
        const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
        if (!monthCacheRef.current.has(prevKey)) {
          void (async () => {
            try {
              const prefRows = await fetchOrdenesMes(prevKey);
              if (!monthCacheRef.current.has(prevKey)) {
                monthCacheRef.current.set(prevKey, prefRows);
              }
            } catch {
              /* prefetch best-effort */
            }
          })();
        }
      }
    } catch (error) {
      if (generation !== fetchGenerationRef.current) return;
      const httpStatus = error instanceof OrdenesFetchError ? error.status : 0;
      if (httpStatus === 401) {
        console.error("Token inválido o expirado");
      } else if (httpStatus === 403) {
        console.error("Acceso prohibido");
      } else {
        console.error("Error al cargar órdenes:", httpStatus || error);
      }
      if (globalSearch) {
        setOrdenes([]);
        setLoadedSearch(null);
      } else if (!monthCacheRef.current.has(cacheKey)) {
        setOrdenes([]);
        setLoadedMonth(null);
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [canView, variant, selectedMonth, debouncedSearch]);

  /** Cambia de mes: usa cache si existe (instantáneo) o muestra loading. */
  const selectMonth = useCallback((mes: string) => {
    const next = (mes || "").trim() || getCurrentYearMonth();
    setSelectedMonth(next);
    // Con búsqueda global el mes solo aplica al limpiar; no pisar resultados.
    if (debouncedSearchRef.current.length >= ORDENES_GLOBAL_SEARCH_MIN) return;

    fetchGenerationRef.current += 1;
    const withArrastre = next === getCurrentYearMonth();
    const cacheKey = withArrastre ? `${next}:arrastre` : next;
    const cached = monthCacheRef.current.get(cacheKey);
    if (cached) {
      setOrdenes(cached);
      setLoadedMonth(next);
      setLoadedSearch(null);
      setLoading(false);
    } else {
      setOrdenes([]);
      setLoadedMonth(null);
      setLoadedSearch(null);
      setLoading(true);
    }
  }, []);

  const sortShownList = useCallback((list: Orden[]) => sortOrdenesByFolio(list), []);

  /** Filas tras búsqueda + filtros secundarios, sin estado (base de conteos del segmento). */
  const rowsBeforeStatus = useMemo(() => {
    if (!Array.isArray(ordenes)) return [];
    const mesPedido = selectedMonth || getCurrentYearMonth();
    if (searchActive) {
      if (loadedSearch !== debouncedSearch) return [];
    } else if (loadedMonth !== mesPedido) {
      return [];
    }

    const q = (searchTerm || "").trim().toLowerCase();
    const list = ordenes.filter((o) => {
      if (!ordenMatchesSearch(o, q, usuarios)) return false;
      return ordenPassesListFilters(o, {
        status: "",
        servicio: filterServicio,
        // La fecha del panel acotaría a un día y contradice “todos los meses”.
        date: searchActive ? "" : filterDate,
        tecnicoId: filterTecnicoId,
      });
    });
    return sortShownList(list);
  }, [
    ordenes,
    loadedMonth,
    loadedSearch,
    selectedMonth,
    searchTerm,
    searchActive,
    debouncedSearch,
    filterServicio,
    filterDate,
    filterTecnicoId,
    usuarios,
    sortShownList,
  ]);

  const statusCounts = useMemo(() => {
    const c: Record<OrdenStatusCountKey, number> = {
      pendiente: 0,
      pausado: 0,
      resuelto: 0,
      cancelada: 0,
    };
    for (const o of rowsBeforeStatus) c[ordenStatusCountKey(o.status)] += 1;
    return c;
  }, [rowsBeforeStatus]);

  const shownList = useMemo(() => {
    if (!filterStatus) return rowsBeforeStatus;
    return rowsBeforeStatus.filter(
      (o) => normalizeStatus(o.status) === normalizeStatus(filterStatus),
    );
  }, [rowsBeforeStatus, filterStatus]);

  const monthLoading = searchActive
    ? loading || loadedSearch !== debouncedSearch
    : loading || loadedMonth !== (selectedMonth || getCurrentYearMonth());

  const statsMonthKey = selectedMonth || getCurrentYearMonth();
  const stats = useMemo(() => {
    const withArrastre = statsMonthKey === getCurrentYearMonth();
    const cacheKey = withArrastre ? `${statsMonthKey}:arrastre` : statsMonthKey;
    const monthRows = searchActive ? monthCacheRef.current.get(cacheKey) ?? [] : ordenes;
    return computeOrdenStats(
      monthRows,
      statsMonthKey,
      variant === "tecnico" ? { includeEstrella: false } : undefined,
    );
  }, [ordenes, statsMonthKey, variant, searchActive]);


  const clearListFilters = useCallback(() => {
    setFilterStatus("");
    setFilterServicio([]);
    setFilterDate("");
    setFilterTecnicoId(null);
  }, []);

  const clearSecondaryFilters = useCallback(() => {
    setFilterServicio([]);
    setFilterDate("");
    setFilterTecnicoId(null);
  }, []);

  const activeFilterCount = useMemo(
    () =>
      countActiveListFilters({
        status: filterStatus,
        servicio: filterServicio,
        date: filterDate,
        tecnicoId: filterTecnicoId,
      }),
    [filterStatus, filterServicio, filterDate, filterTecnicoId],
  );

  const secondaryFilterCount = useMemo(
    () =>
      countSecondaryListFilters({
        status: filterStatus,
        servicio: filterServicio,
        date: filterDate,
        tecnicoId: filterTecnicoId,
      }),
    [filterStatus, filterServicio, filterDate, filterTecnicoId],
  );

  return {
    ordenes,
    setOrdenes,
    loading,
    setLoading,
    monthLoading,
    searchTerm,
    setSearchTerm,
    searchActive,
    debouncedSearch,
    selectedMonth,
    setSelectedMonth,
    selectMonth,
    filterStatus,
    setFilterStatus,
    filterServicio,
    setFilterServicio,
    filterDate,
    setFilterDate,
    filterTecnicoId,
    setFilterTecnicoId,
    clearListFilters,
    clearSecondaryFilters,
    activeFilterCount,
    secondaryFilterCount,
    statusCounts,
    totalBeforeStatus: rowsBeforeStatus.length,
    shownList,
    stats,
    alert,
    setAlert,
    showAlert,
    clearAlert,
    fetchOrdenes,
  };
}

export { ORDENES_PAGE_INIT_THROTTLE_MS };

export type UseOrdenesListReturn = ReturnType<typeof useOrdenesList>;
