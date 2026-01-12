import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import { apiUrl } from "@/config/api";

type KpiVenta = {
  id: number;
  idx: number;
  no_cliente: number | null;
  fecha_lead: string | null;
  nombre_cliente: string;
  telefono: string;
  correo: string;
  canal_contacto: string;
  linea_sistema: string;
  producto_servicio: string;
  no_cotizacion: string;
  levantamiento: string;
  monto_cotizado: string | number | null;
  status: string;
  probabilidad: number | null;
  responsable: string;
  fecha_cierre: string | null;
  monto_vendido: string | number | null;
  motivo_perdida: string;
  proxima_accion: string;
  fecha_proxima_accion: string | null;
  notas: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
};

const getToken = () => {
  return (
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  ).trim();
};

const toYmd = (v: any): string => {
  if (!v) return "";
  try {
    const s = String(v);
    return s.slice(0, 10);
  } catch {
    return "";
  }
};

const onlyDigits10 = (v: string): string => {
  return (v || "").replace(/\D/g, "").slice(0, 10);
};

const isInCurrentMonth = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const s = String(dateStr).slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
};

const parseAmount = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n || 0);

export default function KpiVentasPage() {
  const [rows, setRows] = useState<KpiVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<KpiVenta | null>(null);
  const [editingRow, setEditingRow] = useState<KpiVenta | null>(null);
  const [modalError, setModalError] = useState<string>("");

  const [formData, setFormData] = useState<Omit<KpiVenta, "id" | "idx">>({
    no_cliente: null,
    fecha_lead: null,
    nombre_cliente: "",
    telefono: "",
    correo: "",
    canal_contacto: "",
    linea_sistema: "",
    producto_servicio: "",
    no_cotizacion: "",
    levantamiento: "",
    monto_cotizado: null,
    status: "",
    probabilidad: null,
    responsable: "",
    fecha_cierre: null,
    monto_vendido: null,
    motivo_perdida: "",
    proxima_accion: "",
    fecha_proxima_accion: null,
    notas: "",
  });

  const fetchRows = async () => {
    const token = getToken();
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/kpi-ventas/"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setAlert({ show: true, variant: "error", title: "Error", message: txt || "No se pudieron cargar los KPI." });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
        setRows([]);
        return;
      }

      const data = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const shownRows = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter((r) => {
      const hay = [
        r.nombre_cliente,
        r.telefono,
        r.correo,
        r.canal_contacto,
        r.linea_sistema,
        r.producto_servicio,
        r.no_cotizacion,
        r.status,
        r.responsable,
        r.proxima_accion,
        r.notas,
        r.motivo_perdida,
      ]
        .map((x) => (x || "").toString().toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [rows, searchTerm]);

  const kpiStats = useMemo(() => {
    const monthRows = (rows || []).filter(r => isInCurrentMonth(r.fecha_lead));
    const monthTotal = monthRows.length;
    const monthClosed = (rows || []).filter(r => isInCurrentMonth(r.fecha_cierre)).length;
    const monthQuotedTotal = monthRows.reduce((acc, r) => acc + parseAmount(r.monto_cotizado), 0);

    const counts: Record<string, number> = {};
    for (const r of monthRows) {
      const name = (r.nombre_cliente || "").trim() || "(Sin nombre)";
      counts[name] = (counts[name] || 0) + 1;
    }
    let starName = "—";
    let starCount = 0;
    for (const [name, cnt] of Object.entries(counts)) {
      if (cnt > starCount) {
        starName = name;
        starCount = cnt;
      }
    }
    return { monthTotal, monthClosed, monthQuotedTotal, starName, starCount };
  }, [rows]);

  const openCreate = () => {
    setEditingRow(null);
    setModalError("");
    setFormData({
      no_cliente: null,
      fecha_lead: null,
      nombre_cliente: "",
      telefono: "",
      correo: "",
      canal_contacto: "",
      linea_sistema: "",
      producto_servicio: "",
      no_cotizacion: "",
      levantamiento: "",
      monto_cotizado: null,
      status: "",
      probabilidad: null,
      responsable: "",
      fecha_cierre: null,
      monto_vendido: null,
      motivo_perdida: "",
      proxima_accion: "",
      fecha_proxima_accion: null,
      notas: "",
    });
    setShowModal(true);
  };

  const openEdit = (r: KpiVenta) => {
    setEditingRow(r);
    setModalError("");
    setFormData({
      no_cliente: r.no_cliente ?? null,
      fecha_lead: r.fecha_lead ?? null,
      nombre_cliente: r.nombre_cliente || "",
      telefono: r.telefono || "",
      correo: r.correo || "",
      canal_contacto: r.canal_contacto || "",
      linea_sistema: r.linea_sistema || "",
      producto_servicio: r.producto_servicio || "",
      no_cotizacion: r.no_cotizacion || "",
      levantamiento: r.levantamiento || "",
      monto_cotizado: (r.monto_cotizado as any) ?? null,
      status: r.status || "",
      probabilidad: r.probabilidad ?? null,
      responsable: r.responsable || "",
      fecha_cierre: r.fecha_cierre ?? null,
      monto_vendido: (r.monto_vendido as any) ?? null,
      motivo_perdida: r.motivo_perdida || "",
      proxima_accion: r.proxima_accion || "",
      fecha_proxima_accion: r.fecha_proxima_accion ?? null,
      notas: r.notas || "",
    });
    setShowModal(true);
  };

  const validate = () => {
    const missing: string[] = [];
    if (!formData.nombre_cliente?.trim()) missing.push("Nombre del Cliente");
    return { ok: missing.length === 0, missing };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    setModalError("");

    const { ok, missing } = validate();
    if (!ok) {
      setAlert({ show: true, variant: "warning", title: "Campos requeridos", message: `Faltan: ${missing.join(", ")}` });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      return;
    }

    const toNullIfEmpty = (v: any) => (typeof v === "string" && v.trim() === "" ? null : v);

    const payload: any = {
      ...formData,
      no_cliente: formData.no_cliente === null || formData.no_cliente === undefined || formData.no_cliente === ("" as any) ? null : Number(formData.no_cliente),
      probabilidad: formData.probabilidad === null || formData.probabilidad === undefined || formData.probabilidad === ("" as any) ? null : Number(formData.probabilidad),
      monto_cotizado: toNullIfEmpty(formData.monto_cotizado),
      monto_vendido: toNullIfEmpty(formData.monto_vendido),
      fecha_lead: toNullIfEmpty(formData.fecha_lead),
      fecha_cierre: toNullIfEmpty(formData.fecha_cierre),
      fecha_proxima_accion: toNullIfEmpty(formData.fecha_proxima_accion),
    };

    const url = editingRow ? apiUrl(`/api/kpi-ventas/${editingRow.id}/`) : apiUrl("/api/kpi-ventas/");
    const method = editingRow ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = txt || "No se pudo guardar.";
        try {
          const data = JSON.parse(txt || "{}");
          if (data && typeof data === "object") {
            msg = Object.entries(data)
              .map(([k, v]) => {
                if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
                if (typeof v === "string") return `${k}: ${v}`;
                return `${k}: ${JSON.stringify(v)}`;
              })
              .join("\n");
          }
        } catch {
          // keep msg as plain text
        }
        setModalError(msg);
        return;
      }

      setShowModal(false);
      setEditingRow(null);
      setModalError("");
      await fetchRows();
      setAlert({
        show: true,
        variant: "success",
        title: editingRow ? "Actualizado" : "Creado",
        message: editingRow ? "Registro actualizado." : "Registro creado.",
      });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
    } catch (err: any) {
      setModalError(String(err));
    }
  };

  const confirmDelete = (r: KpiVenta) => {
    setRowToDelete(r);
    setShowDeleteModal(true);
  };

  const doDelete = async () => {
    const token = getToken();
    if (!token || !rowToDelete) return;

    try {
      const res = await fetch(apiUrl(`/api/kpi-ventas/${rowToDelete.id}/`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setAlert({ show: true, variant: "error", title: "Error", message: txt || "No se pudo eliminar." });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
        return;
      }

      setShowDeleteModal(false);
      setRowToDelete(null);
      await fetchRows();
      setAlert({ show: true, variant: "success", title: "Eliminado", message: "Registro eliminado." });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
    } catch (err: any) {
      setAlert({ show: true, variant: "error", title: "Error", message: String(err) });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="p-4 sm:p-6 space-y-4 overflow-x-hidden">
      <PageMeta title="KPI Ventas | Sistema Intrax" description="KPI Ventas" />
      <PageBreadcrumb pageTitle="KPI Ventas" />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Leads del mes</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{kpiStats.monthTotal}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 12h18M12 3v18" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Monto cotizado</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(kpiStats.monthQuotedTotal)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Cerradas</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{kpiStats.monthClosed}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex flex-col min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Cliente estrella</p>
              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{kpiStats.starName}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Leads: {kpiStats.starCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">KPI Ventas</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
          <div className="relative w-full sm:max-w-xs md:max-w-sm">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
              <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar"
              className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-2 text-[13px] text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
          <button
            onClick={openCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14M4 12h16" strokeLinecap="round" />
            </svg>
            Nuevo
          </button>
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="p-2">
          <div className="w-full max-w-full overflow-x-auto overflow-y-auto max-h-[70vh]">
            <Table className="w-full min-w-max">
              <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-1.5 py-1 text-left w-[44px] whitespace-nowrap text-gray-700 dark:text-gray-300">ID</TableCell>
                  <TableCell isHeader className="hidden lg:table-cell px-1.5 py-1 text-left w-[75px] whitespace-nowrap text-gray-700 dark:text-gray-300">No. Cliente</TableCell>
                  <TableCell isHeader className="hidden md:table-cell px-1.5 py-1 text-left w-[90px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fecha Lead</TableCell>
                  <TableCell isHeader className="px-1.5 py-1 text-left w-[140px] whitespace-nowrap text-gray-700 dark:text-gray-300">Nombre</TableCell>
                  <TableCell isHeader className="px-1.5 py-1 text-left w-[105px] whitespace-nowrap text-gray-700 dark:text-gray-300">Teléfono</TableCell>
                  <TableCell isHeader className="hidden lg:table-cell px-1.5 py-1 text-left w-[140px] whitespace-nowrap text-gray-700 dark:text-gray-300">Correo</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Canal</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[140px] whitespace-nowrap text-gray-700 dark:text-gray-300">Línea Sistema</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[170px] whitespace-nowrap text-gray-700 dark:text-gray-300">Producto/Servicio</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">No. Cotización</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Levantamiento</TableCell>
                  <TableCell isHeader className="hidden lg:table-cell px-1.5 py-1 text-left w-[120px] whitespace-nowrap text-gray-700 dark:text-gray-300">Monto Cotizado</TableCell>
                  <TableCell isHeader className="px-1.5 py-1 text-left w-[95px] whitespace-nowrap text-gray-700 dark:text-gray-300">Status</TableCell>
                  <TableCell isHeader className="px-1.5 py-1 text-left w-[60px] whitespace-nowrap text-gray-700 dark:text-gray-300">Prob.</TableCell>
                  <TableCell isHeader className="px-1.5 py-1 text-left w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Responsable</TableCell>
                  <TableCell isHeader className="hidden md:table-cell px-1.5 py-1 text-left w-[110px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fecha Cierre</TableCell>
                  <TableCell isHeader className="hidden lg:table-cell px-1.5 py-1 text-left w-[120px] whitespace-nowrap text-gray-700 dark:text-gray-300">Monto Vendido</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[180px] whitespace-nowrap text-gray-700 dark:text-gray-300">Motivo Pérdida</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[180px] whitespace-nowrap text-gray-700 dark:text-gray-300">Próxima Acción</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fecha Próx. Acción</TableCell>
                  <TableCell isHeader className="hidden xl:table-cell px-1.5 py-1 text-left w-[200px] whitespace-nowrap text-gray-700 dark:text-gray-300">Notas</TableCell>
                  <TableCell isHeader className="px-1.5 py-1 text-center w-[96px] whitespace-nowrap text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[10px] text-gray-700 dark:text-gray-200">
                {!loading && shownRows.length === 0 && (
                  <TableRow>
                    <TableCell className="px-2 py-3" colSpan={100}>
                      <div className="text-center text-[12px] text-gray-500">Sin registros</div>
                    </TableCell>
                  </TableRow>
                )}
                {shownRows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="px-1.5 py-1 whitespace-nowrap">{r.idx ?? r.id}</TableCell>
                    <TableCell className="hidden lg:table-cell px-1.5 py-1 whitespace-nowrap">{r.no_cliente ?? ""}</TableCell>
                    <TableCell className="hidden md:table-cell px-1.5 py-1 whitespace-nowrap">{toYmd(r.fecha_lead)}</TableCell>
                    <TableCell className="px-1.5 py-1 whitespace-nowrap text-gray-900 dark:text-white">
                      <div className="font-medium truncate" title={r.nombre_cliente}>{r.nombre_cliente}</div>
                    </TableCell>
                    <TableCell className="px-1.5 py-1 whitespace-nowrap">{r.telefono || ""}</TableCell>
                    <TableCell className="hidden lg:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.correo || ""}>{r.correo || ""}</div></TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.canal_contacto || ""}>{r.canal_contacto || ""}</div></TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.linea_sistema || ""}>{r.linea_sistema || ""}</div></TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.producto_servicio || ""}>{r.producto_servicio || ""}</div></TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap">{r.no_cotizacion || ""}</TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap">{r.levantamiento || ""}</TableCell>
                    <TableCell className="hidden lg:table-cell px-1.5 py-1 whitespace-nowrap">{r.monto_cotizado ?? ""}</TableCell>
                    <TableCell className="px-1.5 py-1 whitespace-nowrap">{r.status || ""}</TableCell>
                    <TableCell className="px-1.5 py-1 whitespace-nowrap">{r.probabilidad ?? ""}</TableCell>
                    <TableCell className="px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.responsable || ""}>{r.responsable || ""}</div></TableCell>
                    <TableCell className="hidden md:table-cell px-1.5 py-1 whitespace-nowrap">{toYmd(r.fecha_cierre)}</TableCell>
                    <TableCell className="hidden lg:table-cell px-1.5 py-1 whitespace-nowrap">{r.monto_vendido ?? ""}</TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.motivo_perdida || ""}>{r.motivo_perdida || ""}</div></TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.proxima_accion || ""}>{r.proxima_accion || ""}</div></TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap">{toYmd(r.fecha_proxima_accion)}</TableCell>
                    <TableCell className="hidden xl:table-cell px-1.5 py-1 whitespace-nowrap"><div className="truncate" title={r.notas || ""}>{r.notas || ""}</div></TableCell>
                    <TableCell className="px-1.5 py-1 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="group inline-flex items-center justify-center w-6 h-6 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                          title="Editar"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 20h9" strokeLinecap="round" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(r)}
                          className="group inline-flex items-center justify-center w-6 h-6 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                          title="Eliminar"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M3 6h18" strokeLinecap="round" />
                            <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6" strokeLinecap="round" />
                            <path d="M14 11v6" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} className="w-[94vw] max-w-4xl max-h-[92vh] p-0 overflow-hidden">
        <div>
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14" strokeLinecap="round" />
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {editingRow ? "Editar KPI" : "Nuevo KPI"}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  KPI Ventas
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {modalError && (
              <div className="space-y-2">
                <Alert variant="error" title="Error al guardar" message={modalError} />
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" strokeLinecap="round" />
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Datos del Lead / Cliente</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>No. de cliente</Label>
                    <Input
                      type="number"
                      value={formData.no_cliente ?? ""}
                      onChange={(e) => setFormData({ ...formData, no_cliente: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <DatePicker
                      id="kpi-fecha-lead"
                      label="Fecha Lead"
                      placeholder="Seleccionar fecha"
                      defaultDate={toYmd(formData.fecha_lead) || undefined}
                      onChange={(_dates, currentDateString) => {
                        const v = (currentDateString || "").slice(0, 10);
                        const next = v ? v : null;
                        if (toYmd(formData.fecha_lead) === (next || "")) return;
                        setFormData({ ...formData, fecha_lead: next });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Nombre del Cliente</Label>
                    <Input
                      value={formData.nombre_cliente}
                      onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono (10 dígitos)</Label>
                    <Input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: onlyDigits10(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Correo</Label>
                    <Input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Canal de contacto</Label>
                    <Input
                      value={formData.canal_contacto}
                      onChange={(e) => setFormData({ ...formData, canal_contacto: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 7h10M7 11h10M7 15h6" strokeLinecap="round" />
                  <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cotización / Venta</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Línea del Sistema</Label>
                    <Input
                      value={formData.linea_sistema}
                      onChange={(e) => setFormData({ ...formData, linea_sistema: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Producto / Servicio</Label>
                    <Input
                      value={formData.producto_servicio}
                      onChange={(e) => setFormData({ ...formData, producto_servicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>No. de Cotización</Label>
                    <Input
                      value={formData.no_cotizacion}
                      onChange={(e) => setFormData({ ...formData, no_cotizacion: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Levantamiento</Label>
                    <Input
                      value={formData.levantamiento}
                      onChange={(e) => setFormData({ ...formData, levantamiento: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Monto Cotizado</Label>
                    <Input
                      type="number"
                      step={0.01}
                      value={(formData.monto_cotizado as any) ?? ""}
                      onChange={(e) => setFormData({ ...formData, monto_cotizado: e.target.value === "" ? null : e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Probabilidad (1–5)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.probabilidad ?? ""}
                      onChange={(e) => setFormData({ ...formData, probabilidad: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Responsable</Label>
                    <Input
                      value={formData.responsable}
                      onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    />
                  </div>
                  <div>
                    <DatePicker
                      id="kpi-fecha-cierre"
                      label="Fecha Cierre"
                      placeholder="Seleccionar fecha"
                      defaultDate={toYmd(formData.fecha_cierre) || undefined}
                      onChange={(_dates, currentDateString) => {
                        const v = (currentDateString || "").slice(0, 10);
                        const next = v ? v : null;
                        if (toYmd(formData.fecha_cierre) === (next || "")) return;
                        setFormData({ ...formData, fecha_cierre: next });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Monto Vendido</Label>
                    <Input
                      type="number"
                      step={0.01}
                      value={(formData.monto_vendido as any) ?? ""}
                      onChange={(e) => setFormData({ ...formData, monto_vendido: e.target.value === "" ? null : e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Motivo Pérdida</Label>
                    <textarea
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                      value={formData.motivo_perdida}
                      onChange={(e) => setFormData({ ...formData, motivo_perdida: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Seguimiento</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Próxima Acción</Label>
                    <Input
                      value={formData.proxima_accion}
                      onChange={(e) => setFormData({ ...formData, proxima_accion: e.target.value })}
                    />
                  </div>
                  <div>
                    <DatePicker
                      id="kpi-fecha-proxima-accion"
                      label="Fecha Próxima Acción"
                      placeholder="Seleccionar fecha"
                      defaultDate={toYmd(formData.fecha_proxima_accion) || undefined}
                      onChange={(_dates, currentDateString) => {
                        const v = (currentDateString || "").slice(0, 10);
                        const next = v ? v : null;
                        if (toYmd(formData.fecha_proxima_accion) === (next || "")) return;
                        setFormData({ ...formData, fecha_proxima_accion: next });
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notas</Label>
                    <textarea
                      ref={textareaRef}
                      className="w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] bg-brand-600 text-white hover:bg-brand-700"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} className="max-w-md w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 9v4" strokeLinecap="round" />
                  <path d="M12 17h.01" strokeLinecap="round" />
                  <path d="M10.3 4.3h3.4L21 20H3L10.3 4.3Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Eliminar</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200">
            ¿Eliminar el registro de <span className="font-semibold">{rowToDelete?.nombre_cliente || ""}</span>?
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doDelete}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
