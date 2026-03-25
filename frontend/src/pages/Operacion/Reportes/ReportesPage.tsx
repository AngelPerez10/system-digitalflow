import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { apiUrl } from "@/config/api";
import { TrashBinIcon } from "@/icons";
import DatePicker from "@/components/form/date-picker";

type OrdenResumen = {
  id: number;
  idx?: number | null;
  folio?: string | null;
  cliente?: string | null;
  status?: string | null;
  fecha_inicio?: string | null;
  hora_inicio?: string | null;
  fecha_finalizacion?: string | null;
  hora_termino?: string | null;
  servicios_realizados?: string[];
  problematica?: string | null;
};

type ReporteSemanal = {
  id: number;
  tecnico: number;
  tecnico_nombre: string;
  semana_inicio: string;
  semana_fin: string;
  ordenes: OrdenResumen[];
  total_ordenes: number;
  fecha_creacion: string;
};

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getPermissionsFromStorage = () => {
  try {
    const raw = localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

type CuentaTecnico = { id: number; nombre: string; username?: string };

function nombreCuenta(u: CuentaTecnico) {
  return u.nombre || u.username || `#${u.id}`;
}

const getIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getDefaultSaturday = () => {
  const d = new Date();
  const day = d.getDay(); // domingo=0, sabado=6
  const delta = (6 - day + 7) % 7;
  d.setDate(d.getDate() + delta);
  return getIsoDate(d);
};

const getWeekRangeFromDate = (baseDateIso: string) => {
  const parsed = new Date(`${baseDateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getDay(); // domingo=0 ... sabado=6
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(parsed);
  monday.setDate(parsed.getDate() + diffToMonday);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return {
    semanaInicio: getIsoDate(monday),
    semanaFin: getIsoDate(saturday),
  };
};

const getWeekRangeByOffset = (offsetWeeks: number) => {
  const baseSaturday = new Date(`${getDefaultSaturday()}T00:00:00`);
  baseSaturday.setDate(baseSaturday.getDate() + offsetWeeks * 7);
  return getWeekRangeFromDate(getIsoDate(baseSaturday));
};

const toLocalDateTime = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
};

/** Cuenta órdenes por estado (backend: pendiente | resuelto). */
const countOrdenesResueltasPendientes = (ordenes: OrdenResumen[] | undefined) => {
  let resueltas = 0;
  let pendientes = 0;
  for (const o of ordenes || []) {
    const s = (o.status || "").toLowerCase().trim();
    if (s === "resuelto") resueltas++;
    else pendientes++;
  }
  return { resueltas, pendientes };
};

/** Alineado con backend: Reporte_semanal_{tecnico}_{inicio}_{fin}.pdf */
function buildReporteSemanalPdfFilename(r: ReporteSemanal): string {
  let slug = (r.tecnico_nombre || "tecnico").trim().replace(/\s+/g, "_");
  slug = slug.replace(/[^\p{L}\p{N}_\-]/gu, "_");
  slug = slug.replace(/_+/g, "_").replace(/^_|_$/g, "") || "tecnico";
  if (slug.length > 80) slug = slug.slice(0, 80);
  const ini = (r.semana_inicio || "").slice(0, 10);
  const fin = (r.semana_fin || "").slice(0, 10);
  return `Reporte_semanal_${slug}_${ini}_${fin}.pdf`;
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* ignore */
    }
  }
  const q = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (q) return q[1];
  const u = /filename\s*=\s*([^;\s]+)/i.exec(header);
  return u ? u[1].replace(/^["']|["']$/g, "") : null;
}

const formatSemanaLabel = (desde: string, hasta: string) => {
  if (!desde || !hasta) return "—";
  try {
    const a = new Date(`${desde}T12:00:00`);
    const b = new Date(`${hasta}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${desde} → ${hasta}`;
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${a.toLocaleDateString("es-MX", opts)} – ${b.toLocaleDateString("es-MX", opts)}`;
  } catch {
    return `${desde} → ${hasta}`;
  }
};

/** Mismo icono de documento PDF que OrdenesPage / CotizacionPdfPage (viewBox 512). */
function PdfDocGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="currentColor" aria-hidden>
      <g>
        <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
        <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
        <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
        <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
      </g>
    </svg>
  );
}

