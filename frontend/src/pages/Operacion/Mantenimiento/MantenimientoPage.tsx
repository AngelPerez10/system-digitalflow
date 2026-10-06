/**
 * Mantenimiento: pólizas y reportes de mantenimiento en una sola vista.
 *
 * - Un listado con todo mezclado (urgentes primero, luego lo más reciente),
 *   búsqueda en ambos tipos, segmentado «Todo · Pólizas · Reportes» y filtros.
 * - «Nuevo» abre «¿Qué quieres crear?» (póliza o reporte); con permiso para
 *   uno solo, abre ese formulario directo.
 * - Cada tipo conserva sus permisos (`polizas`, `reportes_mantenimiento`), su
 *   API, su formulario y su PDF. El reporte se abre por ruta
 *   (`/mantenimiento/reportes/nuevo` o `/:id`) para poder enlazarlo.
 */
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlarmClock, CalendarCheck2, CalendarDays, CircleAlert, FileText, Plus, Search, Wrench, X } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import "@/components/ui/modal-kit/motion.css";
import { useAuth } from "@/context/AuthContext";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpPrimaryBtnClass,
  erpStatCardClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { fetchTodosLosUsuariosApi } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { focusRing } from "../Proyectos/shared/proyectoTokens";
import PolizaDeleteModal from "./polizas/form/PolizaDeleteModal";
import { createPoliza, deletePoliza, isPolizaApiError, listPolizas, updatePoliza } from "./polizas/list/polizaApi";
import { computePolizaStats, EMPTY_POLIZA_VALUES, nextPolizaIdx, valuesFromRow } from "./polizas/list/polizaEstado";
import type { PolizaAltaValues, PolizaRow } from "./polizas/list/polizaListTypes";
import { polizaPdfSearchFromRow } from "./polizas/list/polizaPdf";
import PolizasAgendaModal from "./polizas/list/PolizasAgendaModal";
import { contarVisitasProximas } from "./polizas/list/polizaAgenda";
import { todayIso } from "./polizas/shared/polizaVisitas";
import {
  polHeroBodyClass,
  polHeroClass,
  polHeroEyebrowClass,
  polHeroGlowClass,
  polHeroIconClass,
  polHeroTitleClass,
  polPageCanvasClass,
  polPageInnerClass,
  polSansStyle,
} from "./polizas/shared/polizaStyles";
import ReporteFormModal from "./reportes/form/ReporteFormModal";
import { ReporteDeleteModal } from "./reportes/list/ReporteDeleteModal";
import type { ReporteHandlers } from "./reportes/list/ReporteEvidencia";
import { ReportesCardsSkeleton, ReportesErrorState, ReportesTableSkeleton } from "./reportes/list/ReportesListStates";
import { folioDe, mesActual, tecnicosDeReportes } from "./reportes/list/reporteListUtils";
import { deleteReporte, isReporteApiError, listReportes } from "./reportes/reporteApi";
import { usuarioDisplayName } from "./reportes/reporteTecnicos";
import type { ReporteMantenimiento } from "./reportes/reporteTypes";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import NuevoMantenimientoModal from "./form/NuevoMantenimientoModal";
import { MantenimientoFiltrosPopover, TipoSegment } from "./list/MantenimientoFiltros";
import MantenimientoList, { type PolizaHandlers } from "./list/MantenimientoList";
import { MantenimientoEmpty } from "./list/MantenimientoEmpty";
import { MANTENIMIENTO_PATH, reporteEditPath, reporteNuevoPath } from "./shared/mantenimientoRutas";
import {
  buildItems,
  contarPorTipo,
  FILTROS_VACIOS,
  filtrarItems,
  filtrarSinTipo,
  filtrosSecundariosActivos,
  ordenarItems,
  reportesDelMes,
  type MantenimientoFiltros,
  type MantenimientoTipo,
} from "./shared/mantenimientoItems";

const PolizaFormModal = lazy(() => import("./polizas/form/PolizaFormModal"));
const prefetchPolizaForm = () => void import("./polizas/form/PolizaFormModal");

