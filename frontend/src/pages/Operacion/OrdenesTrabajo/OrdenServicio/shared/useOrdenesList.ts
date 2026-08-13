import { useCallback, useMemo, useRef, useState } from "react";
import { fetchApi } from "@/config/api";
import {
  computeOrdenStats,
  getCurrentYearMonth,
  type Orden,
  type Usuario,
} from "./ordenesPageTypes";
import { normalizeStatus } from "./ordenesPageUtils";
import {
  EMPTY_ALERT,
  ORDENES_PAGE_INIT_THROTTLE_MS,
  ordenMatchesSearch,
  type AlertState,
  type AlertVariant,
} from "./useOrdenesShared";

// variant admin: stats include estrella; shownList sorts fecha_inicio then fecha_creacion.
// variant tecnico: stats omit estrella (includeEstrella: false); shownList sorts
//   fecha_creacion||fecha_inicio. Init/throttle stay in each page (shared module var below).

export type OrdenesListVariant = "admin" | "tecnico";

export type OrdenListFilterStatus = "" | "pendiente" | "resuelto";

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
  const [searchTerm, setSearchTerm] = useState("");
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
    const mes = selectedMonth || getCurrentYearMonth();
    const hadCache = monthCacheRef.current.has(mes);
    try {
      if (!canView) {
        if (generation === fetchGenerationRef.current) {
          setOrdenes([]);
          setLoadedMonth(null);
          setLoading(false);
        }
        return;
      }

      // Con cache: no vaciar ni mostrar banner; refrescar en segundo plano.
      if (!hadCache) {
        setLoading(true);
      }

      const params = new URLSearchParams({
        mes,
        _ts: String(Date.now()),
      });
      const response = await fetchApi(`/api/ordenes/?${params.toString()}`, {
        cache: "no-store" as RequestCache,
      });

      if (generation !== fetchGenerationRef.current) return;

      if (response.ok) {
        const data = await response.json();
        if (generation !== fetchGenerationRef.current) return;

        const rows = Array.isArray(data)
          ? data
          : Array.isArray((data as { results?: unknown })?.results)
            ? (data as { results: Orden[] }).results
            : [];

        const logLabel = variant === "admin" ? "OrdenesPage" : "OrdenesTecnicoPage";
        console.debug(
          `[${logLabel}] fetchOrdenes mes=${mes} count=${rows.length}`,
        );
        monthCacheRef.current.set(mes, rows);
        setOrdenes(rows);
        setLoadedMonth(mes);

        // Prefetch del mes anterior para que “atrás” sea instantáneo.
        const [yStr, mStr] = mes.split("-");
        const y = Number(yStr);
        const m = Number(mStr);
        if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
          const prev = new Date(y, m - 2, 1);
          const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
          if (!monthCacheRef.current.has(prevKey)) {
            void (async () => {
              try {
                const pref = new URLSearchParams({ mes: prevKey, _ts: String(Date.now()) });
                const prefRes = await fetchApi(`/api/ordenes/?${pref.toString()}`, {
                  cache: "no-store" as RequestCache,
                });
                if (!prefRes.ok) return;
                const prefData = await prefRes.json();
                const prefRows = Array.isArray(prefData)
                  ? prefData
                  : Array.isArray((prefData as { results?: unknown })?.results)
                    ? (prefData as { results: Orden[] }).results
                    : [];
                if (!monthCacheRef.current.has(prevKey)) {
                  monthCacheRef.current.set(prevKey, prefRows);
                }
              } catch {
                /* prefetch best-effort */
              }
            })();
          }
        }
      } else if (response.status === 401) {
        console.error("Token inválido o expirado");
        if (!hadCache) {
          setOrdenes([]);
          setLoadedMonth(null);
        }
      } else if (response.status === 403) {
        console.error("Acceso prohibido");
        if (!hadCache) {
          setOrdenes([]);
          setLoadedMonth(null);
        }
      } else {
        console.error("Error al cargar órdenes:", response.status);
        if (!hadCache) {
          setOrdenes([]);
          setLoadedMonth(null);
        }
      }
    } catch (error) {
      if (generation !== fetchGenerationRef.current) return;
      console.error("Error al cargar órdenes:", error);
      if (!monthCacheRef.current.has(mes)) {
        setOrdenes([]);
        setLoadedMonth(null);
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [canView, variant, selectedMonth]);

  /** Cambia de mes: usa cache si existe (instantáneo) o muestra loading. */
  const selectMonth = useCallback((mes: string) => {
    const next = (mes || "").trim() || getCurrentYearMonth();
    fetchGenerationRef.current += 1;
    const cached = monthCacheRef.current.get(next);
    setSelectedMonth(next);
    if (cached) {
      setOrdenes(cached);
      setLoadedMonth(next);
      setLoading(false);
    } else {
      setOrdenes([]);
      setLoadedMonth(null);
      setLoading(true);
    }
  }, []);

  const shownList = useMemo(() => {
    if (!Array.isArray(ordenes)) return [];
    // Mientras el mes pedido no coincide con el cargado, no pintar filas (evita mes anterior
    // o “Sin órdenes” falso). El banner de loading cubre este estado.
    const mesPedido = selectedMonth || getCurrentYearMonth();
    if (loadedMonth !== mesPedido) return [];

    const q = (searchTerm || "").trim().toLowerCase();
    const list = ordenes.filter((o) => {
      if (!ordenMatchesSearch(o, q, usuarios)) return false;
      return ordenPassesListFilters(o, {
        status: filterStatus,
        servicio: filterServicio,
        date: filterDate,
        tecnicoId: filterTecnicoId,
      });
    });

    const toTs = (v: unknown) => {
      if (!v) return 0;
      const t = Date.parse(String(v));
      return Number.isFinite(t) ? t : 0;
    };

    return list.slice().sort((a, b) => {
      if (variant === "admin") {
        const ai = toTs(a.fecha_inicio) || 0;
        const bi = toTs(b.fecha_inicio) || 0;
        if (bi !== ai) return bi - ai;
        const ac = toTs(a.fecha_creacion) || 0;
        const bc = toTs(b.fecha_creacion) || 0;
        if (bc !== ac) return bc - ac;
      } else {
        const at = toTs(a.fecha_creacion || a.fecha_inicio) || 0;
        const bt = toTs(b.fecha_creacion || b.fecha_inicio) || 0;
        if (bt !== at) return bt - at;
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [
    ordenes,
    loadedMonth,
    selectedMonth,
    searchTerm,
    filterStatus,
    filterServicio,
    filterDate,
    filterTecnicoId,
    usuarios,
    variant,
  ]);

  const monthLoading =
    loading || loadedMonth !== (selectedMonth || getCurrentYearMonth());

  const statsMonthKey = selectedMonth || getCurrentYearMonth();
  const stats = useMemo(
    () =>
      computeOrdenStats(
        ordenes,
        statsMonthKey,
        variant === "tecnico" ? { includeEstrella: false } : undefined,
      ),
    [ordenes, statsMonthKey, variant],
  );

  const clearListFilters = useCallback(() => {
    setFilterStatus("");
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

  return {
    ordenes,
    setOrdenes,
    loading,
    setLoading,
    monthLoading,
    searchTerm,
    setSearchTerm,
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
    activeFilterCount,
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
