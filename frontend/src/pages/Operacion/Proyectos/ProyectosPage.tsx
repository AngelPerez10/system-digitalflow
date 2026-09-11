import { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { TrashBinIcon } from "@/icons";
import { fetchApi } from "@/config/api";
import {
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpHeroBlurClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpMonthNavBtnClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSecondaryBtnClass,
  erpTableHeaderClass,
  erpTableWrapClass,
  osHeroBandClass,
  osHeroBodyClass,
  osHeroEyebrowClass,
  osTableBodyClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import {
  getCurrentYearMonth,
} from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { parseYearMonth } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageUtils";
import { fetchTodosLosUsuariosApi } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import ProyectoFormModal from "./form/ProyectoFormModal";
import ProyectoEnviarPdfModal, {
  type ProyectoEnviarPdfTarget,
} from "./list/ProyectoEnviarPdfModal";
import {
  ProyectosListFiltersPopover,
  type ProyectoListFilterStatus,
  type ProyectoTecnicoFilterOption,
} from "./list/ProyectosListFiltersPopover";
import { ProyectosListTableRow } from "./list/ProyectosListTableRow";
import { ProyectosMobileList } from "./list/ProyectosMobileList";
import { ProyectoStatusSectionHeader } from "./list/ProyectoStatusSectionHeader";
import { ProyectosPageStats } from "./list/ProyectosPageStats";
import ProyectosStatusSegmentFilter, {
  type ProyectoStatusCounts,
} from "./list/ProyectosStatusSegmentFilter";
import {
  createProyecto,
  deleteProyecto,
  listProyectos,
  updateProyecto,
  type ProyectoApiError,
} from "./shared/proyectoApi";
import {
  createProyectoInstalacion,
  isProyectoInstalacionApiError,
  buildInstalacionPayload,
  updateProyectoInstalacion,
  type ProyectoInstalacionDraft,
} from "./instalaciones";
import {
  computeProyectoStats,
  createEmptyProyectoDraft,
  displayProyectoFolio,
  estadoProyectoLabel,
} from "./shared/proyectoFormUtils";
import {
  groupProyectosByStatus,
  proyectoListStatusCountKey,
} from "./shared/proyectoStatusSections";
import { matchesDocumentFolio } from "@/utils/documentFolio";
import { useProyectosPagePermissions } from "./useProyectosPagePermissions";
import type { ProyectoDraft, ProyectoRow } from "./shared/proyectoTypes";

function tecnicoNombreFromUser(u: {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  id: number;
}): string {
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  if (full) return full;
  return String(u.username || u.email || "").trim() || `Técnico #${u.id}`;
}

function unwrapListResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const results = (data as { results?: T[] } | null)?.results;
  return Array.isArray(results) ? results : [];
}

function proyectoMatchesSearch(row: ProyectoRow, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    matchesDocumentFolio(row.folio, term) ||
    matchesDocumentFolio(row.cotizacionFolio, term) ||
    row.cliente.toLowerCase().includes(term) ||
    estadoProyectoLabel(row.estado).toLowerCase().includes(term)
  );
}

function proyectoTiposLabels(row: ProyectoRow): string[] {
  const tipos = row.draft?.tiposTrabajo;
  if (Array.isArray(tipos) && tipos.length > 0) {
    return tipos
      .map((t) => String(t.nombre || "").trim() || (t.id != null ? `#${t.id}` : ""))
      .filter(Boolean);
  }
  const legacy = String(row.draft?.tipoTrabajoNombre || "").trim();
  return legacy ? [legacy] : [];
}

/** Filtros del popover (sin estado: el estado vive en la barra segmentada). */
function proyectoMatchesSecondaryFilters(
  row: ProyectoRow,
  opts: {
    tipos: string[];
    date: string;
    tecnicoId: number | null;
  }
): boolean {
  if (opts.date) {
    const rowDate = String(row.fecha || row.draft?.fechaAutorizacion || "").slice(0, 10);
    if (rowDate !== opts.date.slice(0, 10)) return false;
  }

  if (opts.tecnicoId != null) {
    const tid = opts.tecnicoId;
    if (tid === 0) {
      const hasTech =
        (row.draft?.tecnicos?.some((t) => t.id != null) ?? false) ||
        row.draft?.tecnico?.id != null;
      if (hasTech) return false;
    } else {
      const inList = row.draft?.tecnicos?.some((t) => t.id != null && Number(t.id) === tid);
      const legacy = row.draft?.tecnico?.id != null && Number(row.draft.tecnico.id) === tid;
      if (!inList && !legacy) return false;
    }
  }

  if (opts.tipos.length > 0) {
    const labels = proyectoTiposLabels(row);
    const hit = opts.tipos.some((t) => labels.includes(t));
    if (!hit) return false;
  }

  return true;
}

