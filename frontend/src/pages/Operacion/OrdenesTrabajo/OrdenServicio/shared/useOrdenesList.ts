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
    try {
      if (!canView) {
        setOrdenes([]);
        setLoading(false);
        return;
      }

      const mes = selectedMonth || getCurrentYearMonth();
      const params = new URLSearchParams({
        mes,
        _ts: String(Date.now()),
      });
      const response = await fetchApi(`/api/ordenes/?${params.toString()}`, {
        cache: "no-store" as RequestCache,
      });

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data)
          ? data
          : Array.isArray((data as { results?: unknown })?.results)
            ? (data as { results: Orden[] }).results
            : [];

        const logLabel = variant === "admin" ? "OrdenesPage" : "OrdenesTecnicoPage";
        console.debug(
          `[${logLabel}] fetchOrdenes idx:`,
          rows.map((r) => Number(r?.idx || 0)).filter((n) => Number.isFinite(n)),
        );
        setOrdenes(rows);
      } else if (response.status === 401) {
        console.error("Token inválido o expirado");
        setOrdenes([]);
      } else if (response.status === 403) {
        console.error("Acceso prohibido");
        setOrdenes([]);
      } else {
        console.error("Error al cargar órdenes:", response.status);
        setOrdenes([]);
      }
    } catch (error) {
      console.error("Error al cargar órdenes:", error);
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, [canView, variant, selectedMonth]);

  const shownList = useMemo(() => {
    if (!Array.isArray(ordenes)) return [];
    const q = (searchTerm || "").trim().toLowerCase();
    const list = ordenes.filter((o) => {
      if (!ordenMatchesSearch(o, q, usuarios)) return false;
      if (!q && selectedMonth) {
        const month = selectedMonth;
        const fecha = (o.fecha_inicio || o.fecha_creacion || "").toString();
        if (!fecha.startsWith(month)) return false;
      }
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
    searchTerm,
    selectedMonth,
    filterStatus,
    filterServicio,
    filterDate,
    filterTecnicoId,
    usuarios,
    variant,
  ]);

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
    searchTerm,
    setSearchTerm,
    selectedMonth,
    setSelectedMonth,
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
