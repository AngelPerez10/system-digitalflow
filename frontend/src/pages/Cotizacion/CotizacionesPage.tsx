import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useNavigate } from "react-router-dom";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";

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
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
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
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20';
    }
    if (s === 'CANCELADA') {
      return 'bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20';
    }
    return 'bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20';
  };

  const medioChipClass = (raw: string) => {
    const s = String(raw || '').trim().toUpperCase();
    if (s === 'BNI' || s === 'REFERIDO') {
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200/70 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20';
    }
    if (s === 'WEB' || s === 'GOOGLE_MAPS' || s === 'YOUTUBE') {
      return 'bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20';
    }
    if (s === 'FACEBOOK' || s === 'INSTAGRAM' || s === 'TIKTOK') {
      return 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200/70 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20';
    }
    return 'bg-gray-50 text-gray-700 ring-gray-200/70 dark:bg-white/5 dark:text-gray-200 dark:ring-white/10';
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
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Cotizaciones | Sistema Grupo Intrax GPS" description="Gestión de cotizaciones" />
      <PageBreadcrumb pageTitle="Cotizaciones" />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {!canCotizacionesView ? (
        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver Cotizaciones.</div>
      ) : (
        <div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6h12" />
                    <path d="M6 12h12" />
                    <path d="M6 18h12" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Cotizaciones</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Autorizadas</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.autorizadas}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Pendientes</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.pendientes}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 dark:bg-white/5 dark:text-gray-200 dark:ring-white/10">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Cotizaciones</h2>
                    <div className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">Administra, edita y genera PDF.</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative w-full sm:w-[320px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por folio, cliente, contacto o usuario"
                    className="w-full h-10 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 pl-9 pr-9 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                        <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!canCotizacionesCreate) {
                      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear cotizaciones.' });
                      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
                      return;
                    }
                    navigate("/cotizacion/nueva");
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Nueva Cotización
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <ComponentCard title="Listado">
              <div className="p-2 pt-0">
                <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40">
                  <Table className="w-full table-fixed">
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10 text-[11px] font-semibold text-gray-900 dark:text-white">
                      <TableRow>
                        <TableCell isHeader className="px-3 py-2 text-left w-[78px] text-gray-700 dark:text-gray-300">Folio</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-gray-700 dark:text-gray-300">Fecha</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[160px] text-gray-700 dark:text-gray-300">Medio</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[130px] text-gray-700 dark:text-gray-300">Status</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[160px] text-gray-700 dark:text-gray-300">Creada por</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[160px] text-gray-700 dark:text-gray-300">Editada por</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[220px] text-gray-700 dark:text-gray-300">Cliente</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[200px] text-gray-700 dark:text-gray-300">Contacto</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[140px] text-gray-700 dark:text-gray-300">Monto</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-center w-[126px] text-gray-700 dark:text-gray-300">Acciones</TableCell>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                      {loading ? (
                        <TableRow>
                          <TableCell className="px-3 py-3" colSpan={10}>Cargando...</TableCell>
                        </TableRow>
                      ) : shownList.length === 0 ? (
                        <TableRow>
                          <TableCell className="px-3 py-2" colSpan={10}>
                            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay cotizaciones.</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                      shownList.map((r) => {
                        return (
                          <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                            <TableCell className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 dark:text-white tabular-nums">{r.idx ? r.idx : "—"}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">{formatDMY(r.fecha)}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${medioChipClass(r.medioContacto)}`}>
                                {normalizeMedioLabel(r.medioContacto)}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${statusChipClass(r.status)}`}>
                                {String(r.status || 'PENDIENTE').toUpperCase() === 'PENDIENTE' ? 'Pendiente' : String(r.status || '—').charAt(0).toUpperCase() + String(r.status || '—').slice(1).toLowerCase()}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">{r.creadaPor}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">{r.editadaPor}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">{r.cliente}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">{r.contacto}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 dark:text-white tabular-nums">{r.monto}</TableCell>
                            <TableCell className="px-3 py-2 text-center">
                              <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/cotizacion/${r.id}/pdf`)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 transition"
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
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                                  title="Editar"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAskDelete(r)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
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
            </div>
          </ComponentCard>
          </div>

          {cotizacionToDelete && (
            <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="w-full max-w-md mx-4 sm:mx-auto">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30">
                  <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">¿Eliminar Cotización?</h3>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
                  ¿Estás seguro de que deseas eliminar la cotización para <span className="font-semibold">{cotizacionToDelete.cliente}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Modal>
          )}

        </div>
      )}
    </div>
  );
}