export default function ReportesPage() {
  const role = (localStorage.getItem("role") || sessionStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());
  const canReportesView = permissions?.reportes?.view !== false;
  const canReportesCreate = !!permissions?.reportes?.create;
  const canReportesDelete = !!permissions?.reportes?.delete;

  const [reportes, setReportes] = useState<ReporteSemanal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 semana actual, -1 anterior
  const selectedWeekRange = useMemo(() => getWeekRangeByOffset(weekOffset), [weekOffset]);
  const weekFrom = selectedWeekRange?.semanaInicio || "";
  const weekTo = selectedWeekRange?.semanaFin || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [busy, setBusy] = useState<{ id: number; action: "delete" } | null>(null);
  const [reportePdfModal, setReportePdfModal] = useState<ReporteSemanal | null>(null);
  const [reporteDeleteModal, setReporteDeleteModal] = useState<ReporteSemanal | null>(null);
  const [pdfGeneratingId, setPdfGeneratingId] = useState<number | null>(null);
  const [pdfLoadingProgress, setPdfLoadingProgress] = useState(8);
  const [tecnicosCuentas, setTecnicosCuentas] = useState<CuentaTecnico[]>([]);
  const [adminTecnicoId, setAdminTecnicoId] = useState<number | null>(null);
  const [adminCrearModalOpen, setAdminCrearModalOpen] = useState(false);
  const [adminFechaInicio, setAdminFechaInicio] = useState("");
  const [adminFechaFin, setAdminFechaFin] = useState("");

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener("storage", sync);
    window.addEventListener("permissions:updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("permissions:updated", sync);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !canReportesCreate) return;
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/ordenes/reportes-tecnico-opciones/"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => []);
        if (cancelled) return;
        if (!res.ok) {
          setTecnicosCuentas([]);
          return;
        }
        const tecnicos = Array.isArray(data) ? (data as CuentaTecnico[]) : [];
        setTecnicosCuentas(tecnicos);
        setAdminTecnicoId((prev) => (prev == null && tecnicos.length ? tecnicos[0].id : prev));
      } catch {
        if (!cancelled) setTecnicosCuentas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, canReportesCreate]);

  const fetchReportes = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const p = getPermissionsFromStorage();
    if (p?.reportes?.view === false) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/ordenes/reportes-semanales/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as any)?.detail || "No se pudieron cargar los reportes.");
      setReportes(Array.isArray(data) ? (data as ReporteSemanal[]) : []);
    } catch (e: any) {
      setError(e?.message || "Error al cargar reportes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  useEffect(() => {
    if (pdfGeneratingId === null) {
      setPdfLoadingProgress(100);
      return;
    }
    setPdfLoadingProgress(8);
    const interval = window.setInterval(() => {
      setPdfLoadingProgress((p) => {
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);
    return () => window.clearInterval(interval);
  }, [pdfGeneratingId]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  const handleCrearReporte = async () => {
    const token = getToken();
    if (!token) return;
    if (!canReportesCreate) return;
    const selectedFrom = isAdmin ? adminFechaInicio : weekFrom;
    const selectedTo = isAdmin ? adminFechaFin : weekTo;
    if (!selectedFrom || !selectedTo) {
      setError(isAdmin ? "Selecciona un rango de fechas válido." : "Selecciona un rango de semana válido.");
      return;
    }
    const from = new Date(`${selectedFrom}T00:00:00`);
    const to = new Date(`${selectedTo}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      setError("El rango de fechas no es válido.");
      return;
    }
    if (isAdmin && (adminTecnicoId == null || Number.isNaN(adminTecnicoId))) {
      setError("Selecciona un técnico.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = isAdmin
        ? { fecha_inicio: selectedFrom, fecha_fin: selectedTo }
        : { semana_fin: selectedTo };
      if (isAdmin && adminTecnicoId != null) {
        body.tecnico_id = adminTecnicoId;
      }
      const res = await fetch(apiUrl("/api/ordenes/reportes-semanales/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.detail || "No se pudo crear el reporte.");
      setSuccess("Reporte semanal creado correctamente.");
      await fetchReportes();
      if (isAdmin) setAdminCrearModalOpen(false);
    } catch (e: any) {
      setError(e?.message || "Error al crear reporte.");
    } finally {
      setSaving(false);
    }
  };

  const downloadReportePdf = async (reporteId: number, meta?: ReporteSemanal) => {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/ordenes/reportes-semanales/${reporteId}/pdf/`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get("content-type") || "";
      const fallbackName = meta
        ? buildReporteSemanalPdfFilename(meta)
        : `Reporte_semanal_${reporteId}.pdf`;
      const filename =
        parseFilenameFromContentDisposition(res.headers.get("content-disposition")) || fallbackName;
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { detail?: string })?.detail || "No se pudo generar el PDF.");
      }
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al descargar el PDF.");
    }
  };

  const handleConfirmPdfModal = async () => {
    if (!reportePdfModal) return;
    const meta = reportePdfModal;
    const id = meta.id;
    setReportePdfModal(null);
    setPdfGeneratingId(id);
    setError(null);
    try {
      await downloadReportePdf(id, meta);
    } finally {
      setPdfGeneratingId(null);
    }
  };

  const handleCancelPdfModal = () => {
    setReportePdfModal(null);
  };

  const handleConfirmDeleteModal = async () => {
    if (!reporteDeleteModal || !canReportesDelete) return;
    const reporteId = reporteDeleteModal.id;
    const token = getToken();
    if (!token) return;
    setBusy({ id: reporteId, action: "delete" });
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(apiUrl(`/api/ordenes/reportes-semanales/${reporteId}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { detail?: string })?.detail || "No se pudo eliminar el reporte.");
      }
      setReporteDeleteModal(null);
      setSuccess("Reporte eliminado.");
      await fetchReportes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setBusy(null);
    }
  };

  const handleCancelDeleteModal = () => {
    setReporteDeleteModal(null);
  };

  const totalOrdenesResueltas = useMemo(() => {
    return reportes.reduce((acc, r) => {
      const { resueltas } = countOrdenesResueltasPendientes(r.ordenes);
      return acc + resueltas;
    }, 0);
  }, [reportes]);
  const totalTecnicosSemana = useMemo(() => {
    if (!weekFrom || !weekTo) return 0;
    return new Set(
      reportes
        .filter((r) => r.semana_inicio === weekFrom && r.semana_fin === weekTo)
        .map((r) => r.tecnico)
    ).size;
  }, [reportes, weekFrom, weekTo]);
  const filteredReportes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reportes;
    return reportes.filter((r) => {
      return (
        (r.tecnico_nombre || "").toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        `${r.semana_inicio} ${r.semana_fin}`.includes(q) ||
        (r.ordenes || []).some((o) => {
          const folio = `${o.folio || o.idx || o.id || ""}`.toLowerCase();
          const serv = Array.isArray(o.servicios_realizados) ? o.servicios_realizados.join(" ") : "";
          const prob = (o.problematica || "").toLowerCase();
          return (
            folio.includes(q) ||
            (o.cliente || "").toLowerCase().includes(q) ||
            serv.toLowerCase().includes(q) ||
            prob.includes(q)
          );
        })
      );
    });
  }, [reportes, searchTerm]);

  if (!canReportesView) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <PageMeta title="Reportes semanales" description="Reportes de técnicos por semana" />
        <PageBreadcrumb pageTitle="Reportes" />
        <Alert
          variant="error"
          title="Sin acceso"
          message="No tienes permiso para ver reportes semanales. Un administrador puede habilitarlo en Usuarios → Permisos (Reportes semanales → Ver)."
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Reportes semanales" description="Reportes de técnicos por semana" />
      <PageBreadcrumb pageTitle="Reportes" />

      {error && <Alert variant="error" title="Error" message={error} />}
      {success && <Alert variant="success" title="Listo" message={success} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6h12" />
                <path d="M6 12h12" />
                <path d="M6 18h12" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Reportes</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{reportes.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Órdenes resueltas</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalOrdenesResueltas}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                <path d="M4 22a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Técnicos con reporte semanal</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalTecnicosSemana}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 dark:bg-white/5 dark:text-gray-200 dark:ring-white/10">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Reportes semanales</h2>
              <div className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                Historial semanal por técnico con órdenes trabajadas.
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative w-full sm:w-[320px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por técnico, semana, folio, cliente o trabajo"
              className="w-full h-10 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 pl-9 pr-9 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                </svg>
              </button>
            )}
          </div>
          {canReportesCreate && (
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setAdminFechaInicio(weekFrom);
                  setAdminFechaFin(weekTo);
                  setAdminCrearModalOpen(true);
                }
                else void handleCrearReporte();
              }}
              disabled={saving}
              className="h-10 px-4 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 whitespace-nowrap"
            >
              {saving ? "Guardando..." : isAdmin ? "Nuevo reporte" : "Crear reporte"}
            </button>
          )}
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="space-y-4 p-2 pt-0">
          {canReportesCreate && !isAdmin && (
              <div className="rounded-xl border border-gray-200/70 dark:border-white/10 p-4 bg-white/70 dark:bg-gray-900/40">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M8 6h13" />
                        <path d="M8 12h13" />
                        <path d="M8 18h13" />
                        <path d="M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Crear reporte semanal</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Corte semanal de lunes a sábado.</p>
                    </div>
                  </div>
                  <div className="w-full min-w-0 lg:ml-auto lg:max-w-2xl">
                    <label
                      htmlFor="week-range-controls"
                      className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2"
                    >
                      Rango de semana
                    </label>
                    <div
                      id="week-range-controls"
                      className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gradient-to-b from-white/90 to-gray-50/80 dark:from-gray-900/50 dark:to-gray-900/80 p-3 shadow-theme-xs sm:p-3.5"
                    >
                      <div className="flex w-full min-w-0 items-stretch gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setWeekOffset((prev) => prev - 1)}
                          className="h-10 w-10 shrink-0 self-center inline-flex items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/5"
                          title="Semana anterior"
                          aria-label="Semana anterior"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:sr-only">
                              Desde
                            </span>
                            <input
                              type="date"
                              value={weekFrom}
                              readOnly
                              aria-label="Fecha inicio de semana"
                              className="h-10 w-full min-w-0 rounded-xl border border-gray-200/80 bg-white px-2.5 text-xs text-gray-900 shadow-theme-xs outline-none dark:border-white/10 dark:bg-gray-800 dark:text-gray-100"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:sr-only">
                              Hasta
                            </span>
                            <input
                              type="date"
                              value={weekTo}
                              readOnly
                              aria-label="Fecha fin de semana"
                              className="h-10 w-full min-w-0 rounded-xl border border-gray-200/80 bg-white px-2.5 text-xs text-gray-900 shadow-theme-xs outline-none dark:border-white/10 dark:bg-gray-800 dark:text-gray-100"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                          disabled={weekOffset === 0}
                          className="h-10 w-10 shrink-0 self-center inline-flex items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/5"
                          title="Semana siguiente"
                          aria-label="Semana siguiente"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 overflow-hidden">
            {/* Vista móvil / tablet: tarjetas */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-white/10">
              {loading && (
                <div className="px-4 py-10 text-center text-sm text-gray-500">Cargando reportes...</div>
              )}
              {!loading && filteredReportes.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-gray-500">No se encontraron reportes.</div>
              )}
              {!loading &&
                filteredReportes.map((r) => {
                  const { resueltas, pendientes } = countOrdenesResueltasPendientes(r.ordenes);
                  return (
                    <div key={r.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.tecnico_nombre || "—"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatSemanaLabel(r.semana_inicio, r.semana_fin)}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">{toLocalDateTime(r.fecha_creacion)}</p>
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                              {resueltas} resuelta{resueltas === 1 ? "" : "s"}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                              {pendientes} pendiente{pendientes === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                        <div className="inline-flex shrink-0 items-center gap-1 self-end rounded-md bg-gray-100 px-1.5 py-1 dark:bg-white/10 sm:self-start">
                          <button
                            type="button"
                            title="Ver PDF"
                            aria-label="Ver PDF"
                            disabled={pdfGeneratingId !== null}
                            onClick={() => setReportePdfModal(r)}
                            className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white transition hover:border-red-400 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-gray-800 dark:hover:border-red-500"
                          >
                            <PdfDocGlyph className="h-4 w-4" />
                          </button>
                          {canReportesDelete && (
                            <button
                              type="button"
                              title="Eliminar"
                              aria-label="Eliminar reporte"
                              disabled={busy?.id === r.id && busy?.action === "delete"}
                              onClick={() => setReporteDeleteModal(r)}
                              className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white transition hover:border-error-400 hover:text-error-600 disabled:opacity-50 dark:border-white/10 dark:bg-gray-800 dark:hover:border-error-500"
                            >
                              {busy?.id === r.id && busy?.action === "delete" ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error-500 border-t-transparent" />
                              ) : (
                                <TrashBinIcon className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Escritorio: tabla */}
            <div className="hidden lg:block overflow-x-auto">
              <Table className="w-full min-w-[960px]">
                <TableHeader className="bg-gradient-to-b from-gray-50 to-gray-50/80 dark:from-gray-900/80 dark:to-gray-900/60 sticky top-0 z-10 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  <TableRow className="hover:bg-transparent">
                    <TableCell isHeader className="px-4 py-3 text-left whitespace-nowrap">
                      Técnico
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left whitespace-nowrap">
                      Semana
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left whitespace-nowrap">
                      Creado
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                      Órdenes resueltas
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                      Órdenes pendientes
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap w-[120px]">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[13px] text-gray-800 dark:text-gray-100">
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                        Cargando reportes...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredReportes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                        No se encontraron reportes.
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    filteredReportes.map((r) => {
                      const { resueltas, pendientes } = countOrdenesResueltasPendientes(r.ordenes);
                      return (
                        <TableRow key={r.id} className="hover:bg-gray-50/90 dark:hover:bg-gray-800/50 transition-colors">
                          <TableCell className="px-4 py-3 align-middle">
                            <span className="font-medium text-gray-900 dark:text-white">{r.tecnico_nombre || "—"}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-gray-600 dark:text-gray-300">
                            {formatSemanaLabel(r.semana_inicio, r.semana_fin)}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {toLocalDateTime(r.fecha_creacion)}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                              {resueltas}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                              {pendientes}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle">
                            <div className="flex items-center justify-center">
                              <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-1 dark:bg-white/10">
                                <button
                                  type="button"
                                  title="Ver PDF"
                                  aria-label="Ver PDF"
                                  disabled={pdfGeneratingId !== null}
                                  onClick={() => setReportePdfModal(r)}
                                  className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white transition hover:border-red-400 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-gray-800 dark:hover:border-red-500"
                                >
                                  <PdfDocGlyph className="h-4 w-4" />
                                </button>
                                {canReportesDelete && (
                                  <button
                                    type="button"
                                    title="Eliminar"
                                    aria-label="Eliminar reporte"
                                    disabled={busy?.id === r.id && busy?.action === "delete"}
                                    onClick={() => setReporteDeleteModal(r)}
                                    className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white transition hover:border-error-400 hover:text-error-600 disabled:opacity-50 dark:border-white/10 dark:bg-gray-800 dark:hover:border-error-500"
                                  >
                                    {busy?.id === r.id && busy?.action === "delete" ? (
                                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error-500 border-t-transparent" />
                                    ) : (
                                      <TrashBinIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </ComponentCard>

      {isAdmin && (
        <Modal
          isOpen={adminCrearModalOpen}
          onClose={() => {
            if (!saving) setAdminCrearModalOpen(false);
          }}
          closeOnBackdropClick={!saving}
          className="w-[94vw] max-w-2xl max-h-[92vh] p-0 overflow-hidden mx-4 sm:mx-auto"
        >
          <div>
            {/* Header — mismo patrón que OrdenesPage */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10">
                  <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Nuevo reporte semanal</h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Selecciona el técnico y el rango de fechas personalizado antes de guardar
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-5 max-h-[min(72vh,560px)] overflow-y-auto custom-scrollbar">
              {/* Sección: Técnico */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Técnico del reporte</h4>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" htmlFor="reporte-tecnico-select-modal">
                      Selecciona el técnico
                    </label>
                    <select
                      id="reporte-tecnico-select-modal"
                      value={adminTecnicoId ?? ""}
                      onChange={(e) => setAdminTecnicoId(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40"
                    >
                      {tecnicosCuentas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {nombreCuenta(t)}
                        </option>
                      ))}
                    </select>
                    {tecnicosCuentas.length === 0 && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        No hay usuarios disponibles. Verifica permisos de administrador en el sistema.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección: Rango de fechas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rango de fechas</h4>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Solo administradores pueden definir un rango personalizado.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <DatePicker
                        id="reporte-fecha-inicio"
                        label="Fecha Inicio"
                        placeholder="Seleccionar fecha"
                        defaultDate={adminFechaInicio || weekFrom || undefined}
                        onChange={(_dates, currentDateString) => {
                          setAdminFechaInicio(currentDateString || "");
                        }}
                      />
                    </div>
                    <div>
                      <DatePicker
                        id="reporte-fecha-fin"
                        label="Fecha Fin"
                        placeholder="Seleccionar fecha"
                        defaultDate={adminFechaFin || weekTo || undefined}
                        onChange={(_dates, currentDateString) => {
                          setAdminFechaFin(currentDateString || "");
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — mismo estilo que botones del modal de órdenes */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminCrearModalOpen(false)}
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCrearReporte()}
                disabled={saving || adminTecnicoId == null || tecnicosCuentas.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {saving ? "Guardando..." : "Crear reporte"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {reportePdfModal && (
        <Modal
          isOpen={!!reportePdfModal}
          onClose={handleCancelPdfModal}
          closeOnBackdropClick={false}
          className="w-full max-w-md mx-4 sm:mx-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900/30">
              <PdfDocGlyph className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">¿Descargar PDF?</h3>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              Se generará el reporte en PDF de{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{reportePdfModal.tecnico_nombre || "—"}</span>{" "}
              para la semana del{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {formatSemanaLabel(reportePdfModal.semana_inicio, reportePdfModal.semana_fin)}
              </span>
              .
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelPdfModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPdfModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                Descargar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {reporteDeleteModal && (
        <Modal
          isOpen={!!reporteDeleteModal}
          onClose={handleCancelDeleteModal}
          closeOnBackdropClick={false}
          className="w-full max-w-md mx-4 sm:mx-auto"
        >
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
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">¿Eliminar reporte?</h3>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar el reporte de{" "}
              <span className="font-semibold">{reporteDeleteModal.tecnico_nombre || "—"}</span> (
              {formatSemanaLabel(reporteDeleteModal.semana_inicio, reporteDeleteModal.semana_fin)})? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelDeleteModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteModal}
                disabled={busy?.id === reporteDeleteModal.id && busy?.action === "delete"}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/50 disabled:opacity-60"
              >
                {busy?.id === reporteDeleteModal.id && busy?.action === "delete" ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={pdfGeneratingId !== null} onClose={() => {}} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-7 sm:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-linear-to-r from-brand-500/18 via-blue-500/10 to-brand-500/18 blur-2xl" />
              <div className="relative flex items-center justify-center w-[80px] h-[80px] rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-gray-900/70 shadow-theme-md">
                <div className="absolute inset-0 rounded-2xl border border-gray-100/70 dark:border-white/5" />
                <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600 border-r-blue-500 dark:border-t-brand-400 dark:border-r-blue-300 animate-spin" />
                  <div className="absolute inset-2 rounded-full border border-dashed border-gray-200/80 dark:border-gray-600/80" />
                  <div className="relative flex items-center justify-center">
                    <PdfDocGlyph className="w-8 h-8 text-brand-700 dark:text-brand-300" />
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generando PDF</h3>
            <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>

            <div className="mt-5 w-full">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Progreso</span>
                <span className="tabular-nums">{Math.min(99, Math.max(0, Math.round(pdfLoadingProgress)))}%</span>
              </div>
              <div className="mt-2 w-full rounded-full h-2.5 overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-white/10">
                <div
                  className="h-full bg-linear-to-r from-brand-600 via-blue-600 to-brand-600 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, pdfLoadingProgress))}%` }}
                />
              </div>

              <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                Generando archivo de reporte semanal…
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
