import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { PencilIcon } from "@/icons";
import { erpSansStyle } from "@/layout/erpPageStyles";
import {
  claudeBodyClass,
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpHeroBlurClass,
  erpHeroGradientClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
  pageCardShellClass,
  pageSearchInputClass,
  sectionLabelOrangeClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import { useOrdenesPagePermissions } from "../OrdenesTrabajo/OrdenServicio/useOrdenesPagePermissions";
import ProyectoFormModal from "./ProyectoFormModal";
import { ProyectosMobileList } from "./ProyectosMobileList";
import { ProyectosPageStats } from "./ProyectosPageStats";
import {
  computeProyectoStats,
  createEmptyProyectoDraft,
  estadoProyectoBadgeClass,
  estadoProyectoLabel,
  proyectoRowFromDraft,
} from "./proyectoFormUtils";
import { formatProyectoFecha, proyectoOrigenBadgeClass } from "./proyectoPageStyles";
import { MOCK_PROYECTOS_ROWS } from "./proyectoMockData";
import type { ProyectoDraft, ProyectoRow } from "./proyectoTypes";

function proyectoMatchesSearch(row: ProyectoRow, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    row.folio.toLowerCase().includes(term) ||
    row.cliente.toLowerCase().includes(term) ||
    row.cotizacionFolio.toLowerCase().includes(term) ||
    estadoProyectoLabel(row.estado).toLowerCase().includes(term)
  );
}

export default function ProyectosPage() {
  const { canOrdenesCreate, canOrdenesEdit } = useOrdenesPagePermissions();
  const emptyDraft = useMemo(() => createEmptyProyectoDraft(), []);

  const [rows, setRows] = useState<ProyectoRow[]>(MOCK_PROYECTOS_ROWS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<ProyectoRow | null>(null);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const stats = useMemo(() => computeProyectoStats(rows), [rows]);

  const filteredRows = useMemo(
    () => rows.filter((r) => proyectoMatchesSearch(r, searchTerm)),
    [rows, searchTerm]
  );

  const modalDraft = editingRow?.draft ?? emptyDraft;

  const showPermissionWarning = (message: string) => {
    setAlert({ show: true, variant: "warning", title: "Sin permiso", message });
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
  };

  const openNew = () => {
    if (!canOrdenesCreate) {
      showPermissionWarning("No tienes permiso para crear proyectos.");
      return;
    }
    setEditingRow(null);
    setShowModal(true);
  };

  const openEdit = (row: ProyectoRow) => {
    if (!canOrdenesEdit) {
      showPermissionWarning("No tienes permiso para editar proyectos.");
      return;
    }
    setEditingRow(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRow(null);
  };

  const handleSave = (draft: ProyectoDraft) => {
    const wasEditing = Boolean(editingRow);
    if (editingRow) {
      setRows((prev) =>
        prev.map((r) => (r.id === editingRow.id ? proyectoRowFromDraft(draft, editingRow) : r))
      );
    } else {
      setRows((prev) => [proyectoRowFromDraft(draft), ...prev]);
    }
    closeModal();
    setAlert({
      show: true,
      variant: "success",
      title: wasEditing ? "Proyecto actualizado" : "Proyecto creado",
      message: wasEditing
        ? `Los cambios de "${draft.cliente}" se guardaron correctamente.`
        : `El proyecto de "${draft.cliente}" se registró en el listado.`,
    });
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
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
                <span className="rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                  Vista diseño
                </span>
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

          <button type="button" onClick={openNew} className={`${erpPrimaryBtnClass} lg:shrink-0`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo proyecto
          </button>
        </div>

        <ComponentCard
          compact
          title="Listado"
          desc="Resultados según búsqueda. En pantallas pequeñas verás tarjetas; en escritorio, la tabla completa."
          className={`overflow-visible ${pageCardShellClass}`}
        >
          <div className="p-2 pt-0">
            <ProyectosMobileList
              rows={filteredRows}
              hasSearch={Boolean(searchTerm.trim())}
              canEdit={canOrdenesEdit}
              onEdit={openEdit}
            />

            <div className={"hidden md:block " + erpTableWrapClass}>
              <Table className="w-full min-w-[960px] table-fixed sm:min-w-0 xl:min-w-full">
                <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                  <TableRow>
                    <TableCell isHeader scope="col" className="w-[96px] min-w-[88px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Folio
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-2/5 min-w-[200px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Cliente
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
                      <TableCell colSpan={7} className="px-2 py-10">
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          {searchTerm
                            ? "No hay proyectos que coincidan con la búsqueda."
                            : "Aún no hay proyectos registrados."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.id} className={erpTableRowHoverClass}>
                        <TableCell className="whitespace-nowrap px-2 py-2 align-middle">
                          <span className="inline-flex items-center rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white sm:text-[11px]">
                            {row.folio}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2 align-top">
                          <span className="block truncate font-medium text-gray-900 dark:text-white sm:text-[12px]" title={row.cliente}>
                            {row.cliente}
                          </span>
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
                                  : `#${row.cotizacionFolio}`}
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
                          {canOrdenesEdit ? (
                            <div className={erpRowActionBarClass}>
                              <button
                                type="button"
                                className={erpRowActionBtnClass}
                                onClick={() => openEdit(row)}
                                aria-label={`Editar proyecto ${row.folio}`}
                                title="Editar"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                Mostrando{" "}
                <span className="font-medium text-gray-900 dark:text-white">{filteredRows.length}</span> de{" "}
                <span className="font-medium text-gray-900 dark:text-white">{rows.length}</span> proyectos
                {searchTerm ? " (filtrados)" : ""}
              </p>
            </div>
          </div>
        </ComponentCard>

        <ProyectoFormModal
          key={editingRow?.id ?? "new"}
          open={showModal}
          editing={Boolean(editingRow)}
          initialDraft={modalDraft}
          onClose={closeModal}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
