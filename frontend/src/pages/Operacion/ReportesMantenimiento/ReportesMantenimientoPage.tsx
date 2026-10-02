/**
 * Reporte de mantenimiento — listado.
 *
 * Misma estructura que Proyectos y Órdenes: banda marina con el mes, tarjetas
 * de resumen, búsqueda + «Nuevo reporte», y una tarjeta de listado con filtro
 * segmentado por evidencia, tabla agrupada (escritorio) o tarjetas, pie con
 * conteo y cambio de mes en celular. Con una búsqueda de 2+ caracteres se
 * recorren todos los meses. Permisos, API y rutas (`/reportes-mantenimiento/…`)
 * son los de siempre.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FileText, Plus, Search, X } from "lucide-react";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { useAuth } from "@/context/AuthContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { fetchTodosLosUsuariosApi } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { MonthSwitcher } from "../Proyectos/list/ProyectosHero";
import { formatYearMonthLabel, shiftYearMonth } from "../Proyectos/shared/proyectoListUtils";
import { focusRing } from "../Proyectos/shared/proyectoTokens";
import { deleteReporte, isReporteApiError, listReportes } from "./reporteApi";
import { usuarioDisplayName } from "./reporteTecnicos";
import type { ReporteMantenimiento } from "./reporteTypes";
import ReporteFormModal from "./form/ReporteFormModal";
import { ReporteDeleteModal } from "./list/ReporteDeleteModal";
import type { ReporteHandlers } from "./list/ReporteEvidencia";
import { ReportesCardGrid } from "./list/ReportesCardGrid";
import { ReportesEvidenciaSegmentFilter } from "./list/ReportesEvidenciaSegmentFilter";
import { ReportesHero } from "./list/ReportesHero";
import { ReportesListFiltersPopover } from "./list/ReportesListFiltersPopover";
import { ReportesMobileHeader } from "./list/ReportesMobileHeader";
import { ReportesCardsSkeleton, ReportesEmptyState, ReportesErrorState, ReportesTableSkeleton } from "./list/ReportesListStates";
import { ReportesPageStats } from "./list/ReportesPageStats";
import { ReportesTable } from "./list/ReportesTable";
import {
  baseDelListado,
  busquedaActiva,
  filtrarPorEvidencia,
  filtrosSecundarios,
  folioDe,
  mesActual,
  ordenarReportes,
  resumenReportes,
  seccionesPorEvidencia,
  tecnicosDeReportes,
  tieneEvidencia,
  type EvidenciaFiltro,
} from "./list/reporteListUtils";

const PAGE_SIZE = 30;

type Flash = { variant: "success" | "warning" | "error"; title: string; message: string };

export default function ReportesMantenimientoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, permissions } = useAuth();
  const esEscritorio = useMediaQuery("(min-width: 1280px)");
  const { id: idParam } = useParams();
  // El editor es un modal sobre el listado; la ruta lo abre (`/nuevo` o `/:id`) para poder enlazarlo.
  const formNuevo = location.pathname.endsWith("/reportes-mantenimiento/nuevo");
  const formId = idParam && idParam !== "nuevo" && Number.isFinite(Number(idParam)) ? Number(idParam) : null;
  const formOpen = formNuevo || formId != null;

  const [rows, setRows] = useState<ReporteMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [mes, setMes] = useState(mesActual);
  const [tecnico, setTecnico] = useState("");
  const [fecha, setFecha] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [evidencia, setEvidencia] = useState<EvidenciaFiltro>("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [usuarios, setUsuarios] = useState<{ nombre: string; id: number; url: string }[]>([]);
  const [deletingRow, setDeletingRow] = useState<ReporteMantenimiento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean } & Flash>({ show: false, variant: "warning", title: "", message: "" });

  const canCreate = isAdmin || permissions?.reportes_mantenimiento?.create === true;
  const canEdit = isAdmin || permissions?.reportes_mantenimiento?.edit === true;
  const canDelete = canDeleteInModule(permissions, isAdmin, "reportes_mantenimiento");
  // Técnico: solo ve sus reportes (mismo criterio que `user_module_own_only` del backend).
  const fieldMode = !isAdmin && permissions?.reportes_mantenimiento?.own_only !== false;

  const showAlert = useCallback((variant: Flash["variant"], title: string, message: string, ms = 3500) => {
    setAlert({ show: true, variant, title, message });
    window.setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setRows(await listReportes());
    } catch (err) {
      setLoadError(isReporteApiError(err) ? err.message : "Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Fotos de perfil para los avatares de técnicos (si falla, se muestran iniciales).
  useEffect(() => {
    let cancelled = false;
    void fetchTodosLosUsuariosApi().then((list) => {
      if (!cancelled) setUsuarios(list.map((u) => ({ nombre: usuarioDisplayName(u), id: u.id, url: String(u.avatar_url || "") })));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatars = useMemo(() => new Map(usuarios.map((u) => [u.nombre.toLowerCase(), { id: u.id, url: u.url }])), [usuarios]);

  // Aviso al volver desde el editor tras guardar.
  const flashDone = useRef(false);
  useEffect(() => {
    const flash = (location.state as { flash?: Flash } | null)?.flash;
    if (!flash || flashDone.current) return;
    flashDone.current = true;
    showAlert(flash.variant, flash.title, flash.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, showAlert]);

  const buscando = busquedaActiva(q);
  const delMes = useMemo(() => rows.filter((r) => r.fecha_servicio.startsWith(`${mes}-`)), [rows, mes]);
  const stats = useMemo(() => resumenReportes(delMes), [delMes]);
  const tecnicos = useMemo(() => tecnicosDeReportes(rows), [rows]);

  const base = useMemo(() => baseDelListado(rows, { q, mes, fecha, tecnico }), [rows, q, mes, fecha, tecnico]);
  const counts = useMemo(() => {
    const con = base.filter(tieneEvidencia).length;
    return { todos: base.length, con, sin: base.length - con };
  }, [base]);
  const lista = useMemo(() => ordenarReportes(filtrarPorEvidencia(base, evidencia)), [base, evidencia]);
  const visibles = useMemo(() => lista.slice(0, limit), [lista, limit]);
  const secciones = useMemo(() => seccionesPorEvidencia(visibles), [visibles]);

  // Al cambiar búsqueda, mes o filtros se vuelve a la primera página.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [q, mes, fecha, tecnico, evidencia]);

  const confirmDelete = async () => {
    if (!deletingRow) return;
    const folio = folioDe(deletingRow);
    setDeleting(true);
    try {
      await deleteReporte(deletingRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      showAlert("success", "Reporte eliminado", `${folio} se eliminó correctamente.`);
      setDeletingRow(null);
    } catch (err) {
      showAlert("error", "No se pudo eliminar", isReporteApiError(err) ? err.message : "Inténtalo de nuevo.", 4500);
    } finally {
      setDeleting(false);
    }
  };

  const handlers = useMemo<ReporteHandlers>(
    () => ({
      canEdit,
      canDelete,
      onPdf: (row) => navigate(`/reportes-mantenimiento/${row.id}/pdf`, { state: { from: "/reportes-mantenimiento" } }),
      onEdit: (row) => navigate(`/reportes-mantenimiento/${row.id}`),
      onDelete: setDeletingRow,
    }),
    [canEdit, canDelete, navigate]
  );

  const irNuevo = () => navigate("/reportes-mantenimiento/nuevo");
  const limpiarSecundarios = () => {
    setTecnico("");
    setFecha("");
  };
  const limpiar = () => {
    setQ("");
    limpiarSecundarios();
    setEvidencia("");
  };
  const cerrarForm = () => navigate("/reportes-mantenimiento", { replace: true });
  const secundarios = filtrosSecundarios({ tecnico, fecha });
  const shiftMonth = (delta: number) => setMes((m) => shiftYearMonth(m, delta));
  const hayFiltros = buscando || secundarios > 0 || Boolean(evidencia);

  let contenido;
  if (loading) contenido = esEscritorio ? <ReportesTableSkeleton /> : <div className="p-3 sm:p-4"><ReportesCardsSkeleton /></div>;
  else if (loadError) contenido = <ReportesErrorState message={loadError} onRetry={() => void load()} />;
  else if (lista.length === 0) contenido = <ReportesEmptyState filtered={hayFiltros} sinReportes={rows.length === 0} canCreate={canCreate} onClear={limpiar} onNew={irNuevo} />;
  else
    contenido = esEscritorio ? (
      <ReportesTable sections={secciones} grouped={!evidencia} avatars={avatars} {...handlers} />
    ) : (
      <div className="p-3 sm:p-4">
        <ReportesCardGrid sections={secciones} grouped={!evidencia} avatars={avatars} fieldMode={fieldMode} {...handlers} />
      </div>
    );

  const restantes = lista.length - visibles.length;

  return (
    <div className={`${erpPageCanvasClass} overflow-x-clip!`} style={erpSansStyle}>
      <div className={`${erpPageInnerClass} ${canCreate ? "max-sm:pb-24" : ""}`}>
        <PageMeta title="Reporte de mantenimiento | Operación" description="Reportes ligados a órdenes de servicio con secciones Antes/Después" />

        <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={erpBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
            Reporte de mantenimiento
          </span>
        </nav>

        {alert.show ? <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} /> : null}

        <ReportesHero selectedMonth={mes} onShiftMonth={shiftMonth} />
        <ReportesMobileHeader selectedMonth={mes} onShiftMonth={shiftMonth} stats={stats} fieldMode={fieldMode} />

        <div className="hidden sm:block">
          <ReportesPageStats stats={stats} />
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8EA0B8] sm:left-3 sm:size-4" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por folio RM, orden, cliente o técnico…"
              className={pageSearchInputClass}
              aria-label="Buscar reportes en todos los meses"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-10 items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/6 sm:h-9 sm:min-w-11 sm:rounded-lg"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {canCreate ? (
            <button type="button" onClick={irNuevo} className={`${erpPrimaryBtnClass} max-sm:hidden! lg:shrink-0`}>
              <Plus className="size-4" aria-hidden />
              Nuevo reporte
            </button>
          ) : null}
        </div>

        <section className={`overflow-visible ${pageCardShellClass}`} aria-labelledby="reportes-listado-heading" aria-busy={loading || undefined}>
          <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <h2 id="reportes-listado-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Listado de reportes
                  </h2>
                </div>
                <p className="mt-2 text-[14px] leading-5 text-[#52525B] dark:text-[#B7C1D1]">Resultados según búsqueda y filtros, agrupados por evidencia.</p>
              </div>

              <ReportesListFiltersPopover
                open={filterOpen}
                onOpenChange={setFilterOpen}
                tecnico={tecnico}
                onTecnico={setTecnico}
                fecha={fecha}
                onFecha={setFecha}
                tecnicos={tecnicos}
                avatars={avatars}
                activeFilterCount={secundarios}
                onClear={limpiarSecundarios}
              />
            </div>
            <div className="mt-3 min-w-0 max-w-full overflow-hidden">
              <ReportesEvidenciaSegmentFilter value={evidencia} onChange={setEvidencia} counts={counts} />
            </div>
          </div>

          <div>
            {contenido}

            <div className="flex flex-col gap-3 border-t border-[#E7E7EA] px-5 py-3.5 dark:border-[#273244] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
                {loading ? (
                  <span role="status">{buscando ? "Buscando en todos los meses…" : "Cargando reportes del mes…"}</span>
                ) : buscando ? (
                  <>
                    <span className="font-medium tabular-nums text-[#09090B] dark:text-white">{lista.length.toLocaleString("es-MX")}</span> {lista.length === 1 ? "reporte" : "reportes"} para «{q.trim()}» (todos los meses)
                  </>
                ) : (
                  <>
                    <span className="font-medium tabular-nums text-[#09090B] dark:text-white">{visibles.length.toLocaleString("es-MX")}</span>
                    {restantes > 0 ? <> de {lista.length.toLocaleString("es-MX")}</> : null} {lista.length === 1 ? "reporte" : "reportes"} en <span className="capitalize">{formatYearMonthLabel(mes)}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {restantes > 0 ? (
                  <button
                    type="button"
                    onClick={() => setLimit((n) => n + PAGE_SIZE)}
                    className={`cot-press inline-flex h-9 items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[13px] font-semibold text-[#17235B] transition-colors hover:border-[#C9D2E6] hover:bg-[#F8FAFF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#C9D7FF] dark:hover:bg-[#1B2539] ${focusRing}`}
                  >
                    Mostrar {Math.min(PAGE_SIZE, restantes)} más
                  </button>
                ) : null}
                <div className="sm:hidden">
                  <MonthSwitcher selectedMonth={mes} onShiftMonth={shiftMonth} tone="light" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <ReporteFormModal
          open={formOpen}
          reporteId={formId}
          onClose={cerrarForm}
          onSaved={(flash) => {
            showAlert(flash.variant, flash.title, flash.message);
            void load();
          }}
        />

        {/* Celular: «Nuevo reporte» flotante, al alcance del pulgar y fuera de la zona segura. */}
        {canCreate && !formOpen ? (
          <button
            type="button"
            onClick={irNuevo}
            className={`cot-tick cot-press fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-[#1B5CFF] pl-4 pr-5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(27,92,255,0.65)] active:bg-[#1244D1] dark:bg-[#4B7CFF] sm:hidden ${focusRing}`}
          >
            <Plus className="size-5" aria-hidden />
            Nuevo reporte
          </button>
        ) : null}

        <ReporteDeleteModal row={deletingRow} deleting={deleting} onCancel={() => setDeletingRow(null)} onConfirm={() => void confirmDelete()} />
      </div>
    </div>
  );
}
