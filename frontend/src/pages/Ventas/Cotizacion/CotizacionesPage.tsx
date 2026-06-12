import PageMeta from "@/components/common/PageMeta";
import { useEffect, useId, useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { useNavigate } from "react-router-dom";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import {
  CotizacionPageHeader,
  CotizacionStatsCards,
  CotizacionesMobileList,
  CotizacionesTable,
  type CotizacionRow,
} from "@/components/cotizacion/CotizacionesViewParts";
import { erpPageCanvasClass, erpPageInnerClass } from "@/layout/erpPageStyles";

const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const searchInputClass =
  "min-h-[44px] w-full rounded-2xl border border-[#e2d9ca] bg-[#fffdf8] py-2 pl-10 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#7c7a74] focus:border-[#ff801f]/60 focus:ring-4 focus:ring-[#ff801f]/12 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20 sm:min-h-[46px] sm:pl-11";

const medioChipClass =
  "border border-[#e2d9ca] bg-[#fff8f1] text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1]";

const monthNavBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9ca] bg-[#fffdfa] text-[#57534e] transition-colors hover:bg-[#fffdf8] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]";

let lastPermissionsFetchAt = 0;
let lastCotizacionesFetchAt = 0;

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
  const excelLoadingTitleId = useId();
  const deleteModalTitleId = useId();
  const [permissions, setPermissions] = useState<any>({});

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

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const navigate = useNavigate();

  const [rows, setRows] = useState<CotizacionRow[]>([]);
  const [loading, setLoading] = useState(false);

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
    const now = Date.now();
    if (now - lastPermissionsFetchAt < 2000) return;
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
        const p = data?.permissions || {};
        setPermissions(p);
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

    const now = Date.now();
    if (now - lastCotizacionesFetchAt < 2000) return;
    lastCotizacionesFetchAt = now;

    setLoading(true);
    try {
      const res = await fetchApi('/api/cotizaciones/', { method: 'GET' });
      if (res.status === 401) {
        clearSessionAndGoToLogin();
        return;
      }
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
          clienteTelefono: String(x?.cliente_telefono || '—'),
          contacto: String(x?.contacto || '—'),
          tipoTrabajo: String(x?.tipo_trabajo_nombres || '').trim() || '—',
          monto: formatMoney(Number(x?.total ?? 0)),
          totalAmount: Number(x?.total ?? 0) || 0,
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
    let list = rows;
    if (q) {
      list = rows.filter((r) => {
        return (
          String(r.idx || '').toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.contacto.toLowerCase().includes(q) ||
          r.creadaPor.toLowerCase().includes(q) ||
          r.editadaPor.toLowerCase().includes(q)
        );
      });
    }
    if (selectedMonth) {
      list = list.filter((r) => {
        const fecha = String(r.fecha || '').trim();
        return fecha.startsWith(selectedMonth);
      });
    }
    return list;
  }, [rows, searchTerm, selectedMonth]);

  const monthRows = useMemo(() => {
    if (!selectedMonth) return rows;
    return rows.filter((r) => String(r.fecha || "").trim().startsWith(selectedMonth));
  }, [rows, selectedMonth]);

  const stats = useMemo(() => {
    const sumAmount = (list: CotizacionRow[]) =>
      list.reduce((acc, r) => acc + (Number.isFinite(r.totalAmount) ? r.totalAmount : 0), 0);

    const byStatus = (status: string) =>
      monthRows.filter((r) => String(r.status || "").toUpperCase() === status);

    const pendientesRows = monthRows.filter((r) => {
      const s = String(r.status || "").toUpperCase();
      return s === "PENDIENTE" || !String(r.status || "").trim();
    });

    return {
      total: formatMoney(sumAmount(monthRows)),
      autorizadas: formatMoney(sumAmount(byStatus("AUTORIZADA"))),
      pendientes: formatMoney(sumAmount(pendientesRows)),
      canceladas: formatMoney(sumAmount(byStatus("CANCELADA"))),
    };
  }, [monthRows]);

  const handleOpenPdf = (id: number) => navigate(`/cotizacion/${id}/pdf`);

  const handleEditRow = (r: CotizacionRow) => {
    if (!canCotizacionesEdit) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para editar cotizaciones." });
      window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
      return;
    }
    navigate(`/cotizacion/${r.id}/editar`);
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
      const fallbackIdx = r.idx ? String(r.idx) : sid;
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
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass}>
      <PageMeta title="Cotizaciones | Sistema Grupo Intrax GPS" description="Gestión de cotizaciones" />

      <Modal
        isOpen={excelLoading}
        onClose={() => {}}
        showCloseButton={false}
        className="mx-4 max-w-md sm:mx-auto"
        ariaLabelledBy={excelLoadingTitleId}
      >
        <div className="p-7 sm:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#111a2b]/90">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#e2d9ca] bg-[#fffdfa] dark:border-[#334155] dark:bg-[#0f172a]">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#ff801f] dark:border-t-[#ffa057]" />
                  <svg className="relative h-7 w-7 text-emerald-700 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M8.5 13h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8.5 16.5H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8.5 10H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <h3 id={excelLoadingTitleId} className="text-base font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-lg">Generando Excel</h3>
            <p className="mt-1.5 text-xs text-[#78716c] dark:text-[#8ea0b8] sm:text-sm">Esto puede tardar unos segundos. No cierres esta ventana.</p>

            <div className="mt-6 w-full">
              <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#8ea0b8]">
                <span>Progreso</span>
                <span className="font-medium tabular-nums">{Math.min(99, Math.max(0, Math.round(excelLoadingProgress)))}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[#e2d9ca] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]">
                <div
                  className="h-full bg-[#ff801f] transition-[width] duration-500 ease-out dark:bg-[#ff801f]"
                  style={{ width: `${Math.min(100, Math.max(0, excelLoadingProgress))}%` }}
                />
              </div>
              <div className="mt-3 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">Preparando archivo XLSX…</div>
            </div>
          </div>
        </div>
      </Modal>

      {alert.show && (
        <div role="alert" aria-live={alert.variant === "error" ? "assertive" : "polite"}>
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        </div>
      )}

      {!canCotizacionesView ? (
        <div className="rounded-3xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-10 text-center text-sm text-[#57534e] shadow-[0_20px_50px_-36px_rgba(28,25,23,0.2)] dark:border-[#273244] dark:bg-[#111827]/80 dark:text-[#b7c1d1] sm:px-6">
          No tienes permiso para ver Cotizaciones.
        </div>
      ) : (
        <>
          <CotizacionPageHeader cardShellClass={cardShellClass} />
          <CotizacionStatsCards cardShellClass={cardShellClass} stats={stats} />

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
            <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b]"
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
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg text-[#78716c] hover:bg-black/[0.04] hover:text-[#1c1917] dark:text-[#8ea0b8] dark:hover:bg-white/[0.06] dark:hover:text-white"
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
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-xs font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:scale-[0.99] sm:w-auto sm:min-h-0 lg:shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Nueva cotización
            </button>
          </div>

          <ComponentCard
            title="Listado de cotizaciones"
            className={`!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)] ${cardShellClass}`}
            compact
          >
            <CotizacionesMobileList
              rows={shownList}
              loading={loading}
              formatDMY={formatDMY}
              normalizeMedioLabel={normalizeMedioLabel}
              statusChipClass={statusChipClass}
              medioChipClass={medioChipClass}
              actions={rowActions}
              excelLoading={excelLoading}
            />
            <CotizacionesTable
              rows={shownList}
              loading={loading}
              formatDMY={formatDMY}
              normalizeMedioLabel={normalizeMedioLabel}
              statusChipClass={statusChipClass}
              medioChipClass={medioChipClass}
              actions={rowActions}
              excelLoading={excelLoading}
            />
          </ComponentCard>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
              Mostrando <span className="font-medium text-[#1c1917] dark:text-[#f8fafc]">{shownList.length}</span> cotizaciones
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return;
                  const d = new Date(ym.year, ym.month - 2, 1);
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  setSelectedMonth(`${d.getFullYear()}-${mm}`);
                }}
                className={monthNavBtnClass}
                title="Mes anterior"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="min-w-[130px] text-center text-[11px] text-[#57534e] sm:min-w-[160px] sm:text-[12px] dark:text-[#cbd5e1]">
                {(() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return selectedMonth || 'Todos los meses';
                  return new Date(ym.year, ym.month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                })()}
              </span>
              <button
                type="button"
                onClick={() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return;
                  const dt = new Date(ym.year, ym.month - 1, 1);
                  dt.setMonth(dt.getMonth() + 1);
                  const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(next);
                }}
                className={monthNavBtnClass}
                title="Mes siguiente"
              >
                <svg className="w-4 h-4 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6 6 6" />
                </svg>
              </button>
            </div>
          </div>

          {cotizacionToDelete && (
            <Modal
              isOpen={showDeleteModal}
              onClose={handleCancelDelete}
              className="mx-4 w-full max-w-md sm:mx-auto"
              ariaLabelledBy={deleteModalTitleId}
            >
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
                <h3
                  id={deleteModalTitleId}
                  className="mb-2 text-center text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg"
                >
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