const PAGE_SIZE = 30;

type Aviso = { id: number; variant: "success" | "warning" | "error"; title: string; message: string };

export default function MantenimientoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: idParam } = useParams();
  const { isAdmin, permissions } = useAuth();
  const esEscritorio = useMediaQuery("(min-width: 1024px)");

  /* ---------------- Permisos (cada tipo con el suyo) ---------------- */
  const pol = permissions?.polizas;
  const rep = permissions?.reportes_mantenimiento;
  const verPolizas = isAdmin || pol?.view === true;
  const verReportes = isAdmin || rep?.view === true;
  const polCreate = isAdmin || pol?.create === true;
  const polEdit = isAdmin || pol?.edit === true;
  const polDelete = canDeleteInModule(permissions, isAdmin, "polizas");
  const repCreate = isAdmin || rep?.create === true;
  const repEdit = isAdmin || rep?.edit === true;
  const repDelete = canDeleteInModule(permissions, isAdmin, "reportes_mantenimiento");
  const crearOpciones = useMemo<MantenimientoTipo[]>(
    () => [...(polCreate ? (["poliza"] as const) : []), ...(repCreate ? (["reporte"] as const) : [])],
    [polCreate, repCreate],
  );

  /* ---------------- Formulario de reporte (por ruta) ---------------- */
  const reporteNuevo = location.pathname === reporteNuevoPath();
  const reporteId = idParam && Number.isFinite(Number(idParam)) ? Number(idParam) : null;
  const reporteFormOpen = reporteNuevo || reporteId != null;

  /* ---------------- Datos ---------------- */
  const [polizas, setPolizas] = useState<PolizaRow[]>([]);
  const [reportes, setReportes] = useState<ReporteMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [usuarios, setUsuarios] = useState<{ nombre: string; id: number; url: string }[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const notify = useCallback((variant: Aviso["variant"], title: string, message: string) => {
    setAviso({ id: Date.now(), variant, title, message });
  }, []);

  // Ambos listados en paralelo; si uno falla, el otro se muestra igual con un aviso.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const [p, r] = await Promise.allSettled([
      verPolizas ? listPolizas() : Promise.resolve([] as PolizaRow[]),
      verReportes ? listReportes() : Promise.resolve([] as ReporteMantenimiento[]),
    ]);
    if (p.status === "fulfilled") setPolizas(p.value);
    if (r.status === "fulfilled") setReportes(r.value);
    const err = (e: unknown) => (isPolizaApiError(e) || isReporteApiError(e) ? e.message : "Revisa tu conexión e inténtalo de nuevo.");
    if (p.status === "rejected" && r.status === "rejected") setLoadError(err(p.reason));
    else if (p.status === "rejected") notify("error", "No se pudieron cargar las pólizas", err(p.reason));
    else if (r.status === "rejected") notify("error", "No se pudieron cargar los reportes", err(r.reason));
    setLoading(false);
  }, [verPolizas, verReportes, notify]);

  useEffect(() => {
    void load();
    const idle = window.setTimeout(prefetchPolizaForm, 800);
    return () => window.clearTimeout(idle);
  }, [load]);

  // Fotos de perfil de los técnicos (si falla, se muestran iniciales).
  useEffect(() => {
    if (!verReportes) return;
    let cancelled = false;
    void fetchTodosLosUsuariosApi().then((list) => {
      if (!cancelled) setUsuarios(list.map((u) => ({ nombre: usuarioDisplayName(u), id: u.id, url: String(u.avatar_url || "") })));
    });
    return () => {
      cancelled = true;
    };
  }, [verReportes]);
  const avatars = useMemo(() => new Map(usuarios.map((u) => [u.nombre.toLowerCase(), { id: u.id, url: u.url }])), [usuarios]);

  /* ---------------- Filtros y listado ---------------- */
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search);
  const [filtros, setFiltros] = useState<MantenimientoFiltros>(FILTROS_VACIOS);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const f = useMemo(() => ({ ...filtros, q }), [filtros, q]);

  const items = useMemo(() => ordenarItems(buildItems(polizas, reportes)), [polizas, reportes]);
  const counts = useMemo(() => {
    const c = contarPorTipo(filtrarSinTipo(items, f));
    return { todo: c.todo, poliza: c.poliza, reporte: c.reporte };
  }, [items, f]);
  const lista = useMemo(() => filtrarItems(items, f), [items, f]);
  const visibles = useMemo(() => lista.slice(0, limit), [lista, limit]);
  const restantes = lista.length - visibles.length;
  const tecnicos = useMemo(() => tecnicosDeReportes(reportes), [reportes]);
  const hayFiltros = q.trim() !== "" || filtros.tipo !== "todo" || filtrosSecundariosActivos(filtros) > 0;

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [f]);

  const limpiar = useCallback(() => {
    setSearch("");
    setFiltros(FILTROS_VACIOS);
  }, []);

  const polStats = useMemo(() => computePolizaStats(polizas), [polizas]);
  const delMes = useMemo(() => reportesDelMes(reportes, mesActual()), [reportes]);

  /* ---------------- Pólizas: alta, edición y borrado ---------------- */
  const [polModal, setPolModal] = useState<{ open: boolean; row: PolizaRow | null }>({ open: false, row: null });
  const [polSaving, setPolSaving] = useState(false);
  const [polDeleting, setPolDeleting] = useState<PolizaRow | null>(null);
  const [polDeleteBusy, setPolDeleteBusy] = useState(false);
  const editingPol = polModal.row;
  const extraCliente = useMemo(() => (editingPol ? { value: editingPol.clienteId, label: editingPol.cliente } : null), [editingPol]);
  const extraCotizacion = useMemo(() => (editingPol ? { value: editingPol.cotizacionId, label: editingPol.cotizacionFolio } : null), [editingPol]);

  const openPolizaNueva = useCallback(() => {
    prefetchPolizaForm();
    setPolModal({ open: true, row: null });
  }, []);
  const openPolizaEdit = useCallback((row: PolizaRow) => {
    prefetchPolizaForm();
    setPolModal({ open: true, row });
  }, []);

  const savePoliza = async (values: PolizaAltaValues) => {
    setPolSaving(true);
    try {
      if (editingPol) {
        const updated = await updatePoliza(editingPol.id, values);
        setPolizas((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        notify("success", "Póliza actualizada", `${updated.folio} se guardó correctamente.`);
      } else {
        const created = await createPoliza(values);
        setPolizas((prev) => [created, ...prev]);
        notify("success", "Póliza creada", `${created.folio} · ${created.cliente}`);
      }
      setPolModal({ open: false, row: null });
    } catch (err) {
      notify("error", "No se pudo guardar", isPolizaApiError(err) ? err.message : "Revisa los datos e inténtalo de nuevo.");
    } finally {
      setPolSaving(false);
    }
  };

  const confirmDeletePoliza = async () => {
    if (!polDeleting) return;
    setPolDeleteBusy(true);
    try {
      await deletePoliza(polDeleting.id);
      setPolizas((prev) => prev.filter((r) => r.id !== polDeleting.id));
      notify("success", "Póliza eliminada", `${polDeleting.folio} se eliminó.`);
      setPolDeleting(null);
    } catch (err) {
      notify("error", "No se pudo eliminar", isPolizaApiError(err) ? err.message : "Inténtalo de nuevo.");
    } finally {
      setPolDeleteBusy(false);
    }
  };

  /* ---------------- Reportes: borrado ---------------- */
  const [repDeleting, setRepDeleting] = useState<ReporteMantenimiento | null>(null);
  const [repDeleteBusy, setRepDeleteBusy] = useState(false);

  const confirmDeleteReporte = async () => {
    if (!repDeleting) return;
    const folio = folioDe(repDeleting);
    setRepDeleteBusy(true);
    try {
      await deleteReporte(repDeleting.id);
      setReportes((prev) => prev.filter((r) => r.id !== repDeleting.id));
      notify("success", "Reporte eliminado", `${folio} se eliminó correctamente.`);
      setRepDeleting(null);
    } catch (err) {
      notify("error", "No se pudo eliminar", isReporteApiError(err) ? err.message : "Inténtalo de nuevo.");
    } finally {
      setRepDeleteBusy(false);
    }
  };

  const reloadReportes = useCallback(async () => {
    try {
      setReportes(await listReportes());
    } catch {
      /* el aviso de guardado ya se mostró; el listado se actualiza al recargar */
    }
  }, []);

  /* ---------------- Acciones del listado ---------------- */
  const polizaHandlers = useMemo<PolizaHandlers>(
    () => ({
      onPdf: (row) => navigate(`/polizas-mantenimiento/pdf?${polizaPdfSearchFromRow(row)}`, { state: { from: MANTENIMIENTO_PATH } }),
      onEdit: polEdit ? openPolizaEdit : undefined,
      onDelete: polDelete ? setPolDeleting : undefined,
    }),
    [navigate, polEdit, polDelete, openPolizaEdit],
  );
  const reporteHandlers = useMemo<ReporteHandlers>(
    () => ({
      canEdit: repEdit,
      canDelete: repDelete,
      onPdf: (row) => navigate(`/reportes-mantenimiento/${row.id}/pdf`, { state: { from: MANTENIMIENTO_PATH } }),
      onEdit: (row) => navigate(reporteEditPath(row.id)),
      onDelete: setRepDeleting,
    }),
    [repEdit, repDelete, navigate],
  );

  /* ---------------- «Nuevo» ---------------- */
  const [chooserOpen, setChooserOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const crear = useCallback(
    (kind: MantenimientoTipo) => {
      setChooserOpen(false);
      if (kind === "poliza") openPolizaNueva();
      else navigate(reporteNuevoPath());
    },
    [navigate, openPolizaNueva],
  );
  const onNuevo = () => {
    if (crearOpciones.length === 1) crear(crearOpciones[0]);
    else setChooserOpen(true);
  };

  /* ---------------- Contenido del listado ---------------- */
  let contenido;
  if (loading)
    contenido = esEscritorio ? (
      <ReportesTableSkeleton />
    ) : (
      <div className="p-3 sm:p-4">
        <ReportesCardsSkeleton />
      </div>
    );
  else if (loadError) contenido = <ReportesErrorState message={loadError} onRetry={() => void load()} />;
  else if (lista.length === 0)
    contenido = <MantenimientoEmpty filtered={hayFiltros} canCreate={crearOpciones.length > 0} onClear={limpiar} onNew={onNuevo} />;
  else contenido = <MantenimientoList items={visibles} poliza={polizaHandlers} reporte={reporteHandlers} avatars={avatars} />;

  const stats = [
    ...(verPolizas
      ? [
          { label: "Pólizas vencidas", value: polStats.vencidas, icon: CircleAlert, chip: "border-red-200/70 bg-red-50/90 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300" },
          { label: "Próxima visita", value: polStats.proximaVisita, icon: AlarmClock, chip: "border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200" },
          { label: "Pólizas vigentes", value: polStats.vigentes, icon: CalendarCheck2, chip: "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300" },
        ]
      : []),
    ...(verReportes
      ? [{ label: "Reportes del mes", value: delMes, icon: FileText, chip: "border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF]" }]
      : []),
  ];

  const mostrarAgenda = verPolizas;
  const visitasSemana = useMemo(() => contarVisitasProximas(polizas, todayIso(), 7), [polizas]);

  return (
    <div className={polPageCanvasClass} style={polSansStyle}>
      <PageMeta title="Mantenimiento | Operación" description="Pólizas y reportes de mantenimiento en una sola vista" />
      <div className={`${polPageInnerClass} ${crearOpciones.length ? "max-sm:pb-24" : ""}`}>
        <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={erpBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
            Mantenimiento
          </span>
        </nav>

        <header className={polHeroClass}>
          <div className={polHeroGlowClass} aria-hidden />
          <div className="relative flex min-w-0 items-start gap-4">
            <span className={polHeroIconClass} aria-hidden>
              <Wrench className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className={polHeroEyebrowClass}>Operación</p>
              <h1 className={polHeroTitleClass}>Mantenimiento</h1>
              <p className={polHeroBodyClass}>
                Pólizas y reportes de mantenimiento en un solo lugar. Arriba aparece lo que necesita atención: pólizas vencidas y con visita cercana.
              </p>
            </div>
          </div>
        </header>

        {stats.length > 0 ? (
          <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`} role="group" aria-label="Resumen de mantenimiento">
            {stats.map(({ label, value, icon: Icono, chip }, i) => (
              <div key={label} className={`${erpStatCardClass} cot-rise`} style={{ "--cot-i": i } as CSSProperties}>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10 ${chip}`}>
                    <Icono className="size-4 sm:size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] sm:text-[10px]">{label}</p>
                    {loading ? (
                      <span className="mt-1 block h-5 w-8 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#1B2539]" aria-hidden />
                    ) : (
                      <p key={value} className="cot-flash mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
                        {value.toLocaleString("es-MX")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 w-full sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8EA0B8] sm:left-3 sm:size-4" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search) {
                  e.preventDefault();
                  setSearch("");
                }
              }}
              placeholder="Buscar por folio, cliente, cotización o técnico…"
              className={pageSearchInputClass}
              aria-label="Buscar pólizas y reportes"
              aria-busy={search !== q || undefined}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-10 items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/6 sm:h-9 sm:min-w-11 sm:rounded-lg"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {mostrarAgenda ? (
            <button
              type="button"
              onClick={() => setAgendaOpen(true)}
              aria-haspopup="dialog"
              aria-label={visitasSemana > 0 ? `Agenda, ${visitasSemana} visitas en 7 días` : "Agenda de visitas"}
              className={`cot-press relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[14px] font-semibold text-[#17235B] hover:border-[#C9D2E6] hover:bg-[#F8FAFF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#C9D7FF] dark:hover:bg-[#1B2539] ${focusRing}`}
            >
              <CalendarDays className="size-4" aria-hidden />
              Agenda
              {visitasSemana > 0 ? (
                <span key={visitasSemana} className="cot-tick inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E6A23C] px-1.5 text-[11px] font-bold tabular-nums text-white">
                  {visitasSemana}
                </span>
              ) : null}
            </button>
          ) : null}

          {crearOpciones.length > 0 ? (
            <button
              type="button"
              onClick={onNuevo}
              onMouseEnter={polCreate ? prefetchPolizaForm : undefined}
              className={`${erpPrimaryBtnClass} max-sm:hidden! lg:shrink-0`}
            >
              <Plus className="size-4" aria-hidden />
              Nuevo
            </button>
          ) : null}
        </div>

        <div>
          <section className={`min-w-0 overflow-visible ${pageCardShellClass}`} aria-labelledby="mant-listado" aria-busy={loading || undefined}>
            <div className="flex flex-col gap-3 border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="mant-listado" className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                    Pólizas y reportes
                  </h2>
                  <p className="text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">Lo urgente primero, luego lo más reciente.</p>
                </div>
                <MantenimientoFiltrosPopover filtros={filtros} onChange={setFiltros} tecnicos={tecnicos} mostrarPolizas={verPolizas} mostrarReportes={verReportes} />
              </div>
              {verPolizas && verReportes ? (
                <div className="min-w-0 max-w-full overflow-x-auto">
                  <TipoSegment value={filtros.tipo} onChange={(tipo) => setFiltros((prev) => ({ ...prev, tipo }))} counts={counts} />
                </div>
              ) : null}
            </div>

            <div key={filtros.tipo} className="cot-fade">
              {contenido}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E7E7EA] px-5 py-3.5 dark:border-[#273244] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
                {loading ? (
                  <span role="status">Cargando…</span>
                ) : (
                  <>
                    <span className="font-medium tabular-nums text-[#09090B] dark:text-white">{visibles.length.toLocaleString("es-MX")}</span>
                    {restantes > 0 ? <> de {lista.length.toLocaleString("es-MX")}</> : null} {lista.length === 1 ? "registro" : "registros"}
                    {q.trim() ? <> para «{q.trim()}»</> : null}
                  </>
                )}
              </p>
              {restantes > 0 ? (
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + PAGE_SIZE)}
                  className={`cot-press inline-flex h-9 items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[13px] font-semibold text-[#17235B] transition-colors hover:border-[#C9D2E6] hover:bg-[#F8FAFF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#C9D7FF] dark:hover:bg-[#1B2539] ${focusRing}`}
                >
                  Mostrar {Math.min(PAGE_SIZE, restantes)} más
                </button>
              ) : null}
            </div>
          </section>

        </div>
      </div>

      {/* Celular: «Nuevo» flotante, al alcance del pulgar. */}
      {crearOpciones.length > 0 && !reporteFormOpen && !polModal.open ? (
        <button
          type="button"
          onClick={onNuevo}
          className={`cot-tick cot-press fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-[#1B5CFF] pl-4 pr-5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(27,92,255,0.65)] active:bg-[#1244D1] dark:bg-[#4B7CFF] sm:hidden ${focusRing}`}
        >
          <Plus className="size-5" aria-hidden />
          Nuevo
        </button>
      ) : null}

      {mostrarAgenda ? (
        <PolizasAgendaModal
          open={agendaOpen}
          onClose={() => setAgendaOpen(false)}
          rows={polizas}
          onOpen={
            polEdit
              ? (row) => {
                  // Un modal a la vez: se cierra la agenda y se abre la póliza.
                  setAgendaOpen(false);
                  openPolizaEdit(row);
                }
              : undefined
          }
        />
      ) : null}

      <NuevoMantenimientoModal open={chooserOpen} onClose={() => setChooserOpen(false)} opciones={crearOpciones} onPick={crear} />

      {polModal.open ? (
        <Suspense
          fallback={
            <p className="sr-only" role="status">
              Cargando formulario
            </p>
          }
        >
          <PolizaFormModal
            key={editingPol ? editingPol.id : "nueva"}
            open={polModal.open}
            editing={Boolean(editingPol)}
            polizaId={editingPol?.id ?? null}
            folio={editingPol?.folio || formatDocumentFolio(FOLIO_SERIE.poliza, nextPolizaIdx(polizas))}
            folioIsPreview={!editingPol}
            initialValues={editingPol ? valuesFromRow(editingPol) : EMPTY_POLIZA_VALUES}
            extraClienteOption={extraCliente}
            extraCotizacionOption={extraCotizacion}
            saving={polSaving}
            onClose={() => {
              if (!polSaving) setPolModal({ open: false, row: null });
            }}
            onSave={(values) => void savePoliza(values)}
          />
        </Suspense>
      ) : null}

      {verReportes ? (
        <ReporteFormModal
          open={reporteFormOpen}
          reporteId={reporteId}
          onClose={() => navigate(MANTENIMIENTO_PATH, { replace: true })}
          onSaved={(flash) => {
            notify(flash.variant, flash.title, flash.message);
            void reloadReportes();
          }}
        />
      ) : null}

      <PolizaDeleteModal row={polDeleting} deleting={polDeleteBusy} onCancel={() => setPolDeleting(null)} onConfirm={() => void confirmDeletePoliza()} />
      <ReporteDeleteModal row={repDeleting} deleting={repDeleteBusy} onCancel={() => setRepDeleting(null)} onConfirm={() => void confirmDeleteReporte()} />

      {aviso ? <Alert key={aviso.id} variant={aviso.variant} title={aviso.title} message={aviso.message} showLink={false} onClose={() => setAviso(null)} /> : null}
    </div>
  );
}
