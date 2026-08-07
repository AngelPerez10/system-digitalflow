import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { PencilIcon, TrashBinIcon } from "@/icons";
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
    const tid = row.draft?.tecnico?.id ?? null;
    if (opts.tecnicoId === 0) {
      if (tid != null) return false;
    } else if (tid !== opts.tecnicoId) {
      return false;
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
      const t = row.draft?.tecnico;
      if (t?.id != null && Number.isFinite(t.id) && t.id > 0 && !map.has(t.id)) {
        map.set(t.id, String(t.nombre || "").trim() || `Técnico #${t.id}`);
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b] sm:left-3.5"
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
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
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
          title="Listado"
          desc="Resultados del mes seleccionado, búsqueda y filtros. En pantallas pequeñas verás tarjetas; en escritorio, la tabla completa."
          className={`overflow-visible ${pageCardShellClass}`}
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
          <div className="p-2 pt-0">
            {loading ? (
              <div
                className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                role="status"
                aria-live="polite"
              >
                Cargando proyectos…
              </div>
            ) : (
              <>
                <ProyectosMobileList
                  rows={filteredRows}
                  hasSearch={hasActiveListQuery}
                  canEdit={canProyectosEdit}
                  canDelete={canProyectosDelete}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />

                <div className={"hidden md:block " + erpTableWrapClass}>
                  <Table className="w-full min-w-[1180px] table-fixed sm:min-w-0 xl:min-w-full">
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
                        <TableCell isHeader scope="col" className="w-[120px] min-w-[110px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
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
                          const tecnicoNombre = row.draft?.tecnico?.nombre?.trim() || "";
                          const auxiliarNombre = row.draft?.auxiliar?.nombre?.trim() || "";
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
                                <span className="block truncate text-gray-900 dark:text-white" title={tecnicoNombre}>
                                  {tecnicoNombre}
                                </span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                              {auxiliarNombre ? (
                                <span className="block truncate text-gray-900 dark:text-white" title={auxiliarNombre}>
                                  {auxiliarNombre}
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
                              {canProyectosEdit || canProyectosDelete ? (
                                <div className={erpRowActionBarClass}>
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
                              ) : (
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5 sm:py-4">
                  <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                      Mostrando{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {filteredRows.length > 0 ? 1 : 0}
                      </span>{" "}
                      a{" "}
                      <span className="font-medium text-gray-900 dark:text-white">{filteredRows.length}</span>{" "}
                      de{" "}
                      <span className="font-medium text-gray-900 dark:text-white">{filteredRows.length}</span>{" "}
                      proyectos
                      {hasActiveListQuery ? " (filtrados)" : ""}
                    </p>

                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Navegación por mes">
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
                      <span className="min-w-[130px] text-center text-[11px] capitalize text-gray-700 dark:text-gray-300 sm:min-w-[160px] sm:text-[12px]">
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
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ComponentCard>

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
