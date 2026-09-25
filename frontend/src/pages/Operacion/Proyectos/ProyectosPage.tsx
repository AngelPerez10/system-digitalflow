import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Rows3, Search, Trash2, X } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppConfirmDialog, AppModalContext } from "@/components/ui/modal-kit/ModalKit";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { getCurrentYearMonth } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { fetchTodosLosUsuariosApi } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import ProyectoFormModal from "./form/ProyectoFormModal";
import ProyectoEnviarPdfModal, { type ProyectoEnviarPdfTarget } from "./list/ProyectoEnviarPdfModal";
import {
  ProyectosListFiltersPopover,
  type ProyectoListFilterStatus,
  type ProyectoTecnicoFilterOption,
} from "./list/ProyectosListFiltersPopover";
import { ProyectosCardGrid } from "./list/ProyectosCardGrid";
import { MonthSwitcher, ProyectosHero } from "./list/ProyectosHero";
import { ProyectosPageStats } from "./list/ProyectosPageStats";
import { ProyectosCardsSkeleton, ProyectosEmptyState, ProyectosTableSkeleton } from "./list/ProyectosListStates";
import { ProyectosTable } from "./list/ProyectosTable";
import ProyectosStatusSegmentFilter, { type ProyectoStatusCounts } from "./list/ProyectosStatusSegmentFilter";
import {
  erpPrimaryBtnClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { createProyecto, deleteProyecto, listProyectos, updateProyecto, type ProyectoApiError } from "./shared/proyectoApi";
import {
  buildInstalacionPayload,
  createProyectoInstalacion,
  isProyectoInstalacionApiError,
  updateProyectoInstalacion,
  type ProyectoInstalacionDraft,
} from "./instalaciones";
import { computeProyectoStats, createEmptyProyectoDraft, displayProyectoFolio } from "./shared/proyectoFormUtils";
import {
  countSecondaryProyectoFilters,
  proyectoPassesListFilters,
  proyectoRowFecha,
  proyectoTiposLabels,
  shiftYearMonth,
  tecnicoNombreFromUser,
  unwrapListResults,
} from "./shared/proyectoListUtils";
import { groupProyectosByStatus, proyectoListStatusCountKey } from "./shared/proyectoStatusSections";
import { EstadoPill } from "./shared/ProyectoUi";
import { fontSans, sansStyle } from "./shared/proyectoTokens";
import { useProyectosPagePermissions } from "./useProyectosPagePermissions";
import type { ProyectoDraft, ProyectoRow } from "./shared/proyectoTypes";

type PageAlert = {
  show: boolean;
  variant: "success" | "warning" | "error";
  title: string;
  message: string;
};

type ModalAlert = {
  show: boolean;
  variant: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
};

function isProyectoApiError(err: unknown): err is ProyectoApiError {
  return Boolean(err && typeof err === "object" && "message" in err && "status" in err);
}

export default function ProyectosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canProyectosCreate, canProyectosEdit, canProyectosDelete, isAdmin } = useProyectosPagePermissions();
  const tecnicoView = !isAdmin;
  const emptyDraft = useMemo(() => createEmptyProyectoDraft(), []);

  const [rows, setRows] = useState<ProyectoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProyectoListFilterStatus>("");
  const [filterTiposTrabajo, setFilterTiposTrabajo] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterTecnicoId, setFilterTecnicoId] = useState<number | null>(null);
  const [catalogTiposTrabajo, setCatalogTiposTrabajo] = useState<string[]>([]);
  const [catalogTecnicos, setCatalogTecnicos] = useState<ProyectoTecnicoFilterOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<ProyectoRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<ProyectoRow | null>(null);
  const [enviarPdfProyecto, setEnviarPdfProyecto] = useState<ProyectoEnviarPdfTarget | null>(null);
  const [alert, setAlert] = useState<PageAlert>({ show: false, variant: "warning", title: "", message: "" });
  /** Alerta dentro del modal: la de página queda detrás del overlay mientras el modal está abierto. */
  const [modalAlert, setModalAlert] = useState<ModalAlert>({ show: false, variant: "error", title: "", message: "" });
  const [isSavingProyecto, setIsSavingProyecto] = useState(false);

  const showAlert = useCallback((variant: PageAlert["variant"], title: string, message: string, ms = 3000) => {
    setAlert({ show: true, variant, title, message });
    window.setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
  }, []);

  const showModalAlert = useCallback((variant: ModalAlert["variant"], title: string, message: string, ms = 6000) => {
    setModalAlert({ show: true, variant, title, message });
    window.setTimeout(() => setModalAlert((prev) => ({ ...prev, show: false })), ms);
  }, []);

  /* ------------------------------------------------------------------------
     Carga
     ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listProyectos();
        if (!cancelled) setRows(data);
      } catch (err) {
        console.error("Error al cargar proyectos:", err);
        if (!cancelled) {
          showAlert(
            "error",
            "Error al cargar",
            isProyectoApiError(err) ? err.message : "No se pudo cargar el listado de proyectos.",
            4000
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [servRes, usuariosList] = await Promise.all([
          fetchApi("/api/servicios/?page=1&page_size=500&ordering=idx", { cache: "no-store" as RequestCache }),
          // Todos los usuarios activos (no solo técnicos) para el filtro por usuario.
          fetchTodosLosUsuariosApi(),
        ]);
        if (cancelled) return;

        if (servRes.ok) {
          const data = await servRes.json().catch(() => null);
          const names = unwrapListResults<{ nombre?: string; activo?: boolean }>(data)
            .filter((s) => s && typeof s.nombre === "string" && s.nombre.trim() && s.activo !== false)
            .map((s) => String(s.nombre).trim());
          setCatalogTiposTrabajo(Array.from(new Set(names)));
        }

        if (usuariosList.length > 0) {
          setCatalogTecnicos(
            usuariosList
              .filter((u) => u && u.id != null && Number(u.id) > 0)
              .map((u) => ({ id: Number(u.id), nombre: tecnicoNombreFromUser({ ...u, id: Number(u.id) }) }))
          );
        }
      } catch (err) {
        console.error("Error al cargar catálogos de filtros:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------------
     Derivados del listado
     ------------------------------------------------------------------------ */

  /** Catálogo de Servicios + tipos ya usados en proyectos (p. ej. legacy). */
  const tiposTrabajoDisponibles = useMemo(() => {
    const set = new Set(catalogTiposTrabajo);
    for (const row of rows) for (const label of proyectoTiposLabels(row)) set.add(label);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [catalogTiposTrabajo, rows]);

  /** Opciones de técnico desde API + cualquier asignado que no venga en catálogo. */
  const tecnicosDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of catalogTecnicos) if (t.id > 0) map.set(t.id, t.nombre);
    for (const row of rows) {
      const list = row.draft?.tecnicos?.length
        ? row.draft.tecnicos
        : row.draft?.tecnico?.id != null
          ? [row.draft.tecnico]
          : [];
      for (const t of list) {
        if (t?.id != null && Number.isFinite(t.id) && t.id > 0 && !map.has(t.id)) {
          map.set(t.id, String(t.nombre || "").trim() || `Técnico #${t.id}`);
        }
      }
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [catalogTecnicos, rows]);

  const secondaryFilters = useMemo(
    () => ({ tipos: filterTiposTrabajo, date: filterDate, tecnicoId: filterTecnicoId }),
    [filterTiposTrabajo, filterDate, filterTecnicoId]
  );
  const secondaryFilterCount = countSecondaryProyectoFilters(secondaryFilters);

  const clearSecondaryFilters = useCallback(() => {
    setFilterTiposTrabajo([]);
    setFilterDate("");
    setFilterTecnicoId(null);
  }, []);

  const clearAll = useCallback(() => {
    clearSecondaryFilters();
    setSearchTerm("");
    setFilterStatus("");
  }, [clearSecondaryFilters]);

  const rowsBeforeStatus = useMemo(() => {
    return rows.filter((r) =>
      proyectoPassesListFilters(r, {
        search: searchTerm,
        selectedMonth,
        secondary: secondaryFilters,
      })
    );
  }, [rows, searchTerm, selectedMonth, secondaryFilters]);

  const statusCounts = useMemo(() => {
    const c: ProyectoStatusCounts = { en_proceso: 0, pausado: 0, cerrado: 0, cancelado: 0 };
    for (const r of rowsBeforeStatus) {
      const key = proyectoListStatusCountKey(r.estado ?? r.draft?.status);
      if (key) c[key] += 1;
    }
    return c;
  }, [rowsBeforeStatus]);

  const filteredRows = useMemo(() => {
    if (!filterStatus) return rowsBeforeStatus;
    return rowsBeforeStatus.filter((r) => proyectoListStatusCountKey(r.estado ?? r.draft?.status) === filterStatus);
  }, [rowsBeforeStatus, filterStatus]);

  const statusSections = useMemo(() => groupProyectosByStatus(filteredRows), [filteredRows]);

  const hasActiveListQuery = Boolean(searchTerm.trim()) || secondaryFilterCount > 0 || Boolean(filterStatus);

  const stats = useMemo(() => {
    const monthKey = selectedMonth || getCurrentYearMonth();
    return computeProyectoStats(rows.filter((r) => proyectoRowFecha(r).startsWith(monthKey)));
  }, [rows, selectedMonth]);

  /* ------------------------------------------------------------------------
     Acciones
     ------------------------------------------------------------------------ */

  const openNew = useCallback(() => {
    if (!canProyectosCreate) {
      showAlert("warning", "Sin permiso", "No tienes permiso para crear proyectos.", 2500);
      return;
    }
    setEditingRow(null);
    setShowModal(true);
  }, [canProyectosCreate, showAlert]);

  const openEdit = useCallback(
    (row: ProyectoRow) => {
      if (!canProyectosEdit) {
        showAlert("warning", "Sin permiso", "No tienes permiso para editar proyectos.", 2500);
        return;
      }
      setEditingRow(row);
      setShowModal(true);
    },
    [canProyectosEdit, showAlert]
  );

  const openDelete = useCallback(
    (row: ProyectoRow) => {
      if (!canProyectosDelete) {
        showAlert("warning", "Sin permiso", "No tienes permiso para eliminar proyectos.", 2500);
        return;
      }
      setDeletingRow(row);
    },
    [canProyectosDelete, showAlert]
  );

  const openPdf = useCallback(
    (row: ProyectoRow) => navigate(`/proyectos/${row.id}/pdf`, { state: { from: "/proyectos" } }),
    [navigate]
  );

  const openEnviarPdf = useCallback((row: ProyectoRow) => {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) return;
    setEnviarPdfProyecto({ id, folio: row.folio, cliente: row.cliente, estado: row.estado });
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingRow(null);
    setModalAlert((prev) => (prev.show ? { ...prev, show: false } : prev));
  }, []);

  const confirmDelete = async () => {
    if (!deletingRow) return;
    const target = deletingRow;
    try {
      await deleteProyecto(target.id);
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      showAlert("success", "Proyecto eliminado", `Se eliminó ${displayProyectoFolio(target.folio)} (${target.cliente}).`);
    } catch (err) {
      console.error("Error al eliminar proyecto:", err);
      showAlert(
        "error",
        "No se pudo eliminar",
        isProyectoApiError(err) ? err.message : "Ocurrió un error al eliminar el proyecto.",
        4500
      );
    }
  };

  const handleSave = async (
    draft: ProyectoDraft,
    extras?: { instalacionDraft?: ProyectoInstalacionDraft | null; omitTechnicianLockedFields?: boolean }
  ) => {
    const wasEditing = Boolean(editingRow);
    setIsSavingProyecto(true);
    try {
      const saved =
        wasEditing && editingRow
          ? await updateProyecto(editingRow.id, draft, {
              omitTechnicianLockedFields: Boolean(extras?.omitTechnicianLockedFields),
              includeAdminFields: isAdmin,
            })
          : await createProyecto(draft, { includeAdminFields: isAdmin });
      setRows((prev) => (wasEditing ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]));

      const pending = extras?.instalacionDraft;
      if (pending?.subtipo) {
        try {
          const payload = buildInstalacionPayload(pending.form, pending.subtipo);
          if (pending.editingId != null) {
            await updateProyectoInstalacion(pending.editingId, { proyecto: Number(saved.id), payload });
          } else {
            await createProyectoInstalacion({ proyecto: Number(saved.id), payload });
          }
        } catch (insErr) {
          console.error("Error al guardar instalación del proyecto:", insErr);
          showAlert(
            "warning",
            wasEditing ? "Proyecto actualizado" : "Proyecto creado",
            isProyectoInstalacionApiError(insErr)
              ? `El proyecto se guardó, pero la instalación no: ${insErr.message}`
              : "El proyecto se guardó, pero no se pudo registrar la instalación.",
            5000
          );
          closeModal();
          return;
        }
      }

      closeModal();
      window.dispatchEvent(new CustomEvent("cotizaciones:updated"));
      showAlert(
        "success",
        wasEditing ? "Proyecto actualizado" : "Proyecto creado",
        wasEditing
          ? `Los cambios de "${draft.cliente}" se guardaron correctamente.`
          : `El proyecto ${saved.folio} de "${draft.cliente}" se registró correctamente.`
      );
    } catch (err) {
      console.error("Error al guardar proyecto:", err);
      // Alerta dentro del modal: sigue abierto y la de página quedaría detrás del overlay.
      showModalAlert(
        "error",
        "No se pudo guardar",
        isProyectoApiError(err) ? err.message : "Ocurrió un error al guardar el proyecto."
      );
      throw err;
    } finally {
      setIsSavingProyecto(false);
    }
  };

  const handlers = {
    canEdit: canProyectosEdit,
    canDelete: canProyectosDelete,
    onEdit: openEdit,
    onDelete: openDelete,
    onPdf: openPdf,
    onEnviarPdf: openEnviarPdf,
  };

  const grouped = !filterStatus;
  const empty = !loading && filteredRows.length === 0;
  const userFirstName = String(user?.first_name || "").trim().split(/\s+/)[0] || "";
  const shiftMonth = (delta: number) => setSelectedMonth((prev) => shiftYearMonth(prev, delta));

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={sansStyle}>
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-12 pt-6 text-sm text-[#52525B] sm:space-y-6 sm:px-5 sm:pt-7 md:px-6 lg:px-8 xl:px-10 dark:text-[#B7C1D1]">
        <PageMeta
          title="Proyectos | Sistema Grupo Intrax GPS"
          description="Gestión de proyectos vinculados a cotizaciones y seguimiento de equipos"
        />

        {alert.show ? <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} /> : null}

        <nav className="hidden items-center gap-1.5 text-[13px] sm:flex font-medium text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Migas de pan">
          <Link
            to="/"
            className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
          >
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
            Proyectos
          </span>
        </nav>

        <ProyectosHero
          tecnicoView={tecnicoView}
          userFirstName={userFirstName}
          selectedMonth={selectedMonth}
          onShiftMonth={shiftMonth}
        />

        <div className="hidden sm:block">
          <ProyectosPageStats stats={stats} />
        </div>

        {/* Búsqueda + «Nuevo proyecto» (misma disposición que antes). */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative w-full min-w-0 shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8EA0B8] sm:left-3 sm:size-4"
              aria-hidden
            />
            <input
              value={searchTerm}
              onChange={(e) => {
                const next = e.target.value;
                setSearchTerm(next);
                // Al empezar a buscar, mostrar Todas para no ocultar coincidencias de otro status/mes.
                if (next.trim() && !searchTerm.trim()) setFilterStatus("");
              }}
              placeholder="Buscar folio, cliente o cotización…"
              className={pageSearchInputClass}
              aria-label="Buscar proyectos en todos los meses"
              aria-describedby="proyectos-search-hint"
            />
            <p id="proyectos-search-hint" className="sr-only">
              La búsqueda incluye proyectos de cualquier mes. El selector de mes solo aplica cuando el campo está vacío.
            </p>
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/6 sm:h-9 sm:rounded-lg"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {canProyectosCreate ? (
            <button type="button" onClick={openNew} className={`${erpPrimaryBtnClass} w-full sm:w-auto lg:shrink-0`}>
              <Plus className="size-4" aria-hidden />
              Nuevo proyecto
            </button>
          ) : null}
        </div>

        <section className={`overflow-visible ${pageCardShellClass}`} aria-labelledby="proyectos-listado-heading" aria-busy={loading || undefined}>
          <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <Rows3 className="size-4" aria-hidden />
                  </span>
                  <h2
                    id="proyectos-listado-heading"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]"
                  >
                    Listado de proyectos
                  </h2>
                </div>
                <p className="mt-2 text-[13px] leading-4.5 text-[#52525B] dark:text-[#B7C1D1] sm:text-[14px] sm:leading-5">
                  <span className="sm:hidden">Usa la barra de estado y los filtros.</span>
                  <span className="hidden sm:inline">
                    Usa la barra de estado y los filtros para acotar el listado. Agrupados por estado abajo.
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                <ProyectosListFiltersPopover
                  open={filterOpen}
                  onOpenChange={setFilterOpen}
                  filterTiposTrabajo={filterTiposTrabajo}
                  setFilterTiposTrabajo={setFilterTiposTrabajo}
                  filterDate={filterDate}
                  setFilterDate={setFilterDate}
                  filterTecnicoId={filterTecnicoId}
                  setFilterTecnicoId={setFilterTecnicoId}
                  tiposTrabajoDisponibles={tiposTrabajoDisponibles}
                  tecnicos={tecnicosDisponibles}
                  activeFilterCount={secondaryFilterCount}
                  onClear={clearSecondaryFilters}
                  showTecnicoFilter={isAdmin}
                  datePickerId="filtro-fecha-proyectos"
                />
              </div>
            </div>
            <div className="mt-3 min-w-0 max-w-full overflow-hidden">
              <ProyectosStatusSegmentFilter
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                statusCounts={statusCounts}
                totalBeforeStatus={rowsBeforeStatus.length}
              />
            </div>
          </div>

          {/* Tabla en tablet/escritorio; en celular la tabla no cabe y se muestran tarjetas. */}
          <div className="hidden md:block">
            {loading ? (
              <ProyectosTableSkeleton />
            ) : empty ? (
              <ProyectosEmptyState
                filtered={hasActiveListQuery}
                tecnicoView={tecnicoView}
                canCreate={canProyectosCreate}
                onClear={clearAll}
                onNew={openNew}
              />
            ) : (
              <ProyectosTable sections={statusSections} grouped={grouped} {...handlers} />
            )}
          </div>
          <div className="p-3 md:hidden">
            {loading ? (
              <ProyectosCardsSkeleton />
            ) : empty ? (
              <ProyectosEmptyState
                filtered={hasActiveListQuery}
                tecnicoView={tecnicoView}
                canCreate={canProyectosCreate}
                onClear={clearAll}
                onNew={openNew}
              />
            ) : (
              <ProyectosCardGrid sections={statusSections} grouped={grouped} fieldMode={tecnicoView} {...handlers} />
            )}
          </div>
        </section>

        {!loading ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="px-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
              {filteredRows.length.toLocaleString("es-MX")} {filteredRows.length === 1 ? "proyecto" : "proyectos"}
              {searchTerm.trim() ? <> para «{searchTerm.trim()}» (todos los meses)</> : null}
            </p>
            {/* En celular la banda no se muestra: el mes se cambia aquí. */}
            <div className="sm:hidden">
              <MonthSwitcher selectedMonth={selectedMonth} onShiftMonth={shiftMonth} tone="light" />
            </div>
          </div>
        ) : null}

        <ProyectoEnviarPdfModal
          open={enviarPdfProyecto != null}
          proyecto={enviarPdfProyecto}
          onClose={() => setEnviarPdfProyecto(null)}
          onSent={(correo) => {
            setEnviarPdfProyecto(null);
            showAlert("success", "Correo enviado", `El PDF se envió a ${correo}.`, 3500);
          }}
          onError={(message) => showAlert("error", "Correo", message, 5000)}
        />

        <ProyectoFormModal
          key={editingRow?.id ?? "new"}
          open={showModal}
          editing={Boolean(editingRow)}
          proyectoId={editingRow ? Number(editingRow.id) : null}
          folio={editingRow?.folio ?? null}
          initialDraft={editingRow?.draft ?? emptyDraft}
          onClose={closeModal}
          onSave={handleSave}
          modalAlert={modalAlert}
          isSaving={isSavingProyecto}
        />

        <AppConfirmDialog
          open={Boolean(deletingRow)}
          onClose={() => setDeletingRow(null)}
          onConfirm={confirmDelete}
          tone="danger"
          icon={<Trash2 className="size-5" />}
          title="Eliminar proyecto"
          description="Se eliminará el proyecto con su bitácora, evidencias y seguimiento de equipos. Esta acción no se puede deshacer."
          detail={
            deletingRow ? (
              <AppModalContext
                rows={[
                  { label: "Folio", value: displayProyectoFolio(deletingRow.folio), strong: true },
                  { label: "Cliente", value: deletingRow.cliente || "Sin cliente" },
                  { label: "Estado", value: <EstadoPill estado={deletingRow.estado} size="sm" /> },
                ]}
              />
            ) : null
          }
          confirmLabel="Eliminar"
          busyLabel="Eliminando…"
          className={fontSans}
        />
      </div>
    </div>
  );
}
