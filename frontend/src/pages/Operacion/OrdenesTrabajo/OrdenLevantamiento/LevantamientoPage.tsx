import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { apiUrl } from "@/config/api";

type Orden = {
  id: number;
  idx?: number;
  folio?: string | null;
  cliente?: string;
  fecha_inicio?: string;
  fecha_creacion?: string;
  status?: 'pendiente' | 'resuelto' | string;
  [k: string]: any;
};

export default function LevantamientoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({
    show: false,
    variant: 'info',
    title: '',
    message: '',
  });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const formatYmdToDMY = (ymd: string | null | undefined) => {
    if (!ymd) return '-';
    const s = ymd.toString().slice(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return '-';
    const dt = new Date(y, m - 1, d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          setOrdenes([]);
          setAlert({ show: true, variant: 'warning', title: 'Sin sesión', message: 'No se encontró token. Inicia sesión nuevamente.' });
          setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
          return;
        }

        const res = await fetch(apiUrl('/api/ordenes/'), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setOrdenes([]);
          setAlert({ show: true, variant: 'error', title: 'Error', message: 'No se pudieron cargar las órdenes.' });
          setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
          return;
        }
        const rows = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setOrdenes(rows);
      } catch (e) {
        setOrdenes([]);
        setAlert({ show: true, variant: 'error', title: 'Error', message: String(e) });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const levantamientos = useMemo(() => {
    const list = Array.isArray(ordenes) ? ordenes : [];
    return list.filter((o) => {
      const raw = (o as any)?.tipo_orden ?? (o as any)?.tipoOrden ?? (o as any)?.tipo ?? (o as any)?.order_type;
      return String(raw || '').toLowerCase() === 'levantamiento';
    });
  }, [ordenes]);

  const filteredLevantamientos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return levantamientos.filter((o) => {
      const folio = String(o?.folio ?? o?.idx ?? o?.id ?? '').toLowerCase();
      const cliente = String(o?.cliente ?? '').toLowerCase();

      const matchesQuery = !q || folio.includes(q) || cliente.includes(q);
      return matchesQuery;
    });
  }, [levantamientos, search]);

  const stats = useMemo(() => {
    const total = levantamientos.length;
    const resueltas = levantamientos.filter((o) => String(o.status || '').toLowerCase() === 'resuelto').length;
    const pendientes = total - resueltas;
    return { total, resueltas, pendientes };
  }, [levantamientos]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Levantamiento" description="Levantamiento" />
      <PageBreadcrumb pageTitle="Levantamiento" />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

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
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Pendientes</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.pendientes}</p>
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
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Resueltas</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.resueltas}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 dark:bg-white/5 dark:text-gray-200 dark:ring-white/10">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Órdenes de Levantamiento</h2>
                <div className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">Busca órdenes y abre el PDF de cada levantamiento.</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-[320px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por folio o cliente"
                className="w-full h-10 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 pl-9 pr-9 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14M4 12h16" strokeLinecap="round" />
              </svg>
              Nueva Orden
            </button>
          </div>
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40">
          <Table className="w-full min-w-[800px] table-fixed">
            <TableHeader className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10 text-[11px] font-semibold text-gray-900 dark:text-white">
              <TableRow>
                <TableCell isHeader className="px-2 py-2 text-left w-[90px] min-w-[80px] whitespace-nowrap text-gray-700 dark:text-gray-300">Folio</TableCell>
                <TableCell isHeader className="px-2 py-2 text-left w-2/5 min-w-[220px] whitespace-nowrap text-gray-700 dark:text-gray-300">Cliente</TableCell>
                <TableCell isHeader className="px-2 py-2 text-left w-[140px] min-w-[140px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fecha</TableCell>
                <TableCell isHeader className="px-2 py-2 text-center w-[120px] min-w-[120px] whitespace-nowrap text-gray-700 dark:text-gray-300">Estado</TableCell>
                <TableCell isHeader className="px-2 py-2 text-center w-[110px] min-w-[110px] whitespace-nowrap text-gray-700 dark:text-gray-300">Acciones</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-200">
              {loading && (
                <TableRow>
                  <TableCell className="px-2 py-3" colSpan={5}>Cargando...</TableCell>
                </TableRow>
              )}

              {!loading && filteredLevantamientos.length === 0 && (
                <TableRow>
                  <TableCell className="px-2 py-3" colSpan={5}>Sin órdenes de levantamiento.</TableCell>
                </TableRow>
              )}

              {!loading && filteredLevantamientos.map((orden, idx) => {
                const fecha = orden.fecha_inicio || orden.fecha_creacion || '';
                const fechaFmt = fecha ? formatYmdToDMY(fecha) : '-';
                const folioDisplay = (orden?.folio ?? '').toString().trim() || (orden.idx ?? (idx + 1));
                return (
                  <TableRow key={orden.id ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="px-2 py-2 whitespace-nowrap w-[90px] min-w-[80px]">{folioDisplay}</TableCell>
                    <TableCell className="px-2 py-2 text-gray-900 dark:text-white w-2/5 min-w-[220px]">
                      <div className="font-medium truncate">{orden.cliente || '-'}</div>
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap w-[140px] min-w-[140px]">{fechaFmt}</TableCell>
                    <TableCell className="px-2 py-2 text-center w-[120px] min-w-[120px]">
                      {String(orden.status || '').toLowerCase() === 'resuelto' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Resuelto</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-center w-[110px] min-w-[110px]">
                      <button
                        type="button"
                        onClick={() => navigate(`/ordenes/${orden.id}/pdf`)}
                        className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        PDF
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>
    </div>
  );
}