function countSecondaryProyectoFilters(opts: {
  tipos: string[];
  date: string;
  tecnicoId: number | null;
}): number {
  let n = 0;
  if (opts.tipos.length > 0) n += 1;
  if (opts.date.trim()) n += 1;
  if (opts.tecnicoId != null) n += 1;
  return n;
}

function isProyectoApiError(err: unknown): err is ProyectoApiError {
  return Boolean(err && typeof err === "object" && "message" in err && "status" in err);
}

export default function ProyectosPage() {
  const navigate = useNavigate();
  const { canProyectosCreate, canProyectosEdit, canProyectosDelete, isAdmin } =
    useProyectosPagePermissions();
  const emptyDraft = useMemo(() => createEmptyProyectoDraft(), []);
  const deleteTitleId = useId();

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
  const [deleting, setDeleting] = useState(false);
  const [enviarPdfProyecto, setEnviarPdfProyecto] = useState<ProyectoEnviarPdfTarget | null>(
    null
  );
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });
  /** Alerta dentro del modal: la de página (`alert`) queda oculta detrás del overlay mientras el modal está abierto. */
  const [modalAlert, setModalAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "error", title: "", message: "" });
  const [isSavingProyecto, setIsSavingProyecto] = useState(false);

  /** Catálogo de Servicios + tipos ya usados en proyectos (p. ej. legacy). */
  const tiposTrabajoDisponibles = useMemo(() => {
    const set = new Set(catalogTiposTrabajo);
    for (const row of rows) {
      for (const label of proyectoTiposLabels(row)) set.add(label);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [catalogTiposTrabajo, rows]);

  /** Opciones de técnico desde API + cualquier asignado que no venga en catálogo. */
  const tecnicosDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of catalogTecnicos) {
      if (t.id > 0) map.set(t.id, t.nombre);
    }
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

  const secondaryFilterCount = useMemo(
    () =>
      countSecondaryProyectoFilters({
        tipos: filterTiposTrabajo,
        date: filterDate,
        tecnicoId: filterTecnicoId,
      }),
    [filterTiposTrabajo, filterDate, filterTecnicoId],
  );

  const clearSecondaryFilters = () => {
    setFilterTiposTrabajo([]);
    setFilterDate("");
    setFilterTecnicoId(null);
  };

  const rowsBeforeStatus = useMemo(() => {
    const q = searchTerm.trim();
    return rows.filter((r) => {
      if (!proyectoMatchesSearch(r, searchTerm)) return false;
      // Con búsqueda libre se muestran coincidencias de cualquier mes (igual que órdenes).
      if (!q && selectedMonth) {
        const fecha = String(r.fecha || r.draft?.fechaAutorizacion || "").slice(0, 10);
        if (!fecha.startsWith(selectedMonth)) return false;
      }
      return proyectoMatchesSecondaryFilters(r, {
        tipos: filterTiposTrabajo,
        date: filterDate,
        tecnicoId: filterTecnicoId,
      });
    });
  }, [rows, searchTerm, selectedMonth, filterTiposTrabajo, filterDate, filterTecnicoId]);

  const statusCounts = useMemo(() => {
    const c: ProyectoStatusCounts = {
      en_proceso: 0,
      pausado: 0,
      cerrado: 0,
      cancelado: 0,
    };
    for (const r of rowsBeforeStatus) {
      const key = proyectoListStatusCountKey(r.estado ?? r.draft?.status);
      if (key) c[key] += 1;
    }
    return c;
  }, [rowsBeforeStatus]);

  const filteredRows = useMemo(() => {
    if (!filterStatus) return rowsBeforeStatus;
    return rowsBeforeStatus.filter(
      (r) => proyectoListStatusCountKey(r.estado ?? r.draft?.status) === filterStatus,
    );
  }, [rowsBeforeStatus, filterStatus]);

  const hasActiveListQuery =
    Boolean(searchTerm.trim()) || secondaryFilterCount > 0 || Boolean(filterStatus);

  const statusSections = useMemo(
    () => groupProyectosByStatus(filteredRows),
    [filteredRows],
  );

  const stats = useMemo(() => {
    const monthKey = selectedMonth || getCurrentYearMonth();
    return computeProyectoStats(
      rows.filter((r) => String(r.fecha || r.draft?.fechaAutorizacion || "").slice(0, 10).startsWith(monthKey))
    );
  }, [rows, selectedMonth]);

  const modalDraft = editingRow?.draft ?? emptyDraft;

  const showAlert = (
    variant: "success" | "warning" | "error",
    title: string,
    message: string,
    ms = 3000
  ) => {
    setAlert({ show: true, variant, title, message });
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
  };

  const showPermissionWarning = (message: string) => {
    showAlert("warning", "Sin permiso", message, 2500);
  };

  const showModalAlert = (
    variant: "success" | "warning" | "error" | "info",
    title: string,
    message: string,
    ms = 6000
  ) => {
    setModalAlert({ show: true, variant, title, message });
    setTimeout(() => setModalAlert((prev) => ({ ...prev, show: false })), ms);
  };

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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [servRes, usuariosList] = await Promise.all([
          fetchApi("/api/servicios/?page=1&page_size=500&ordering=idx", {
            cache: "no-store" as RequestCache,
          }),
          // Todos los usuarios activos (no solo técnicos) para el filtro por usuario.
          fetchTodosLosUsuariosApi(),
        ]);
        if (cancelled) return;

        if (servRes.ok) {
          const data = await servRes.json().catch(() => null);
          const results = unwrapListResults<{ nombre?: string; activo?: boolean }>(data);
          const names = results
            .filter((s) => s && typeof s.nombre === "string" && s.nombre.trim() && s.activo !== false)
            .map((s) => String(s.nombre).trim());
          setCatalogTiposTrabajo(Array.from(new Set(names)));
        }

        if (usuariosList.length > 0) {
          setCatalogTecnicos(
            usuariosList
              .filter((u) => u && u.id != null && Number(u.id) > 0)
              .map((u) => ({
                id: Number(u.id),
                nombre: tecnicoNombreFromUser({ ...u, id: Number(u.id) }),
              }))
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

  const openNew = () => {
    if (!canProyectosCreate) {
      showPermissionWarning("No tienes permiso para crear proyectos.");
      return;
    }
    setEditingRow(null);
    setShowModal(true);
  };

  const openEdit = (row: ProyectoRow) => {
    if (!canProyectosEdit) {
      showPermissionWarning("No tienes permiso para editar proyectos.");
      return;
    }
    setEditingRow(row);
    setShowModal(true);
  };

  const openDelete = (row: ProyectoRow) => {
    if (!canProyectosDelete) {
      showPermissionWarning("No tienes permiso para eliminar proyectos.");
      return;
    }
    setDeletingRow(row);
  };

  const openPdf = (row: ProyectoRow) => {
    navigate(`/proyectos/${row.id}/pdf`, { state: { from: "/proyectos" } });
  };

  const openEnviarPdf = (row: ProyectoRow) => {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) return;
    setEnviarPdfProyecto({
      id,
      folio: row.folio,
      cliente: row.cliente,
      estado: row.estado,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRow(null);
    setModalAlert((prev) => (prev.show ? { ...prev, show: false } : prev));
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await deleteProyecto(deletingRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      showAlert(
        "success",
        "Proyecto eliminado",
        `Se eliminó ${displayProyectoFolio(deletingRow.folio)} (${deletingRow.cliente}).`
      );
      setDeletingRow(null);
    } catch (err) {
      console.error("Error al eliminar proyecto:", err);
      showAlert(
        "error",
        "No se pudo eliminar",
        isProyectoApiError(err) ? err.message : "Ocurrió un error al eliminar el proyecto.",
        4500
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (
    draft: ProyectoDraft,
    extras?: {
      instalacionDraft?: ProyectoInstalacionDraft | null;
      omitTechnicianLockedFields?: boolean;
    }
  ) => {
    const wasEditing = Boolean(editingRow);
    setIsSavingProyecto(true);
    try {
      const saved = wasEditing && editingRow
        ? await updateProyecto(editingRow.id, draft, {
            omitTechnicianLockedFields: Boolean(extras?.omitTechnicianLockedFields),
            includeAdminFields: isAdmin,
          })
        : await createProyecto(draft, { includeAdminFields: isAdmin });
      setRows((prev) => {
        if (wasEditing) {
          return prev.map((r) => (r.id === saved.id ? saved : r));
        }
        return [saved, ...prev];
      });

      const pending = extras?.instalacionDraft;
      if (pending?.subtipo) {
        try {
          const payload = buildInstalacionPayload(pending.form, pending.subtipo);
          if (pending.editingId != null) {
            await updateProyectoInstalacion(pending.editingId, {
              proyecto: Number(saved.id),
              payload,
            });
          } else {
            await createProyectoInstalacion({
              proyecto: Number(saved.id),
              payload,
            });
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
      // Alerta dentro del modal: sigue abierto y `alert` (de página) quedaría oculto detrás del overlay.
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

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title="Proyectos | Sistema Grupo Intrax GPS"
          description="Gestión de proyectos vinculados a cotizaciones y seguimiento de equipos"
        />

        {alert.show ? (
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        ) : null}

        <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={erpBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Proyectos</span>
        </nav>

        <header className={osHeroBandClass}>
          <div className={erpHeroBlurClass} aria-hidden />
          <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
            <span className={`${erpHeroIconWrapClass} size-10 sm:size-11`} aria-hidden>
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className={osHeroEyebrowClass}>Operación</p>
              <h1 className={`mt-1 ${erpHeroHeadingClass}`}>Proyectos</h1>
              <p className={`${osHeroBodyClass} line-clamp-3 sm:line-clamp-none`}>
                Vincula cotizaciones DigitalFlow o SICAR, revisa el presupuesto sin precios y da seguimiento a
                entrega e instalación de equipos.
              </p>
            </div>
          </div>
        </header>

        <ProyectosPageStats stats={stats} />

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8EA0B8] sm:left-3 sm:h-4 sm:w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar folio, cliente o cotización…"
              className={pageSearchInputClass}
              aria-label="Buscar proyectos"
            />

            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/[0.06] sm:h-9 sm:rounded-lg"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                </svg>
              </button>
            ) : null}
          </div>

          <button type="button" onClick={openNew} className={`${erpPrimaryBtnClass} w-full sm:w-auto lg:shrink-0`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo proyecto
          </button>
        </div>

        <section className={`overflow-visible ${pageCardShellClass}`} aria-labelledby="proyectos-listado-heading">
          <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <rect x="3" y="4" width="18" height="17" rx="2.2" />
                      <path d="M3 9.5h18" />
                    </svg>
                  </span>
                  <h2
                    id="proyectos-listado-heading"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]"
                  >
                    Listado de proyectos
                  </h2>
                </div>
                <p className="mt-2 text-[13px] leading-[18px] text-[#52525B] dark:text-[#B7C1D1] sm:text-[14px] sm:leading-[20px]">
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
          <div className="p-2 sm:p-3">
            <ProyectosMobileList
              sections={statusSections}
              loading={loading}
              hasSearch={hasActiveListQuery}
              canEdit={canProyectosEdit}
              canDelete={canProyectosDelete}
              onEdit={openEdit}
              onDelete={openDelete}
              onPdf={openPdf}
              onEnviarPdf={openEnviarPdf}
            />

            {loading ? (
              <div
                className="hidden px-4 py-10 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8] md:block"
                role="status"
                aria-live="polite"
              >
                Cargando proyectos…
              </div>
            ) : (
              <div className={"hidden md:block " + erpTableWrapClass}>
                <Table className="w-full min-w-[1240px] table-fixed border-collapse sm:min-w-0 xl:min-w-full">
                  <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                    <TableRow>
                      <TableCell isHeader scope="col" className="w-[96px] min-w-[88px] whitespace-nowrap px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Folio
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[18%] min-w-[160px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Cliente
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[140px] min-w-[130px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Técnico
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[140px] min-w-[130px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Auxiliar
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[140px] min-w-[130px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Cotización
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[150px] min-w-[140px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Equipos
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[110px] min-w-[100px] whitespace-nowrap px-3 py-2 text-center text-[#52525B] dark:text-[#B7C1D1]">
                        Estado
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[100px] min-w-[96px] whitespace-nowrap px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                        Fecha
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[168px] min-w-[160px] whitespace-nowrap px-3 py-2 text-center text-[#52525B] dark:text-[#B7C1D1]">
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={osTableBodyClass}>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="px-3 py-10">
                          <div className="text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                            {hasActiveListQuery
                              ? "No hay proyectos que coincidan con la búsqueda o los filtros."
                              : "Aún no hay proyectos registrados."}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      statusSections.flatMap((section) => {
                        const headingId = `proyectos-table-${section.key.toLowerCase()}`;
                        const headerRow = (
                          <TableRow
                            key={`${section.key}-header`}
                            className="hover:bg-transparent dark:hover:bg-transparent"
                          >
                            <TableCell
                              isHeader
                              scope="colgroup"
                              colSpan={9}
                              className="border-y-0 bg-transparent p-0 text-left"
                            >
                              <div className="px-3 py-2">
                                <ProyectoStatusSectionHeader
                                  statusKey={section.key}
                                  label={section.label}
                                  count={section.rows.length}
                                  headingId={headingId}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );

                        const dataRows = section.rows.map((row) => (
                          <ProyectosListTableRow
                            key={row.id}
                            row={row}
                            headingId={headingId}
                            canEdit={canProyectosEdit}
                            canDelete={canProyectosDelete}
                            onPdf={openPdf}
                            onEnviarPdf={openEnviarPdf}
                            onEdit={openEdit}
                            onDelete={openDelete}
                          />
                        ));

                        return [headerRow, ...dataRows];
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>

        {!loading ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
              {hasActiveListQuery ? (
                <>
                  {filteredRows.length.toLocaleString("es-MX")} resultado
                  {filteredRows.length === 1 ? "" : "s"}
                  {searchTerm.trim() ? (
                    <>
                      {" "}
                      para «{searchTerm.trim()}»
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  Mostrando{" "}
                  <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
                    {filteredRows.length.toLocaleString("es-MX")}
                  </span>{" "}
                  proyectos
                </>
              )}
            </p>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-center" role="group" aria-label="Navegación por mes">
              <button
                type="button"
                onClick={() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return;
                  const d = new Date(ym.year, ym.month - 2, 1);
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  setSelectedMonth(`${d.getFullYear()}-${mm}`);
                }}
                className={erpMonthNavBtnClass}
                title="Mes anterior"
                aria-label="Mes anterior"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="min-w-0 flex-1 truncate text-center text-[12px] capitalize text-[#52525B] sm:min-w-[160px] sm:flex-none sm:text-[12px] dark:text-[#cbd5e1]">
                {(() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return selectedMonth ? selectedMonth : "Todos los meses";
                  return new Date(ym.year, ym.month - 1, 1).toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric",
                  });
                })()}
              </span>
              <button
                type="button"
                onClick={() => {
                  const ym = parseYearMonth(selectedMonth);
                  if (!ym) return;
                  const dt = new Date(ym.year, ym.month - 1, 1);
                  dt.setMonth(dt.getMonth() + 1);
                  const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
                  setSelectedMonth(next);
                }}
                className={erpMonthNavBtnClass}
                title="Mes siguiente"
                aria-label="Mes siguiente"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
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
          onError={(message) => {
            showAlert("error", "Correo", message, 5000);
          }}
        />

        <ProyectoFormModal
          key={editingRow?.id ?? "new"}
          open={showModal}
          editing={Boolean(editingRow)}
          proyectoId={editingRow ? Number(editingRow.id) : null}
          initialDraft={modalDraft}
          onClose={closeModal}
          onSave={handleSave}
          modalAlert={modalAlert}
          isSaving={isSavingProyecto}
        />

        <Modal
          isOpen={Boolean(deletingRow)}
          onClose={() => {
            if (!deleting) setDeletingRow(null);
          }}
          closeOnBackdropClick={!deleting}
          closeOnEscape={!deleting}
          showCloseButton={!deleting}
          ariaLabelledBy={deleteTitleId}
          className={`${erpDeleteModalClass} z-[100000]`}
        >
          <div className={erpDeleteModalPanelClass}>
            <div className="mb-5 flex flex-col items-center text-center">
              <span
                className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/20"
                aria-hidden
              >
                {deleting ? (
                  <span
                    className="h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600 dark:border-rose-900 dark:border-t-rose-400"
                    aria-hidden
                  />
                ) : (
                  <TrashBinIcon className="h-6 w-6" />
                )}
              </span>
              <h3 id={deleteTitleId} className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                Eliminar proyecto
              </h3>
              <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#57534e] dark:text-[#94a3b8]">
                {deleting ? (
                  "Por favor espera; esto puede tardar unos segundos."
                ) : (
                  <>
                    ¿Eliminar{" "}
                    <span className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      {deletingRow ? displayProyectoFolio(deletingRow.folio) : "este proyecto"}
                    </span>
                    {deletingRow?.cliente ? (
                      <>
                        {" "}
                        de «{deletingRow.cliente}»?
                      </>
                    ) : (
                      "?"
                    )}{" "}
                    Esta acción no se puede deshacer.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
              <button
                type="button"
                className={`${erpSecondaryBtnClass} sm:min-w-[8rem]`}
                disabled={deleting}
                onClick={() => setDeletingRow(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${erpDangerBtnClass} sm:min-w-[8rem]`}
                disabled={deleting}
                aria-busy={deleting || undefined}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
