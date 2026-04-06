import PageMeta from "@/components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Link, useNavigate } from "react-router-dom";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const searchInputClass =
  "min-h-[40px] w-full rounded-lg border border-gray-200/90 bg-gray-50/90 py-2 pl-9 pr-10 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60 sm:min-h-[44px] sm:py-2.5";

/** Medio en gris neutro; el estado usa color semántico */
const medioChipClass =
  "border border-gray-200/80 bg-gray-50/90 text-gray-800 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200";

let lastPermissionsFetchAt = 0;
let lastCotizacionesFetchAt = 0;

interface CotizacionRow {
  id: number;
  idx: number;
  fecha: string; // YYYY-MM-DD
  medioContacto: string;
  status: string;
  creadaPor: string;
  editadaPor: string;
  cliente: string;
  contacto: string;
  monto: string; // formatted currency
}

export default function CotizacionesPage() {
  const asBool = (v: any, defaultValue: boolean) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
    }
    return defaultValue;
  };

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  const canCotizacionesView = asBool(permissions?.cotizaciones?.view, true);
  const canCotizacionesCreate = asBool(permissions?.cotizaciones?.create, false);
  const canCotizacionesEdit = asBool(permissions?.cotizaciones?.edit, false);
  const canCotizacionesDelete = asBool(permissions?.cotizaciones?.delete, false);

  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>(
    { show: false, variant: 'info', title: '', message: '' }
  );

  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [rows, setRows] = useState<CotizacionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cotizacionToDelete, setCotizacionToDelete] = useState<CotizacionRow | null>(null);

  const formatMoney = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  };

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('permissions:updated' as any, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('permissions:updated' as any, sync);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const now = Date.now();
    if (now - lastPermissionsFetchAt < 2000) return;
    lastPermissionsFetchAt = now;

    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/me/permissions/'), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store' as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const p = data?.permissions || {};
        const pStr = JSON.stringify(p);
        localStorage.setItem('permissions', pStr);
        sessionStorage.setItem('permissions', pStr);
        setPermissions(p);
        window.dispatchEvent(new Event('permissions:updated'));
      } catch {
        // ignore
      }
    };

    load();
  }, []);

  const fetchCotizaciones = async () => {
    if (!canCotizacionesView) {
      setRows([]);
      return;
    }
    const token = getToken();
    if (!token) {
      setRows([]);
      return;
    }

    const now = Date.now();
    if (now - lastCotizacionesFetchAt < 2000) return;
    lastCotizacionesFetchAt = now;

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/cotizaciones/'), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      const mapped: CotizacionRow[] = (list || []).map((x: any) => {
        const creado = String(x?.creado_por_full_name || x?.creado_por_username || x?.creadaPor || '—');
        const editado = String(x?.actualizado_por_full_name || x?.actualizado_por_username || x?.editadaPor || '—');
        return {
          id: Number(x?.id || 0),
          idx: Number(x?.idx || 0),
          fecha: String(x?.fecha || ''),
          medioContacto: String(x?.medio_contacto || x?.medioContacto || '—'),
          status: String(x?.status || '—'),
          creadaPor: creado,
          editadaPor: editado,
          cliente: String(x?.cliente || x?.cliente_nombre || '—'),
          contacto: String(x?.contacto || '—'),
          monto: formatMoney(Number(x?.total ?? 0)),
        };
      }).filter((x: any) => !!x.id);
      setRows(mapped);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCotizacionesView]);

  useEffect(() => {
    const onUpdated = () => {
      if (!canCotizacionesView) return;
      fetchCotizaciones();
    };

    window.addEventListener("cotizaciones:updated", onUpdated as any);
    return () => window.removeEventListener("cotizaciones:updated", onUpdated as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCotizacionesView]);

  const deleteCotizacion = async (id: string) => {
    if (!canCotizacionesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar cotizaciones.' });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
      return;
    }
    const token = getToken();
    if (!token) return;
    const sid = String(id || '').trim();
    if (!sid) return;
    try {
      const res = await fetch(apiUrl(`/api/cotizaciones/${sid}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setAlert({ show: true, variant: 'error', title: 'Error', message: txt || 'No se pudo eliminar la cotización.' });
        window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 3000);
        return;
      }
      setRows((prev) => prev.filter((r) => String(r.id) !== sid));
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

  const shownList = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        String(r.idx || '').toLowerCase().includes(q) ||
        r.cliente.toLowerCase().includes(q) ||
        r.contacto.toLowerCase().includes(q) ||
        r.creadaPor.toLowerCase().includes(q) ||
        r.editadaPor.toLowerCase().includes(q)
      );
    });
  }, [rows, searchTerm]);

  const stats = useMemo(() => {
    const total = rows.length;
    const autorizadas = rows.filter((r) => String(r.status || '').toUpperCase() === 'AUTORIZADA').length;
    const pendientes = rows.filter((r) => String(r.status || '').toUpperCase() === 'PENDIENTE' || !String(r.status || '').trim()).length;
    const canceladas = rows.filter((r) => String(r.status || '').toUpperCase() === 'CANCELADA').length;
    return { total, autorizadas, pendientes, canceladas };
  }, [rows]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]">
      <PageMeta title="Cotizaciones | Sistema Grupo Intrax GPS" description="Gestión de cotizaciones" />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {!canCotizacionesView ? (
        <div className={`rounded-2xl border border-gray-200/80 bg-white px-4 py-10 text-center text-xs text-gray-500 shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:text-gray-400 sm:text-sm`}>
          No tienes permiso para ver Cotizaciones.
        </div>
      ) : (
        <>
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              Inicio
            </Link>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              /
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Cotizaciones</span>
          </nav>

          <header className={`flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
                <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">
                  Ventas
                </p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">
                  Cotizaciones
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                  Consulta el historial, filtra por cliente o folio, abre el PDF y administra el estado de cada cotización.
                </p>
              </div>
            </div>
          </header>

          <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 xl:gap-5">
            <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-50/80 text-brand-600 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-brand-400 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Total</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className={`${cardShellClass} p-3 sm:p-4`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-300 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Autorizadas</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.autorizadas}</p>
                </div>
              </div>
            </div>

            <div className={`${cardShellClass} p-3 sm:p-4`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/[0.08] dark:text-amber-200 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Pendientes</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.pendientes}</p>
                </div>
              </div>
            </div>

            <div className={`${cardShellClass} p-3 sm:p-4`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/[0.08] dark:text-rose-300 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Canceladas</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.canceladas}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
            <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Folio, cliente, contacto o usuario…"
                className={searchInputClass}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
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
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/35 active:scale-[0.99] sm:w-auto sm:min-h-0 lg:shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Nueva cotización
            </button>
          </div>

          <ComponentCard
            title="Listado de cotizaciones"
            desc="Resultados según tu búsqueda. En pantallas pequeñas desplázate horizontalmente para ver todas las columnas."
            className={cardShellClass}
            compact
          >
            <p className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 sm:hidden">
              <span className="inline-block h-px w-4 bg-brand-400/60" aria-hidden />
              Desliza horizontalmente para ver el listado completo
            </p>
            <div className="touch-pan-x overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200/70 bg-white/70 [-webkit-overflow-scrolling:touch] dark:border-white/[0.08] dark:bg-gray-900/40">
                  <Table className="w-full min-w-[1080px] border-collapse">
                    <TableHeader className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-100/90 text-[10px] font-semibold text-gray-700 backdrop-blur-sm dark:border-white/[0.06] dark:bg-gray-900/90 dark:text-gray-200 sm:text-[11px]">
                      <TableRow>
                        <TableCell isHeader className="w-[80px] min-w-[80px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Folio</TableCell>
                        <TableCell isHeader className="w-[104px] min-w-[104px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Fecha</TableCell>
                        <TableCell isHeader className="min-w-[120px] max-w-[160px] px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Medio</TableCell>
                        <TableCell isHeader className="w-[108px] min-w-[108px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Status</TableCell>
                        <TableCell isHeader className="min-w-[132px] max-w-[180px] px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Creada por</TableCell>
                        <TableCell isHeader className="min-w-[132px] max-w-[180px] px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Editada por</TableCell>
                        <TableCell isHeader className="min-w-[160px] px-2 py-2 text-left text-gray-700 dark:text-gray-300 sm:px-3">Cliente</TableCell>
                        <TableCell isHeader className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right text-gray-700 dark:text-gray-300 sm:px-3">Monto</TableCell>
                        <TableCell isHeader className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300 sm:px-3">Acciones</TableCell>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-100 text-[11px] text-gray-700 dark:divide-white/[0.06] dark:text-gray-200 sm:text-[12px]">
                      {loading ? (
                        <TableRow>
                          <TableCell className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={9}>
                            Cargando…
                          </TableCell>
                        </TableRow>
                      ) : shownList.length === 0 ? (
                        <TableRow>
                          <TableCell className="px-3 py-2" colSpan={9}>
                            <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">No hay cotizaciones.</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        shownList.map((r) => {
                          const statusUpper = String(r.status || 'PENDIENTE').toUpperCase();
                          return (
                            <TableRow key={r.id} className="align-top transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60">
                              <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                                <span className="inline-flex items-center justify-center rounded-md border border-gray-200/80 bg-gray-50/90 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-900 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-white sm:text-[11px]">
                                  {r.idx ? r.idx : "—"}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                                <div className="text-[11px] text-gray-900 dark:text-white sm:text-[12px]">{formatDMY(r.fecha)}</div>
                              </TableCell>
                              <TableCell className="min-w-0 max-w-[160px] px-2 py-2 align-middle sm:px-3">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${medioChipClass}`}>
                                  {normalizeMedioLabel(r.medioContacto)}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${statusChipClass(r.status)}`}>
                                  {statusUpper === 'PENDIENTE'
                                    ? 'Pendiente'
                                    : String(r.status || '—').charAt(0).toUpperCase() + String(r.status || '—').slice(1).toLowerCase()}
                                </span>
                              </TableCell>
                              <TableCell className="min-w-0 max-w-[180px] px-2 py-2 align-top sm:px-3">
                                <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                                  <span className="truncate text-[11px] text-gray-900 dark:text-white sm:text-[12px]" title={r.creadaPor}>{r.creadaPor}</span>
                                  <span className="shrink-0 text-[10px] leading-tight text-gray-500 dark:text-gray-400 sm:text-[11px]">Creada</span>
                                </div>
                              </TableCell>
                              <TableCell className="min-w-0 max-w-[180px] px-2 py-2 align-top sm:px-3">
                                <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                                  <span className="truncate text-[11px] text-gray-900 dark:text-white sm:text-[12px]" title={r.editadaPor}>{r.editadaPor}</span>
                                  <span className="shrink-0 text-[10px] leading-tight text-gray-500 dark:text-gray-400 sm:text-[11px]">Última edición</span>
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[160px] max-w-[280px] px-2 py-2 align-top sm:px-3">
                                <div className="min-w-0 overflow-hidden">
                                  <span className="block truncate text-[11px] font-medium text-gray-900 dark:text-white sm:text-[12px]" title={r.cliente}>
                                    {r.cliente}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right align-middle sm:px-3">
                                <span className="inline-flex max-w-full justify-end rounded-md border border-gray-200/80 bg-gray-50/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-900 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-white sm:text-[12px]">
                                  {r.monto}
                                </span>
                              </TableCell>
                              <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-center align-middle sm:px-3">
                                <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/cotizacion/${r.id}/pdf`)}
                                    className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-brand-400 hover:text-brand-600 active:scale-[0.97] dark:border-white/10 dark:bg-gray-800 dark:hover:border-brand-500 sm:h-7 sm:w-7 sm:rounded"
                                    title="PDF"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <path d="M14 2v6h6" />
                                      <path d="M8 13h2.5a1.5 1.5 0 0 1 0 3H8v-3Z" />
                                      <path d="M13 16v-3h1.5a1.5 1.5 0 0 1 0 3H13Z" />
                                      <path d="M18 16v-3h2" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canCotizacionesEdit) {
                                        setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar cotizaciones.' });
                                        window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
                                        return;
                                      }
                                      navigate(`/cotizacion/${r.id}/editar`);
                                    }}
                                    className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-brand-400 hover:text-brand-600 active:scale-[0.97] dark:border-white/10 dark:bg-gray-800 dark:hover:border-brand-500 sm:h-7 sm:w-7 sm:rounded"
                                    title="Editar"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAskDelete(r)}
                                    className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-error-400 hover:text-error-600 active:scale-[0.97] dark:border-white/10 dark:bg-gray-800 dark:hover:border-error-500 sm:h-7 sm:w-7 sm:rounded"
                                    title="Eliminar"
                                  >
                                    <TrashBinIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
            </div>
            </ComponentCard>

          {cotizacionToDelete && (
            <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="mx-4 w-full max-w-md sm:mx-auto">
              <div className="border-b border-gray-100 p-5 dark:border-white/[0.06] sm:p-6">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-error-200/80 bg-error-50/90 dark:border-error-500/25 dark:bg-error-500/[0.12]">
                  <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-center text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
                  ¿Eliminar cotización?
                </h3>
                <p className="mb-6 text-center text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:text-sm">
                  ¿Seguro que deseas eliminar la cotización de{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{cotizacionToDelete.cliente}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="flex-1 rounded-lg border border-gray-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:hover:bg-white/[0.04] sm:text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 rounded-lg bg-error-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/40 sm:text-sm"
                  >
                    Eliminar
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