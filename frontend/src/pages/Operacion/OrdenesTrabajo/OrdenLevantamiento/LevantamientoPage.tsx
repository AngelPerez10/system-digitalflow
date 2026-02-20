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

  return (
    <>
      <PageMeta title="Levantamiento" description="Levantamiento" />
      <PageBreadcrumb pageTitle="Levantamiento" />

      <ComponentCard title="Levantamiento">
        {alert.show && (
          <div className="mb-4">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        )}

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

              {!loading && levantamientos.length === 0 && (
                <TableRow>
                  <TableCell className="px-2 py-3" colSpan={5}>Sin órdenes de levantamiento.</TableCell>
                </TableRow>
              )}

              {!loading && levantamientos.map((orden, idx) => {
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
    </>
  );
}
