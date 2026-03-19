import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import DatePicker from "@/components/form/date-picker";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { MobileOrderList } from "../OrdenServicio/MobileOrderCard";
import OrdenServicioModal from "@/pages/Operacion/OrdenesTrabajo/OrdenLevantamiento/OrdenLevantamientoModal";

type Orden = {
  id: number;
  idx?: number;
  folio?: string | null;
  cliente?: string;
  direccion?: string | null;
  telefono_cliente?: string | null;
  problematica?: string;
  servicios_realizados?: string[];
  comentario_tecnico?: string;
  fecha_inicio?: string;
  fecha_finalizacion?: string;
  fecha_creacion?: string;
  status?: "pendiente" | "resuelto" | string;
  nombre_encargado?: string;
  tecnico_asignado_full_name?: string;
  [k: string]: any;
};

function isGoogleMapsUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const s = String(value).trim();
  if (!s || !(s.startsWith("http://") || s.startsWith("https://"))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || "").toLowerCase();
    const href = u.href.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host.endsWith("google.com") && href.includes("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

export default function LevantamientoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"" | "pendiente" | "resuelto">("");
  const [filterDate, setFilterDate] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  const [problematicaModal, setProblematicaModal] = useState<{ open: boolean; content: string }>({ open: false, content: "" });
  const [serviciosModal, setServiciosModal] = useState<{ open: boolean; content: string[] }>({ open: false, content: [] });
  const [comentarioModal, setComentarioModal] = useState<{ open: boolean; content: string }>({ open: false, content: "" });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrdenForModal, setEditingOrdenForModal] = useState<Orden | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState<Orden | null>(null);
  const [alert, setAlert] = useState<{ show: boolean; variant: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    show: false,
    variant: "info",
    title: "",
    message: "",
  });

  const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

  const formatYmdToDMY = (ymd: string | null | undefined) => {
    if (!ymd) return "-";
    const s = ymd.toString().slice(0, 10);
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return "-";
    const dt = new Date(y, m - 1, d);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
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
          setAlert({ show: true, variant: "warning", title: "Sin sesión", message: "No se encontró token. Inicia sesión nuevamente." });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
          return;
        }
        const res = await fetch(apiUrl("/api/ordenes/"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setOrdenes([]);
          setAlert({ show: true, variant: "error", title: "Error", message: "No se pudieron cargar las órdenes." });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
          return;
        }
        const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setOrdenes(rows);
      } catch (e) {
        setOrdenes([]);
        setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!filterRef.current) return;
      const target = e.target as Node;
      if (filterRef.current.contains(target)) return;
      const fp = (e.target as Element).closest?.("[data-flatpickr-wrapper]");
      if (fp) return;
      setFilterOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const levantamientos = useMemo(() => {
    const list = Array.isArray(ordenes) ? ordenes : [];
    return list.filter((o) => {
      const raw = (o as any)?.tipo_orden ?? (o as any)?.tipoOrden ?? (o as any)?.tipo ?? (o as any)?.order_type;
      return String(raw || "").toLowerCase() === "levantamiento";
    });
  }, [ordenes]);

  const filteredLevantamientos = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = levantamientos.filter((o) => {
      const matchText =
        !q ||
        (o?.cliente?.toLowerCase().includes(q) ||
          (o?.folio ?? o?.idx ?? o?.id ?? "").toString().toLowerCase().includes(q) ||
          (o?.telefono_cliente ?? "").toString().includes(q) ||
          (o?.problematica ?? "").toLowerCase().includes(q) ||
          (o?.nombre_encargado ?? "").toLowerCase().includes(q));
      if (!matchText) return false;
      if (filterStatus && String(o?.status ?? "").toLowerCase() !== filterStatus) return false;
      if (filterDate) {
        const base = (o?.fecha_inicio ?? o?.fecha_creacion ?? "").toString().slice(0, 10);
        if (!base.startsWith(filterDate)) return false;
      }
      return true;
    });
    const toTs = (v: any) => {
      if (!v) return 0;
      const t = Date.parse(String(v));
      return Number.isFinite(t) ? t : 0;
    };
    return list.slice().sort((a, b) => {
      const ai = toTs((a as any).fecha_inicio) || 0;
      const bi = toTs((b as any).fecha_inicio) || 0;
      if (bi !== ai) return bi - ai;
      const ac = toTs((a as any).fecha_creacion) || 0;
      const bc = toTs((b as any).fecha_creacion) || 0;
      if (bc !== ac) return bc - ac;
      return Number((b as any).id || 0) - Number((a as any).id || 0);
    });
  }, [levantamientos, search, filterStatus, filterDate]);

  const stats = useMemo(() => {
    const total = levantamientos.length;
    const resueltas = levantamientos.filter((o) => String(o?.status || "").toLowerCase() === "resuelto").length;
    const pendientes = total - resueltas;
    return { total, resueltas, pendientes };
  }, [levantamientos]);

  const handleEdit = (orden: Orden) => {
    setEditingOrdenForModal(orden);
    setShowOrderModal(true);
  };

  const handleDeleteClick = (orden: Orden) => {
    setOrdenToDelete(orden);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!ordenToDelete) return;
    const token = getToken();
    try {
      const response = await fetch(apiUrl(`/api/ordenes/${ordenToDelete.id}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setOrdenes((prev) => prev.filter((o) => (o as any).id !== ordenToDelete.id));
        setShowDeleteModal(false);
        setOrdenToDelete(null);
        setAlert({ show: true, variant: "success", title: "Orden eliminada", message: `La orden para "${ordenToDelete.cliente}" ha sido eliminada.` });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      } else {
        if (response.status === 403) {
          setAlert({ show: true, variant: "error", title: "Sin permisos", message: "No tienes permisos para eliminar esta orden." });
        } else if (response.status === 404) {
          setAlert({ show: true, variant: "error", title: "No encontrada", message: "La orden no existe o ya no tienes acceso." });
        } else {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo eliminar la orden." });
        }
        // Si ya fue eliminada en BD (404) u ocurre un problema de permisos,
        // recargamos para sincronizar UI con el backend.
        await fetchOrdenes();
        setShowDeleteModal(false);
        setOrdenToDelete(null);
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
      }
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "Error al eliminar la orden." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
      // Mantener la UI consistente ante fallos de red/back.
      await fetchOrdenes();
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setOrdenToDelete(null);
  };

  const fetchOrdenes = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/ordenes/?_ts=${Date.now()}`), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
        console.debug("[LevantamientoPage] fetchOrdenes idx:", rows.map((r: any) => Number(r?.idx || 0)).filter((n: number) => Number.isFinite(n)));
        setOrdenes(rows);
      }
    } catch {
      setOrdenes([]);
    }
  };

  const startIndex = 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Levantamiento" description="Levantamiento" />
      <PageBreadcrumb pageTitle="Levantamiento" />

      {alert.show && <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />}

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
                <div className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">Busca órdenes y abre el PDF o edita en Órdenes.</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-[320px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por folio, cliente, teléfono..."
                className="w-full h-10 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 pl-9 pr-9 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
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
              onClick={() => { setEditingOrdenForModal(null); setShowOrderModal(true); }}
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

      <ComponentCard
        title="Listado"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <div className="relative w-full" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="shadow-theme-xs flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 sm:min-w-[86px] text-xs font-semibold leading-none whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7h13" />
                  <path d="M3 12h10" />
                  <path d="M3 17h7" />
                  <path d="M18 7v10" />
                  <path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Filtros
              </button>
              {filterOpen && (
                <div className="absolute right-0 z-20 mt-2 w-72 max-h-80 overflow-auto rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-gray-900/80 p-4 shadow-lg backdrop-blur-sm">
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Estado</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as "" | "pendiente" | "resuelto")}
                      className="h-10 w-full rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 px-3 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
                    >
                      <option value="">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                    <div className="relative w-full">
                      <DatePicker
                        id="filtro-fecha-levantamiento"
                        label={undefined as any}
                        placeholder="Seleccionar fecha"
                        defaultDate={filterDate || undefined}
                        appendToBody={true}
                        onChange={(_dates: any, currentDateString: string) => setFilterDate(currentDateString || "")}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="bg-brand-600 hover:bg-brand-700 h-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus("");
                        setFilterDate("");
                        setFilterOpen(false);
                      }}
                      className="h-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className="p-2 pt-0">
          <MobileOrderList
            ordenes={filteredLevantamientos}
            startIndex={startIndex}
            loading={loading}
            formatDate={formatYmdToDMY}
            onPdf={(id) => navigate(`/ordenes/${id}/pdf`)}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            canEdit={true}
            canDelete={true}
            usuarios={[]}
          />
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40">
            <Table className="w-full min-w-[900px] sm:min-w-0 table-fixed">
              <TableHeader className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10 text-[11px] font-semibold text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-[90px] min-w-[80px] whitespace-nowrap text-gray-700 dark:text-gray-300">Folio</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-2/5 min-w-[220px] whitespace-nowrap text-gray-700 dark:text-gray-300">Cliente</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/5 min-w-[220px] text-gray-700 dark:text-gray-300">Detalles</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-[130px] min-w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fechas</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-[160px] min-w-[160px] whitespace-nowrap text-gray-700 dark:text-gray-300">Técnico</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-[110px] min-w-[110px] whitespace-nowrap text-gray-700 dark:text-gray-300">Estado</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-[120px] min-w-[120px] whitespace-nowrap text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-200">
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-2 py-3">
                      Cargando...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredLevantamientos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-2 py-3">
                      Sin órdenes de levantamiento.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filteredLevantamientos.map((orden, idx) => {
                    const fecha = orden.fecha_inicio || orden.fecha_creacion || "";
                    const fechaFmt = fecha ? formatYmdToDMY(fecha) : "-";
                    const finFmt = orden.fecha_finalizacion ? formatYmdToDMY(orden.fecha_finalizacion) : "-";
                    const folioDisplay = (orden?.folio ?? "").toString().trim() || (orden.idx ?? startIndex + idx + 1);
                    const tecnicoNombre =
                      (orden as any).tecnico_asignado_full_name || (orden as any).nombre_encargado || "-";
                    return (
                      <TableRow key={orden.id ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <TableCell className="px-2 py-2 whitespace-nowrap w-[90px] min-w-[80px]">{folioDisplay}</TableCell>
                        <TableCell className="px-2 py-2 text-gray-900 dark:text-white w-1/5 min-w-[220px]">
                          <div className="font-medium truncate">{orden.cliente || "Sin cliente"}</div>
                          {orden.direccion &&
                            (isGoogleMapsUrl(orden.direccion) ? (
                              <a href={orden.direccion} target="_blank" rel="noreferrer" className="block text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate">
                                {orden.direccion}
                              </a>
                            ) : (
                              <span className="block text-[11px] text-gray-600 dark:text-gray-400 truncate" title={orden.direccion}>
                                {orden.direccion}
                              </span>
                            ))}
                          {orden.telefono_cliente && (
                            <a href={`tel:${orden.telefono_cliente}`} className="inline-block text-[11px] text-gray-600 dark:text-gray-400">
                              {orden.telefono_cliente}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2 w-2/5 min-w-[220px] whitespace-normal">
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              type="button"
                              onClick={() => setProblematicaModal({ open: true, content: orden.problematica || "-" })}
                              className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                              title="Ver problemática"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Problemática
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setServiciosModal({
                                  open: true,
                                  content: Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : [],
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                              title="Ver servicios realizados"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              Servicios
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2 whitespace-nowrap w-[130px] min-w-[130px]">
                          <div className="text-[12px] text-gray-700 dark:text-gray-300">
                            <div>
                              <span className="text-gray-500">Inicio:</span> {fechaFmt}
                            </div>
                            <div>
                              <span className="text-gray-500">Fin:</span> {finFmt}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2 whitespace-nowrap w-[160px] min-w-[160px]">
                          <div className="space-y-1">
                            <div className="text-[12px] text-gray-700 dark:text-gray-300 truncate">{tecnicoNombre}</div>
                            <button
                              type="button"
                              onClick={() => setComentarioModal({ open: true, content: (orden.comentario_tecnico || "") as string })}
                              className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                              title="Ver comentario del técnico"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                              </svg>
                              Comentarios
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center w-[110px] min-w-[110px]">
                          {String(orden?.status ?? "").toLowerCase() === "resuelto" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Resuelto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Pendiente
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center w-[120px] min-w-[120px]">
                          <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/ordenes/${orden.id}/pdf`)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-red-400 hover:text-red-600 dark:hover:border-red-500 transition"
                              title="Ver PDF"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                                <g>
                                  <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
                                  <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
                                  <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
                                  <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
                                </g>
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(orden)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(orden)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                              title="Eliminar"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>

      <Modal isOpen={problematicaModal.open} onClose={() => setProblematicaModal({ open: false, content: "" })} closeOnBackdropClick={false} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Problemática</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Detalle completo reportado por el cliente</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">{problematicaModal.content || "-"}</pre>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setProblematicaModal({ open: false, content: "" })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={serviciosModal.open} onClose={() => setServiciosModal({ open: false, content: [] })} closeOnBackdropClick={false} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Servicios Realizados</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Listado de servicios registrados</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {Array.isArray(serviciosModal.content) && serviciosModal.content.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviciosModal.content.map((s: string, i: number) => (
                  <li key={i} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/10 p-4 text-center text-gray-500 dark:text-gray-400">Sin servicios registrados</div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setServiciosModal({ open: false, content: [] })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={comentarioModal.open} onClose={() => setComentarioModal({ open: false, content: "" })} closeOnBackdropClick={false} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Comentario del Técnico</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Observaciones y notas del técnico</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">{comentarioModal.content || "-"}</pre>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setComentarioModal({ open: false, content: "" })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      <OrdenServicioModal
        open={showOrderModal}
        onClose={() => { setShowOrderModal(false); setEditingOrdenForModal(null); }}
        orden={editingOrdenForModal}
        forceTipoOrden="levantamiento"
        onSaved={() => { fetchOrdenes(); setShowOrderModal(false); setEditingOrdenForModal(null); setAlert({ show: true, variant: "success", title: "Orden guardada", message: "La orden se guardó correctamente." }); setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500); }}
        getToken={getToken}
      />

      {ordenToDelete && (
        <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} closeOnBackdropClick={false} className="w-full max-w-md mx-4 sm:mx-auto">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30">
              <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">¿Eliminar Orden?</h3>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar la orden para <span className="font-semibold">{ordenToDelete.cliente}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleCancelDelete} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/50">
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
