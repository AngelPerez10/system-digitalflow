import PageMeta from "@/components/common/PageMeta";
import { type SyntheticEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import {
  CotizacionPageHeader,
  CotizacionesMobileList,
  CotizacionesTable,
  type CotizacionRow,
} from "@/components/cotizacion/CotizacionesViewParts";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import {
  COTIZACION_LIST_SEARCH_PARAM,
  cotizacionListSearchState,
  readCotizacionListSearch,
  writeCotizacionListSearch,
} from "./shared/cotizacionListNav";
import {
  cardShellClass,
  cotPageCanvasClass,
  cotPageInnerClass,
  cotSansStyle,
  dangerActionBtnClass,
  modalSmallShellClass,
  primaryActionInlineBtnClass,
  secondaryActionBtnClass,
} from "./shared/cotizacionFormStyles";
import { CotizacionExportOverlay } from "./form/CotizacionExportOverlay";
import CotizacionesStatusSegmentFilter from "./list/CotizacionesStatusSegmentFilter";

const searchInputClass =
  "min-h-[44px] w-full rounded-[10px] border border-[#E7E7EA] bg-white py-2 pl-10 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:min-h-[44px] sm:pl-11";

const medioChipClass =
  "border border-[#E7E7EA] bg-[#FAFAFA] text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#cbd5e1]";

const monthNavBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#52525B] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]";

const LIST_PAGE_SIZE = 500;
const SEARCH_DEBOUNCE_MS = 400;

type MonthStats = {
  total: number;
  autorizadas: number;
  pendientes: number;
  canceladas: number;
};

type PermissionScope = { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
type PermissionsMap = Record<string, PermissionScope>;

/**
 * Caché a nivel de módulo de los permisos ya resueltos. Evita que al re-montar
 * la página (navegación de ida y vuelta) se muestre el aviso "No tienes permiso"
 * mientras la petición vuelve a resolverse, y que el throttle deje el estado
 * vacío de forma permanente.
 */
let cachedPermissions: PermissionsMap | null = null;
let lastPermissionsFetchAt = 0;
const PERMISSIONS_TTL_MS = 30_000;

type FilterStatus = "" | "PENDIENTE" | "AUTORIZADA" | "CANCELADA";
type StatusCountKey = "PENDIENTE" | "AUTORIZADA" | "CANCELADA";

const filterGroupLabelClass =
  "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]";

const filterControlClass =
  "h-10 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[13px] font-medium text-[#09090B] outline-none transition-colors hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.15)] disabled:cursor-not-allowed disabled:bg-[#F5F5F4] disabled:text-[#A1A1AA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.25)] dark:disabled:bg-[#0f172a]";

const filterControlActiveClass = "!border-[#1B5CFF] bg-[rgba(27,92,255,0.05)] dark:!border-[#4B7CFF]";

/** Campo de fecha: indicador de calendario siempre visible y clic-para-abrir. */
const filterDateClass = `${filterControlClass} tabular-nums cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 dark:[&::-webkit-calendar-picker-indicator]:invert`;

const filterMenuBtnClass =
  "inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 text-[13px] font-semibold text-[#09090B] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.15)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]";

/** Abre el calendario nativo al hacer clic/enfocar (Chrome no lo abre solo al pulsar el campo). */
const openDatePicker = (e: SyntheticEvent<HTMLInputElement>) => {
  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  try {
    el.showPicker?.();
  } catch {
    /* showPicker no disponible o sin gesto de usuario */
  }
};

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(27,92,255,0.28)] bg-[rgba(27,92,255,0.07)] py-1 pl-2.5 pr-1 text-[12px] font-medium text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]">
      <span className="max-w-[16rem] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro: ${label}`}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#1B5CFF]/20 dark:hover:bg-[#4B7CFF]/25"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
          <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
        </svg>
      </button>
    </span>
  );
}

const normalizeStatus = (raw: string) => String(raw || "").trim().toUpperCase();
const rowStatusKey = (raw: string): StatusCountKey => {
  const s = normalizeStatus(raw);
  if (s === "AUTORIZADA" || s === "CANCELADA") return s;
  return "PENDIENTE";
};

const getCurrentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const parseYearMonth = (value: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
};

