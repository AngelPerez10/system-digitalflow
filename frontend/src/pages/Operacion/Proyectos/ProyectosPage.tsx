import { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { MailIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { erpSansStyle } from "@/layout/erpPageStyles";
import { fetchApi } from "@/config/api";
import {
  claudeBodyClass,
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpHeroBlurClass,
  erpHeroGradientClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpMonthNavBtnClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpSecondaryBtnClass,
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
  pageCardShellClass,
  pageSearchInputClass,
  sectionLabelOrangeClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import {
  getCurrentYearMonth,
} from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { parseYearMonth } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageUtils";
import ProyectoFormModal from "./form/ProyectoFormModal";
import ProyectoEnviarPdfModal, {
  type ProyectoEnviarPdfTarget,
} from "./list/ProyectoEnviarPdfModal";
import {
  ProyectosListFiltersPopover,
  type ProyectoListFilterStatus,
  type ProyectoTecnicoFilterOption,
} from "./list/ProyectosListFiltersPopover";
import { ProyectosMobileList } from "./list/ProyectosMobileList";
import { ProyectosPageStats } from "./list/ProyectosPageStats";
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
  displayCotizacionFolio,
  displayProyectoFolio,
  estadoProyectoBadgeClass,
  estadoProyectoLabel,
} from "./shared/proyectoFormUtils";
import { formatProyectoFecha, proyectoOrigenBadgeClass } from "./shared/proyectoPageStyles";
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

function proyectoMatchesFilters(
  row: ProyectoRow,
  opts: {
    status: ProyectoListFilterStatus;
    tipos: string[];
    date: string;
    tecnicoId: number | null;
  }
): boolean {
  if (opts.status && row.estado !== opts.status) return false;

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

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterStatus) n += 1;
    if (filterTiposTrabajo.length > 0) n += 1;
    if (filterDate.trim()) n += 1;
    if (filterTecnicoId != null) n += 1;
    return n;
  }, [filterStatus, filterTiposTrabajo, filterDate, filterTecnicoId]);

  const clearListFilters = () => {
    setFilterStatus("");
    setFilterTiposTrabajo([]);
    setFilterDate("");
    setFilterTecnicoId(null);
  };

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim();
    return rows.filter((r) => {
      if (!proyectoMatchesSearch(r, searchTerm)) return false;
      // Con búsqueda libre se muestran coincidencias de cualquier mes (igual que órdenes).
      if (!q && selectedMonth) {
        const fecha = String(r.fecha || r.draft?.fechaAutorizacion || "").slice(0, 10);
        if (!fecha.startsWith(selectedMonth)) return false;
      }
      return proyectoMatchesFilters(r, {
        status: filterStatus,
        tipos: filterTiposTrabajo,
        date: filterDate,
        tecnicoId: filterTecnicoId,
      });
    });
  }, [rows, searchTerm, selectedMonth, filterStatus, filterTiposTrabajo, filterDate, filterTecnicoId]);

  const hasActiveListQuery = Boolean(searchTerm.trim()) || activeFilterCount > 0;

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
        const [servRes, tecRes] = await Promise.all([
          fetchApi("/api/servicios/?page=1&page_size=500&ordering=idx", {
            cache: "no-store" as RequestCache,
          }),
          fetchApi("/api/ordenes/tecnico-opciones/").then(async (res) => {
            if (res.ok) return res;
            return fetchApi("/api/users/accounts/");
          }),
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

        if (tecRes.ok) {
          const data = await tecRes.json().catch(() => null);
          const rowsList = unwrapListResults<{
            id?: number;
            first_name?: string;
            last_name?: string;
            email?: string;
            username?: string;
          }>(data);
          setCatalogTecnicos(
            rowsList
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
    try {
      const saved = wasEditing && editingRow
        ? await updateProyecto(editingRow.id, draft, {
            omitTechnicianLockedFields: Boolean(extras?.omitTechnicianLockedFields),
          })
        : await createProyecto(draft);
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
      showAlert(
        "error",
        "No se pudo guardar",
        isProyectoApiError(err) ? err.message : "Ocurrió un error al guardar el proyecto.",
        4500
      );
      throw err;
    }
  };

  return (
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass} style={erpSansStyle}>
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
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Proyectos</span>
        </nav>

        <header className={`relative flex w-full flex-col gap-4 ${pageCardShellClass} p-4 sm:p-6`}>
          <div className={erpHeroBlurClass} />
          <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
            <div className={erpHeroIconWrapClass}>
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
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
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={sectionLabelOrangeClass}>Operación</p>
              </div>
              <h1 className={`mt-0.5 ${erpHeroHeadingClass}`}>Proyectos</h1>
              <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                Vincula cotizaciones{" "}
                <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">DigitalFlow</span> o{" "}
                <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">SICAR</span>, revisa el presupuesto
                sin precios y da seguimiento a entrega e instalación de equipos.
              </p>
              <div className={erpHeroGradientClass} />
            </div>
          </div>
        </header>

        <ProyectosPageStats stats={stats} />

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b]"
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
              placeholder="Buscar por folio, cliente o cotización…"
              className={pageSearchInputClass}
              aria-label="Buscar proyectos"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg text-[#78716c] hover:bg-black/[0.04] hover:text-[#1c1917] dark:text-[#8ea0b8] dark:hover:bg-white/[0.06] dark:hover:text-white"
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

        <ComponentCard
          compact
          title="Listado de proyectos"
          className={`!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)] ${pageCardShellClass}`}
          actions={
            <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
              <ProyectosListFiltersPopover
                open={filterOpen}
                onOpenChange={setFilterOpen}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterTiposTrabajo={filterTiposTrabajo}
                setFilterTiposTrabajo={setFilterTiposTrabajo}
                filterDate={filterDate}
                setFilterDate={setFilterDate}
                filterTecnicoId={filterTecnicoId}
                setFilterTecnicoId={setFilterTecnicoId}
                tiposTrabajoDisponibles={tiposTrabajoDisponibles}
                tecnicos={tecnicosDisponibles}
                activeFilterCount={activeFilterCount}
                onClear={clearListFilters}
                showTecnicoFilter={isAdmin}
                datePickerId="filtro-fecha-proyectos"
              />
            </div>
          }
        >
          <div className="p-2 pt-0 sm:p-3 sm:pt-0">
            <ProyectosMobileList
              rows={filteredRows}
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
                className="hidden px-4 py-10 text-center text-sm text-[#78716c] dark:text-[#8ea0b8] md:block"
                role="status"
                aria-live="polite"
              >
                Cargando proyectos…
              </div>
            ) : (
              <>
                <div className={"hidden md:block " + erpTableWrapClass}>
                  <Table className="w-full min-w-[1240px] table-fixed sm:min-w-0 xl:min-w-full">
                    <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                      <TableRow>
                        <TableCell isHeader scope="col" className="w-[96px] min-w-[88px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Folio
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[18%] min-w-[160px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Cliente
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[140px] min-w-[130px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Técnico
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[140px] min-w-[130px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Auxiliar
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[140px] min-w-[130px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Cotización
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[150px] min-w-[140px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Equipos
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[110px] min-w-[100px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                          Estado
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[100px] min-w-[96px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                          Fecha
                        </TableCell>
                        <TableCell isHeader scope="col" className="w-[168px] min-w-[160px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
                      {filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="px-2 py-10">
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                              {hasActiveListQuery
                                ? "No hay proyectos que coincidan con la búsqueda o los filtros."
                                : "Aún no hay proyectos registrados."}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRows.map((row) => {
                          const tecnicos = row.draft?.tecnicos?.length
                            ? row.draft.tecnicos
                            : row.draft?.tecnico?.id != null
                              ? [{ ...row.draft.tecnico, responsable: true }]
                              : [];
                          const auxiliares = row.draft?.auxiliares?.length
                            ? row.draft.auxiliares
                            : row.draft?.auxiliar?.id != null
                              ? [row.draft.auxiliar]
                              : [];
                          const responsable =
                            tecnicos.find((t) => "responsable" in t && t.responsable) || tecnicos[0];
                          const tecnicoNombre = responsable?.nombre?.trim() || "";
                          const tecnicoExtra =
                            tecnicos.length > 1 ? ` +${tecnicos.length - 1}` : "";
                          const auxiliarNombre = auxiliares[0]?.nombre?.trim() || "";
                          const auxiliarExtra =
                            auxiliares.length > 1 ? ` +${auxiliares.length - 1}` : "";
                          const tecnicoTitle = tecnicos
                            .map((t) => {
                              const n = t.nombre?.trim() || `#${t.id}`;
                              return "responsable" in t && t.responsable ? `${n} (resp.)` : n;
                            })
                            .join(", ");
                          const auxiliarTitle = auxiliares
                            .map((a) => a.nombre?.trim() || `#${a.id}`)
                            .join(", ");
                          return (
                          <TableRow key={row.id} className={erpTableRowHoverClass}>
                            <TableCell className="whitespace-nowrap px-2 py-2 align-middle">
                              <span className="inline-flex items-center rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white sm:text-[11px]">
                                {displayProyectoFolio(row.folio)}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                              <span className="block truncate font-medium text-gray-900 dark:text-white sm:text-[12px]" title={row.cliente}>
                                {row.cliente}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                              {tecnicoNombre ? (
                                <span className="block truncate text-gray-900 dark:text-white" title={tecnicoTitle}>
                                  {tecnicoNombre}
                                  {tecnicoExtra ? (
                                    <span className="text-gray-500 dark:text-gray-400">{tecnicoExtra}</span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                              {auxiliarNombre ? (
                                <span className="block truncate text-gray-900 dark:text-white" title={auxiliarTitle}>
                                  {auxiliarNombre}
                                  {auxiliarExtra ? (
                                    <span className="text-gray-500 dark:text-gray-400">{auxiliarExtra}</span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                              {row.cotizacionFolio === "—" ? (
                                <span className="text-gray-500 dark:text-gray-400">—</span>
                              ) : (
                                <div className="leading-tight">
                                  <span className={proyectoOrigenBadgeClass(row.cotizacionOrigen)}>
                                    {row.cotizacionOrigen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                                  </span>
                                  <div className="mt-1 tabular-nums text-gray-900 dark:text-white">
                                    {row.cotizacionesCount > 1
                                      ? row.cotizacionFolio
                                      : displayCotizacionFolio(row.cotizacionFolio, row.cotizacionOrigen)}
                                  </div>
                                  {row.cotizacionesCount > 1 ? (
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {row.cotizacionesCount} vinculadas
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                              {row.equiposTotal === 0 ? (
                                <span className="text-gray-500 dark:text-gray-400">—</span>
                              ) : (
                                <div className="leading-tight">
                                  <div className="tabular-nums text-gray-900 dark:text-white">
                                    {row.equiposEntregados}/{row.equiposTotal} entregados
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {row.equiposInstalados} instalados
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-2 text-center align-middle">
                              <span className={estadoProyectoBadgeClass(row.estado)}>
                                {estadoProyectoLabel(row.estado)}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-2 py-2 align-middle tabular-nums text-gray-700 dark:text-gray-300">
                              {formatProyectoFecha(row.fecha)}
                            </TableCell>
                            <TableCell className="px-2 py-2 text-center align-middle">
                              <div className={erpRowActionBarClass}>
                                <button
                                  type="button"
                                  className={`${erpRowActionBtnClass} hover:border-red-400 hover:text-red-600`}
                                  onClick={() => openPdf(row)}
                                  aria-label={`Ver PDF del proyecto ${displayProyectoFolio(row.folio)}`}
                                  title="Ver PDF"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden>
                                    <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.895,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
                                    <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
                                    <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
                                    <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className={`${erpRowActionBtnClass} hover:border-sky-400 hover:text-sky-600`}
                                  onClick={() => openEnviarPdf(row)}
                                  aria-label={`Enviar PDF del proyecto ${displayProyectoFolio(row.folio)} por correo`}
                                  title="Enviar PDF por correo"
                                >
                                  <MailIcon className="h-4 w-4" />
                                </button>
                                {canProyectosEdit ? (
                                  <button
                                    type="button"
                                    className={erpRowActionBtnClass}
                                    onClick={() => openEdit(row)}
                                    aria-label={`Editar proyecto ${displayProyectoFolio(row.folio)}`}
                                    title="Editar"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                ) : null}
                                {canProyectosDelete ? (
                                  <button
                                    type="button"
                                    className={erpRowActionBtnClass}
                                    onClick={() => openDelete(row)}
                                    aria-label={`Eliminar proyecto ${displayProyectoFolio(row.folio)}`}
                                    title="Eliminar"
                                  >
                                    <TrashBinIcon className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </ComponentCard>

        {!loading ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
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
                  <span className="font-medium text-[#1c1917] dark:text-[#f8fafc]">
                    {filteredRows.length.toLocaleString("es-MX")}
                  </span>{" "}
                  proyectos
                </>
              )}
            </p>
            <div className="flex items-center gap-2" role="group" aria-label="Navegación por mes">
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
              <span className="min-w-[130px] text-center text-[11px] capitalize text-[#57534e] sm:min-w-[160px] sm:text-[12px] dark:text-[#cbd5e1]">
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