export default function CotizacionesPage() {
  const deleteModalTitleId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = (searchParams.get(COTIZACION_LIST_SEARCH_PARAM) || readCotizacionListSearch()).trim();
  const [permissions, setPermissions] = useState<PermissionsMap>(() => cachedPermissions ?? {});
  const [permissionsReady, setPermissionsReady] = useState<boolean>(() => cachedPermissions !== null);

  const canCotizacionesView = permissions?.cotizaciones?.view === true;
  const canCotizacionesCreate = permissions?.cotizaciones?.create === true;
  const canCotizacionesEdit = permissions?.cotizaciones?.edit === true;
  const canCotizacionesDelete = permissions?.cotizaciones?.delete === true;

  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>(
    { show: false, variant: 'info', title: '', message: '' }
  );

  const clearSessionAndGoToLogin = () => {
    navigate('/signin', { replace: true, state: { from: { pathname: '/cotizacion' } } });
  };

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [searchDebounced, setSearchDebounced] = useState(initialSearch);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const [totalCount, setTotalCount] = useState(0);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);

  const isSearching = Boolean(searchDebounced.trim());

  const [rows, setRows] = useState<CotizacionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("");
  const [filterTipoTrabajo, setFilterTipoTrabajo] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const filtersMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (filtersMenuRef.current && !filtersMenuRef.current.contains(e.target as Node)) {
        setFiltersMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersMenuOpen]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cotizacionToDelete, setCotizacionToDelete] = useState<CotizacionRow | null>(null);

  const [excelLoading, setExcelLoading] = useState(false);
  const [excelLoadingProgress, setExcelLoadingProgress] = useState(8);

  useEffect(() => {
    if (!excelLoading) {
      setExcelLoadingProgress(100);
      return;
    }

    setExcelLoadingProgress(8);
    const interval = window.setInterval(() => {
      setExcelLoadingProgress((p) => {
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [excelLoading]);

  const formatMoney = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  };

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();

    // Con caché fresca no volvemos a pedir: pintamos permisos al instante y
    // nunca mostramos el aviso "No tienes permiso" en el re-montaje.
    if (cachedPermissions !== null && now - lastPermissionsFetchAt < PERMISSIONS_TTL_MS) {
      setPermissions(cachedPermissions);
      setPermissionsReady(true);
      return;
    }
    lastPermissionsFetchAt = now;

    const load = async () => {
      try {
        const res = await fetchApi('/api/me/permissions/', { method: 'GET' });
        if (res.status === 401) {
          clearSessionAndGoToLogin();
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const p = (data?.permissions || {}) as PermissionsMap;
        cachedPermissions = p;
        if (!cancelled) setPermissions(p);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setPermissionsReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchCotizaciones = useCallback(async () => {
    if (!canCotizacionesView) {
      setRows([]);
      return;
    }

    const fetchId = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", String(LIST_PAGE_SIZE));
      if (isSearching) {
        params.set("search", searchDebounced.trim());
      } else if (selectedMonth) {
        params.set("month", selectedMonth);
      }

      const res = await fetchApi(`/api/cotizaciones/?${params.toString()}`, { method: "GET" });
      if (fetchId !== fetchSeqRef.current) return;

      if (res.status === 401) {
        clearSessionAndGoToLogin();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      const mapped: CotizacionRow[] = (list || []).map((x: Record<string, unknown>) => {
        const creado = String(x?.creado_por_full_name || x?.creado_por_username || x?.creadaPor || "—");
        const editado = String(x?.actualizado_por_full_name || x?.actualizado_por_username || x?.editadaPor || "—");
        return {
          id: Number(x?.id || 0),
          idx: Number(x?.idx || 0),
          fecha: String(x?.fecha || ""),
          medioContacto: String(x?.medio_contacto || x?.medioContacto || "—"),
          status: String(x?.status || "—"),
          creadaPor: creado,
          editadaPor: editado,
          cliente: String(x?.cliente || x?.cliente_nombre || "—"),
          clienteTelefono: String(x?.cliente_telefono || "—"),
          contacto: String(x?.contacto || "—"),
          tipoTrabajo: String(x?.tipo_trabajo_nombres || "").trim() || "—",
          monto: formatMoney(Number(x?.total ?? 0)),
          totalAmount: Number(x?.total ?? 0) || 0,
        };
      }).filter((x: CotizacionRow) => !!x.id);

      setRows(mapped);
      setTotalCount(Number(data?.count ?? mapped.length));

      if (!isSearching && data?.month_stats && typeof data.month_stats === "object") {
        const ms = data.month_stats as Record<string, unknown>;
        setMonthStats({
          total: Number(ms.total ?? 0) || 0,
          autorizadas: Number(ms.autorizadas ?? 0) || 0,
          pendientes: Number(ms.pendientes ?? 0) || 0,
          canceladas: Number(ms.canceladas ?? 0) || 0,
        });
      }
    } catch {
      if (fetchId !== fetchSeqRef.current) return;
      setRows([]);
    } finally {
      if (fetchId === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [canCotizacionesView, isSearching, searchDebounced, selectedMonth]);

  useEffect(() => {
    void fetchCotizaciones();
  }, [fetchCotizaciones]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    const next = searchDebounced.trim();
    writeCotizacionListSearch(next);
    const current = (new URLSearchParams(window.location.search).get(COTIZACION_LIST_SEARCH_PARAM) || "").trim();
    if (current === next) return;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next) params.set(COTIZACION_LIST_SEARCH_PARAM, next);
        else params.delete(COTIZACION_LIST_SEARCH_PARAM);
        return params;
      },
      { replace: true },
    );
  }, [searchDebounced, setSearchParams]);

  const deleteCotizacion = async (id: string) => {
    if (!canCotizacionesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar cotizaciones.' });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
      return;
    }
    const sid = String(id || '').trim();
    if (!sid) return;
    try {
      const res = await fetchApi(`/api/cotizaciones/${sid}/`, { method: 'DELETE' });
      if (res.status === 401) {
        clearSessionAndGoToLogin();
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setAlert({ show: true, variant: 'error', title: 'Error', message: txt || 'No se pudo eliminar la cotización.' });
        window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 3000);
        return;
      }
      setRows((prev) => prev.filter((r) => String(r.id) !== sid));
      void fetchCotizaciones();
      setAlert({ show: true, variant: 'success', title: 'Eliminada', message: 'Cotización eliminada.' });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2000);
    } catch {
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'No se pudo eliminar la cotización.' });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 3000);
    }
  };

  const handleAskDelete = (c: CotizacionRow) => {
    if (!canCotizacionesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar cotizaciones.' });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
      return;
    }
    setCotizacionToDelete(c);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setCotizacionToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!cotizacionToDelete) return;
    await deleteCotizacion(String(cotizacionToDelete.id));
    setShowDeleteModal(false);
    setCotizacionToDelete(null);
  };

  const formatDMY = (iso: string) => {
    if (!iso) return "";
    const datePart = String(iso).trim().slice(0, 10);
    const [y, m, d] = datePart.split("-");
    if (!y || !m || !d) return "";
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    return `${dd}/${mm}/${y}`;
  };

  const normalizeMedioLabel = (raw: string) => {
    const s = String(raw || '').trim();
    if (!s) return '—';
    const map: Record<string, string> = {
      BNI: 'BNI',
      REFERIDO: 'Referido',
      WEB: 'Web',
      TIENDA_ONLINE: 'Tienda Online',
      FACEBOOK: 'Facebook',
      INSTAGRAM: 'Instagram',
      TIKTOK: 'Tiktok',
      GOOGLE_MAPS: 'Google Maps',
      YOUTUBE: 'Youtube',
      TIENDA_FISICA: 'Tienda Fisica',
      OTRO: 'Otro',
    };
    const key = s.toUpperCase().replace(/\s+/g, '_');
    return map[key] || s;
  };

  const statusChipClass = (raw: string) => {
    const s = String(raw || '').trim().toUpperCase();
    if (s === 'AUTORIZADA') {
      return 'border border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-200';
    }
    if (s === 'CANCELADA') {
      return 'border border-rose-200/80 bg-rose-50/90 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/[0.08] dark:text-rose-200';
    }
    return 'border border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/[0.08] dark:text-amber-200';
  };

  useEffect(() => {
    const onUpdated = () => {
      if (!canCotizacionesView) return;
      void fetchCotizaciones();
    };

    window.addEventListener("cotizaciones:updated", onUpdated);
    return () => window.removeEventListener("cotizaciones:updated", onUpdated);
  }, [canCotizacionesView, fetchCotizaciones]);

  const clearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    writeCotizacionListSearch("");
    setSearchTerm("");
    setSearchDebounced("");
  };

  const stats = useMemo(() => {
    const fmt = (n: number) => formatMoney(Number.isFinite(n) ? n : 0);
    if (monthStats) {
      return {
        total: fmt(monthStats.total),
        autorizadas: fmt(monthStats.autorizadas),
        pendientes: fmt(monthStats.pendientes),
        canceladas: fmt(monthStats.canceladas),
      };
    }
    return {
      total: fmt(0),
      autorizadas: fmt(0),
      pendientes: fmt(0),
      canceladas: fmt(0),
    };
  }, [monthStats]);

  const tipoTrabajoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const raw = String(r.tipoTrabajo || "").trim();
      if (!raw || raw === "—") continue;
      for (const part of raw.split(",")) {
        const name = part.trim();
        if (name) set.add(name);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const usuarioOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const name = String(r.creadaPor || "").trim();
      if (name && name !== "—") set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const secondaryFilterCount =
    (filterTipoTrabajo ? 1 : 0) + (filterUsuario ? 1 : 0) + (filterDesde || filterHasta ? 1 : 0);
  const activeFilterCount = (filterStatus ? 1 : 0) + secondaryFilterCount;
  const hasActiveFilters = activeFilterCount > 0;
  const hasSecondaryFilters = secondaryFilterCount > 0;

  /** Filas tras aplicar todos los filtros MENOS el de estado (base para contar cada estado). */
  const rowsBeforeStatus = useMemo(() => {
    return rows.filter((r) => {
      if (filterTipoTrabajo) {
        const parts = String(r.tipoTrabajo || "")
          .split(",")
          .map((p) => p.trim());
        if (!parts.includes(filterTipoTrabajo)) return false;
      }
      if (filterUsuario && String(r.creadaPor || "").trim() !== filterUsuario) return false;
      const day = String(r.fecha || "").trim().slice(0, 10);
      if (filterDesde && (!day || day < filterDesde)) return false;
      if (filterHasta && (!day || day > filterHasta)) return false;
      return true;
    });
  }, [rows, filterTipoTrabajo, filterUsuario, filterDesde, filterHasta]);

  const statusCounts = useMemo(() => {
    const c: Record<StatusCountKey, number> = { PENDIENTE: 0, AUTORIZADA: 0, CANCELADA: 0 };
    for (const r of rowsBeforeStatus) c[rowStatusKey(r.status)] += 1;
    return c;
  }, [rowsBeforeStatus]);

  const filteredRows = useMemo(() => {
    if (!filterStatus) return rowsBeforeStatus;
    return rowsBeforeStatus.filter((r) => rowStatusKey(r.status) === filterStatus);
  }, [rowsBeforeStatus, filterStatus]);

  const resetSecondaryFilters = () => {
    setFilterTipoTrabajo("");
    setFilterUsuario("");
    setFilterDesde("");
    setFilterHasta("");
  };

  const handleOpenPdf = (id: number) =>
    navigate(`/cotizacion/${id}/pdf`, { state: cotizacionListSearchState(searchDebounced || searchTerm) });

  const handleEditRow = (r: CotizacionRow) => {
    if (!canCotizacionesEdit) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para editar cotizaciones." });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
      return;
    }
    navigate(`/cotizacion/${r.id}/editar`, { state: cotizacionListSearchState(searchDebounced || searchTerm) });
  };

  const handleDownloadExcel = async (r: CotizacionRow) => {
    if (excelLoading) return;
    if (!canCotizacionesView) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para ver cotizaciones." });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
      return;
    }

    const sid = String(r.id || "").trim();
    if (!sid) return;

    try {
      setExcelLoading(true);
      const resp = await fetchApi(`/api/cotizaciones/${sid}/excel/`);

      if (resp.status === 401) {
        clearSessionAndGoToLogin();
        return;
      }

      if (!resp.ok) {
        let msg = `No se pudo generar el Excel (HTTP ${resp.status}).`;
        try {
          const ct = resp.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await resp.json();
            msg = (data as { detail?: string })?.detail || msg;
          } else {
            msg = (await resp.text()) || msg;
          }
        } catch {
          /* ignore */
        }
        setAlert({ show: true, variant: "error", title: "Error", message: msg });
        window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 3500);
        return;
      }

      const dispo = resp.headers.get("content-disposition") || "";
      const m = dispo.match(/filename="?([^";]+)"?/i);
      const fallbackIdx = r.idx
        ? formatDocumentFolio(FOLIO_SERIE.cotizacion, r.idx)
        : sid;
      const filename = m?.[1] ? String(m[1]) : `Cotizacion_${fallbackIdx}.xlsx`;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo descargar el Excel." });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 3500);
    } finally {
      setExcelLoading(false);
    }
  };

  const rowActions = {
    onOpenPdf: handleOpenPdf,
    onEdit: handleEditRow,
    onDelete: handleAskDelete,
    onDownloadExcel: handleDownloadExcel,
  };

  return (
    <div className={cotPageCanvasClass} style={cotSansStyle}>
      <div className={cotPageInnerClass}>
      <PageMeta title="Cotizaciones | Sistema Grupo Intrax GPS" description="Gestión de cotizaciones" />

      <CotizacionExportOverlay open={excelLoading} isExcel progress={excelLoadingProgress} />

      {alert.show && (
        <div role="alert" aria-live={alert.variant === "error" ? "assertive" : "polite"}>
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        </div>
      )}

      {!permissionsReady ? (
        <div
          className="flex items-center justify-center gap-3 rounded-[24px] border border-[#E7E7EA] bg-white px-4 py-10 text-center text-sm text-[#6E6E77] shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] sm:px-6"
          role="status"
          aria-live="polite"
        >
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#E7E7EA] border-t-[#1B5CFF] dark:border-[#273244] dark:border-t-[#4B7CFF]"
            aria-hidden
          />
          Cargando permisos…
        </div>
      ) : !canCotizacionesView ? (
        <div className="rounded-[24px] border border-[#E7E7EA] bg-white px-4 py-10 text-center text-sm text-[#52525B] shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] sm:px-6">
          No tienes permiso para ver Cotizaciones.
        </div>
      ) : (
        <>
          <CotizacionPageHeader stats={stats} />

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
            <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E77] dark:text-[#64748b]"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <label htmlFor="cotizaciones-search" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                Buscar cotizaciones
              </label>
              <input
                id="cotizaciones-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio, cliente, contacto o usuario…"
                className={searchInputClass}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg text-[#6E6E77] hover:bg-black/[0.04] hover:text-[#09090B] dark:text-[#8ea0b8] dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!canCotizacionesCreate) {
                  setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear cotizaciones." });
                  window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
                  return;
                }
                navigate("/cotizacion/nueva");
              }}
              className={`${primaryActionInlineBtnClass} shrink-0 lg:shrink-0`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Nueva cotización
            </button>
          </div>

          <section className={`${cardShellClass} !overflow-visible`} aria-labelledby="cotizaciones-listado-heading">
            <div className="border-b border-[#E7E7EA] dark:border-[#273244]">
              {/* Fila 1 — cabecera del listado */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <rect x="3" y="4" width="18" height="17" rx="2.2" />
                      <path d="M3 9.5h18" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="cotizaciones-listado-heading"
                      className="text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]"
                    >
                      Listado de cotizaciones
                    </h2>
                    <p className="mt-0.5 truncate text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      {isSearching
                        ? `Resultados para «${searchDebounced}»`
                        : "Agrupadas por estado: pendientes, autorizadas y canceladas"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[24px] font-semibold leading-none tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                      {filteredRows.length.toLocaleString("es-MX")}
                    </span>
                    <span className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      {filteredRows.length !== totalCount
                        ? `de ${totalCount.toLocaleString("es-MX")}`
                        : filteredRows.length === 1
                          ? "cotización"
                          : "cotizaciones"}
                    </span>
                  </div>

                  <div className="relative" ref={filtersMenuRef}>
                    <button
                      type="button"
                      onClick={() => setFiltersMenuOpen((o) => !o)}
                      aria-haspopup="dialog"
                      aria-expanded={filtersMenuOpen}
                      className={`${filterMenuBtnClass} ${
                        filtersMenuOpen || hasSecondaryFilters
                          ? "!border-[#1B5CFF] text-[#1B5CFF] dark:!border-[#4B7CFF] dark:text-[#4B7CFF]"
                          : ""
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
                      </svg>
                      <span className="hidden sm:inline">Filtros</span>
                      {hasSecondaryFilters && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1B5CFF] px-1 text-[11px] font-bold tabular-nums text-white dark:bg-[#4B7CFF]">
                          {secondaryFilterCount}
                        </span>
                      )}
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-3.5 w-3.5 transition-transform ${filtersMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <div
                      role="dialog"
                      aria-label="Filtros de cotizaciones"
                      aria-hidden={!filtersMenuOpen}
                      className={`absolute right-0 z-30 mt-2 w-[min(92vw,20rem)] origin-top-right rounded-[14px] border border-[#E7E7EA] bg-white p-4 shadow-[0_18px_44px_-12px_rgba(9,9,11,0.28)] transition-[opacity,transform,visibility] duration-200 ease-out will-change-transform motion-reduce:transition-none dark:border-[#273244] dark:bg-[#111827] ${
                        filtersMenuOpen
                          ? "translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none invisible -translate-y-1.5 scale-95 opacity-0 duration-150 ease-in"
                      }`}
                    >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Filtrar por</p>
                          <button
                            type="button"
                            onClick={() => setFiltersMenuOpen(false)}
                            aria-label="Cerrar filtros"
                            className="inline-flex size-7 items-center justify-center rounded-lg text-[#6E6E77] transition-colors hover:bg-black/[0.04] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-white"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                              <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-3.5">
                          <div>
                            <label htmlFor="filtro-tipo" className={filterGroupLabelClass}>
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                <path d="M4 7h16M7 12h10M10 17h4" strokeLinecap="round" />
                              </svg>
                              Tipo de trabajo
                            </label>
                            <select
                              id="filtro-tipo"
                              value={filterTipoTrabajo}
                              onChange={(e) => setFilterTipoTrabajo(e.target.value)}
                              className={`${filterControlClass} ${filterTipoTrabajo ? filterControlActiveClass : ""}`}
                            >
                              <option value="">Todos los tipos</option>
                              {tipoTrabajoOptions.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="filtro-usuario" className={filterGroupLabelClass}>
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                <path
                                  d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Usuario
                            </label>
                            <select
                              id="filtro-usuario"
                              value={filterUsuario}
                              onChange={(e) => setFilterUsuario(e.target.value)}
                              className={`${filterControlClass} ${filterUsuario ? filterControlActiveClass : ""}`}
                            >
                              <option value="">Todos los usuarios</option>
                              {usuarioOptions.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className={filterGroupLabelClass}>
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                <rect x="3" y="4.5" width="18" height="16" rx="2" />
                                <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
                              </svg>
                              Rango de fechas
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="sr-only" htmlFor="filtro-desde">
                                Fecha desde
                              </label>
                              <input
                                id="filtro-desde"
                                type="date"
                                value={filterDesde}
                                max={filterHasta || undefined}
                                onChange={(e) => setFilterDesde(e.target.value)}
                                onClick={openDatePicker}
                                className={`${filterDateClass} min-w-0 flex-1 ${filterDesde ? filterControlActiveClass : ""}`}
                              />
                              <span className="shrink-0 text-[13px] text-[#A1A1AA]" aria-hidden>
                                –
                              </span>
                              <label className="sr-only" htmlFor="filtro-hasta">
                                Fecha hasta
                              </label>
                              <input
                                id="filtro-hasta"
                                type="date"
                                value={filterHasta}
                                min={filterDesde || undefined}
                                onChange={(e) => setFilterHasta(e.target.value)}
                                onClick={openDatePicker}
                                className={`${filterDateClass} min-w-0 flex-1 ${filterHasta ? filterControlActiveClass : ""}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E7E7EA] pt-3 dark:border-[#273244]">
                          <button
                            type="button"
                            onClick={resetSecondaryFilters}
                            disabled={!hasSecondaryFilters}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-[#E7E7EA] bg-white px-3 text-[12px] font-semibold text-[#C22B2B] transition-colors hover:border-[#F0C4C4] hover:bg-[#FEF2F2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.18)] disabled:cursor-not-allowed disabled:border-[#EDEDED] disabled:bg-transparent disabled:text-[#C4C4C8] dark:border-[#3A2A2A] dark:bg-transparent dark:text-[#F87171] dark:hover:bg-[#3F1518] dark:disabled:border-[#273244] dark:disabled:text-[#4B5563]"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M3 8a9 9 0 1 1 2 6.4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Limpiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltersMenuOpen(false)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[#1B5CFF] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.25)] active:scale-[0.98] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0]"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Listo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Fila 2 — estado: rail horizontal (mismo patrón responsivo que Inventario) */}
              <div className="min-w-0 max-w-full overflow-hidden px-4 pb-4 pt-3 sm:px-6">
                <CotizacionesStatusSegmentFilter
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  statusCounts={statusCounts}
                  totalBeforeStatus={rowsBeforeStatus.length}
                />

                {hasSecondaryFilters && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {filterTipoTrabajo && (
                      <FilterChip label={`Tipo: ${filterTipoTrabajo}`} onRemove={() => setFilterTipoTrabajo("")} />
                    )}
                    {filterUsuario && (
                      <FilterChip label={`Usuario: ${filterUsuario}`} onRemove={() => setFilterUsuario("")} />
                    )}
                    {(filterDesde || filterHasta) && (
                      <FilterChip
                        label={
                          filterDesde && filterHasta
                            ? `${formatDMY(filterDesde)} – ${formatDMY(filterHasta)}`
                            : filterDesde
                              ? `Desde ${formatDMY(filterDesde)}`
                              : `Hasta ${formatDMY(filterHasta)}`
                        }
                        onRemove={() => {
                          setFilterDesde("");
                          setFilterHasta("");
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={resetSecondaryFilters}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C22B2B] transition-colors hover:text-[#9B1C1C] dark:text-[#F87171] dark:hover:text-[#FCA5A5]"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-2 sm:p-3">
              <CotizacionesMobileList
                rows={filteredRows}
                loading={loading}
                formatDMY={formatDMY}
                normalizeMedioLabel={normalizeMedioLabel}
                statusChipClass={statusChipClass}
                medioChipClass={medioChipClass}
                actions={rowActions}
                excelLoading={excelLoading}
              />
              <CotizacionesTable
                rows={filteredRows}
                loading={loading}
                formatDMY={formatDMY}
                normalizeMedioLabel={normalizeMedioLabel}
                statusChipClass={statusChipClass}
                medioChipClass={medioChipClass}
                actions={rowActions}
                excelLoading={excelLoading}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
              {hasActiveFilters ? (
                <>
                  Mostrando{" "}
                  <span className="font-medium text-[#09090B] dark:text-[#f8fafc]">{filteredRows.length}</span> de{" "}
                  {totalCount.toLocaleString("es-MX")} cotizaciones (filtros activos)
                </>
              ) : isSearching ? (
                <>
                  {totalCount.toLocaleString("es-MX")} resultado{totalCount === 1 ? "" : "s"} para «{searchDebounced}»
                </>
              ) : (
                <>
                  Mostrando{" "}
                  <span className="font-medium text-[#09090B] dark:text-[#f8fafc]">{totalCount}</span> cotizaciones
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return;
                  const d = new Date(ym.year, ym.month - 2, 1);
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  setSelectedMonth(`${d.getFullYear()}-${mm}`);
                }}
                className={monthNavBtnClass}
                title="Mes anterior"
                aria-label="Mes anterior"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="min-w-[130px] text-center text-[11px] text-[#52525B] sm:min-w-[160px] sm:text-[12px] dark:text-[#cbd5e1]">
                {(() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return selectedMonth || "Todos los meses";
                  return new Date(ym.year, ym.month - 1, 1).toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric",
                  });
                })()}
              </span>
              <button
                type="button"
                onClick={() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return;
                  const dt = new Date(ym.year, ym.month - 1, 1);
                  dt.setMonth(dt.getMonth() + 1);
                  const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
                  setSelectedMonth(next);
                }}
                className={monthNavBtnClass}
                title="Mes siguiente"
                aria-label="Mes siguiente"
              >
                <svg className="w-4 h-4 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M9 18l6-6 6 6" />
                </svg>
              </button>
            </div>
          </div>

          {cotizacionToDelete && (
            <Modal
              isOpen={showDeleteModal}
              onClose={handleCancelDelete}
              closeOnBackdropClick={false}
              className={`${modalSmallShellClass} mx-4 sm:mx-auto`}
              ariaLabelledBy={deleteModalTitleId}
            >
              <div className="bg-white p-6 dark:bg-[#111827]">
                <div className="mb-5 flex items-start gap-3.5">
                  <span
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]"
                    aria-hidden="true"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3
                      id={deleteModalTitleId}
                      className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]"
                    >
                      ¿Eliminar cotización?
                    </h3>
                    <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
                      Se eliminará la cotización de{" "}
                      <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                        {cotizacionToDelete.cliente}
                      </span>
                      . Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className={`${secondaryActionBtnClass} sm:flex-1`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className={`${dangerActionBtnClass} sm:flex-1`}
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </Modal>
          )}

        </>
      )}
      </div>
    </div>
  );
}
