import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/lib/utils";
import { FOLIO_SERIE, formatDocumentFolio, matchesDocumentFolio } from "@/utils/documentFolio";
import {
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpDangerBtnClass,
  erpHeroBlurClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpMobileCardClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpSansStyle,
  erpSecondaryBtnClass,
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
  osHeroBandClass,
  osHeroBodyClass,
  osHeroEyebrowClass,
  osTableBodyClass,
  osThCellClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { deleteReporte, isReporteApiError, listReportes } from "./reporteApi";
import { countReporteFotos, type ReporteMantenimiento } from "./reporteTypes";
import { ReportesPageStats } from "./ReportesPageStats";

function formatFechaMx(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso || "—";
  return `${d}/${m}/${y}`;
}

function matchesSearch(row: ReporteMantenimiento, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    matchesDocumentFolio(row.folio, term) ||
    matchesDocumentFolio(row.orden_folio, term) ||
    row.tecnico_nombre.toLowerCase().includes(term) ||
    row.orden_cliente.toLowerCase().includes(term) ||
    row.fecha_servicio.includes(term)
  );
}

function ReporteGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path
        d="M4 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 3v5h5M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PdfGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v6h6M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#E7E7EA] bg-[#FAFAFA] text-[#1B5CFF] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#4B7CFF]"
        aria-hidden
      >
        <ReporteGlyph className="h-6 w-6" />
      </span>
      <p className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
        {hasSearch
          ? "Sin coincidencias. Prueba otro folio, cliente o técnico."
          : "Aún no hay reportes. Crea el primero con «Nuevo reporte»."}
      </p>
    </div>
  );
}

export default function ReportesMantenimientoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const deleteTitleId = useId();
  const [rows, setRows] = useState<ReporteMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingRow, setDeletingRow] = useState<ReporteMantenimiento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const showAlert = useCallback(
    (variant: "success" | "warning" | "error", title: string, message: string, ms = 3500) => {
      setAlert({ show: true, variant, title, message });
      window.setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReportes();
      setRows(data);
    } catch (err) {
      showAlert(
        "error",
        "Error al cargar",
        isReporteApiError(err) ? err.message : "No se pudo cargar el listado.",
        5000
      );
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  // Aviso al volver desde el editor tras guardar.
  const flashDone = useRef(false);
  useEffect(() => {
    const flash = (location.state as { flash?: { variant: "success" | "warning" | "error"; title: string; message: string } } | null)?.flash;
    if (!flash || flashDone.current) return;
    flashDone.current = true;
    showAlert(flash.variant, flash.title, flash.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, showAlert]);

  const filtered = useMemo(
    () => rows.filter((row) => matchesSearch(row, searchTerm)),
    [rows, searchTerm]
  );

  const hasSearch = Boolean(searchTerm.trim());

  const stats = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      total: rows.length,
      conSecciones: rows.filter((r) => r.secciones.length > 0).length,
      totalFotos: rows.reduce((acc, r) => acc + countReporteFotos(r.secciones), 0),
      esteMes: rows.filter((r) => r.fecha_servicio.startsWith(ym)).length,
    };
  }, [rows]);

  const deletingFolio = deletingRow
    ? deletingRow.folio || formatDocumentFolio(FOLIO_SERIE.reporte, deletingRow.idx)
    : "";

  const confirmDelete = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await deleteReporte(deletingRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      showAlert("success", "Reporte eliminado", `${deletingFolio} se eliminó correctamente.`);
      setDeletingRow(null);
    } catch (err) {
      showAlert(
        "error",
        "No se pudo eliminar",
        isReporteApiError(err) ? err.message : "Inténtalo de nuevo.",
        4500
      );
    } finally {
      setDeleting(false);
    }
  };

  const openPdf = (row: ReporteMantenimiento) => {
    navigate(`/reportes-mantenimiento/${row.id}/pdf`, {
      state: { from: "/reportes-mantenimiento" },
    });
  };

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title="Reporte de mantenimiento | Operación"
          description="Reportes ligados a órdenes de servicio con secciones Antes/Después"
        />

        {alert.show ? (
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        ) : null}

        <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={erpBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Reporte de mantenimiento</span>
        </nav>

        <header className={osHeroBandClass}>
          <div className={erpHeroBlurClass} aria-hidden />
          <div className="relative flex min-w-0 items-start gap-4">
            <span className={erpHeroIconWrapClass} aria-hidden>
              <ReporteGlyph className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={osHeroEyebrowClass}>Operación</p>
              <h1 className={`mt-1 ${erpHeroHeadingClass}`}>Reporte de mantenimiento</h1>
              <p className={osHeroBodyClass}>
                Vincula una orden de servicio, captura evidencia Antes / Después y genera el PDF desde el servidor.
              </p>
            </div>
          </div>
        </header>

        <ReportesPageStats stats={stats} />

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8EA0B8]"
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
              placeholder="Buscar por folio RM, orden, cliente o técnico…"
              className={pageSearchInputClass}
              aria-label="Buscar reportes"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/[0.06]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                </svg>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => navigate("/reportes-mantenimiento/nuevo")}
            className={`${erpPrimaryBtnClass} lg:shrink-0`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo reporte
          </button>
        </div>

        <section
          className={`overflow-visible ${pageCardShellClass}`}
          aria-labelledby="reportes-listado-heading"
        >
          <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                <ReporteGlyph className="size-4" />
              </span>
              <h2
                id="reportes-listado-heading"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]"
              >
                Listado de reportes
              </h2>
            </div>
            <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
              {loading
                ? "Cargando…"
                : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}${
                    hasSearch ? " · filtro activo" : ""
                  }. En pantallas pequeñas desplázate horizontalmente si hace falta.`}
            </p>
          </div>

          <div className="p-2 sm:p-3">
            {/* Mobile */}
            <div className="md:hidden">
              {loading ? (
                <p className="px-2 py-10 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]" role="status">
                  Cargando…
                </p>
              ) : filtered.length === 0 ? (
                <EmptyState hasSearch={hasSearch} />
              ) : (
                <ul className="space-y-3">
                  {filtered.map((row) => {
                    const folio =
                      row.folio || formatDocumentFolio(FOLIO_SERIE.reporte, row.idx);
                    const isDeleting = deleting && deletingRow?.id === row.id;
                    return (
                      <li key={row.id} className={erpMobileCardClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{folio}</p>
                            <p className="mt-1 truncate text-sm font-medium text-[#09090B] dark:text-white">
                              {row.orden_cliente || "Sin cliente"}
                            </p>
                            <p className="mt-0.5 text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                              {row.orden_folio || "Sin orden"} · {formatFechaMx(row.fecha_servicio)}
                            </p>
                          </div>
                          <div className={erpRowActionBarClass}>
                            <button
                              type="button"
                              className={erpRowActionBtnClass}
                              aria-label={`Editar ${folio}`}
                              onClick={() => navigate(`/reportes-mantenimiento/${row.id}`)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={erpRowActionBtnClass}
                              aria-label={`Abrir PDF ${folio}`}
                              onClick={() => openPdf(row)}
                            >
                              <PdfGlyph className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={cn(erpRowActionBtnClass, "hover:border-rose-400 hover:text-rose-600")}
                              aria-label={`Eliminar ${folio}`}
                              disabled={isDeleting}
                              onClick={() => setDeletingRow(row)}
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EDEDED] pt-3 text-xs dark:border-[#273244]">
                          <div>
                            <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Técnico</dt>
                            <dd className="mt-0.5 truncate font-medium text-[#09090B] dark:text-white">
                              {row.tecnico_nombre || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Fotos</dt>
                            <dd className="mt-0.5 font-medium tabular-nums text-[#09090B] dark:text-white">
                              {countReporteFotos(row.secciones)}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Desktop — mismo patrón denso que Órdenes / Proyectos */}
            {loading ? (
              <div
                className="hidden px-4 py-10 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8] md:block"
                role="status"
                aria-live="polite"
              >
                Cargando…
              </div>
            ) : (
              <div className={cn("hidden md:block", erpTableWrapClass)}>
                <Table className="w-full min-w-[920px] table-fixed xl:min-w-full">
                  <TableHeader className={`${erpTableHeaderClass} sticky top-0 z-10`}>
                    <TableRow>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[100px] whitespace-nowrap")}>
                        Folio
                      </TableCell>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[100px] whitespace-nowrap")}>
                        Orden
                      </TableCell>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[22%] min-w-[140px]")}>
                        Cliente
                      </TableCell>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[100px] whitespace-nowrap")}>
                        Fecha
                      </TableCell>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[16%] min-w-[120px]")}>
                        Técnico
                      </TableCell>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[72px] whitespace-nowrap text-center")}>
                        Fotos
                      </TableCell>
                      <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[120px] whitespace-nowrap text-center")}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={osTableBodyClass}>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="px-3 py-4">
                          <EmptyState hasSearch={hasSearch} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => {
                        const folio =
                          row.folio || formatDocumentFolio(FOLIO_SERIE.reporte, row.idx);
                        const isDeleting = deleting && deletingRow?.id === row.id;
                        return (
                          <TableRow key={row.id} className={erpTableRowHoverClass}>
                            <TableCell className="px-3 py-2 font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                              {folio}
                            </TableCell>
                            <TableCell className="px-3 py-2 font-medium">{row.orden_folio || "—"}</TableCell>
                            <TableCell className="px-3 py-2">
                              <span className="line-clamp-1" title={row.orden_cliente || undefined}>
                                {row.orden_cliente || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 tabular-nums">
                              {formatFechaMx(row.fecha_servicio)}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <span className="line-clamp-1" title={row.tecnico_nombre || undefined}>
                                {row.tecnico_nombre || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-center">
                              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-[rgba(27,92,255,0.10)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#1B5CFF] ring-1 ring-inset ring-[rgba(27,92,255,0.20)] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF] dark:ring-[rgba(75,124,255,0.28)]">
                                {countReporteFotos(row.secciones)}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <div className={cn(erpRowActionBarClass, "mx-auto")}>
                                <button
                                  type="button"
                                  className={erpRowActionBtnClass}
                                  aria-label={`Editar ${folio}`}
                                  title="Editar"
                                  onClick={() => navigate(`/reportes-mantenimiento/${row.id}`)}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className={erpRowActionBtnClass}
                                  aria-label={`Abrir PDF ${folio}`}
                                  title="Abrir PDF"
                                  onClick={() => openPdf(row)}
                                >
                                  <PdfGlyph className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className={cn(erpRowActionBtnClass, "hover:border-rose-400 hover:text-rose-600")}
                                  aria-label={`Eliminar ${folio}`}
                                  title="Eliminar"
                                  disabled={isDeleting}
                                  onClick={() => setDeletingRow(row)}
                                >
                                  <TrashBinIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading ? (
              <div className="border-t border-[#E7E7EA] px-3 py-3 dark:border-[#273244] sm:px-5 sm:py-4">
                <p className="text-xs text-[#52525B] dark:text-[#8EA0B8] sm:text-sm">
                  {hasSearch ? (
                    <>
                      {filtered.length.toLocaleString("es-MX")} resultado
                      {filtered.length === 1 ? "" : "s"}
                      {searchTerm.trim() ? <> para «{searchTerm.trim()}»</> : null}
                    </>
                  ) : (
                    <>
                      Mostrando{" "}
                      <span className="font-medium text-[#09090B] dark:text-white">
                        {filtered.length.toLocaleString("es-MX")}
                      </span>{" "}
                      reporte{filtered.length === 1 ? "" : "s"}
                    </>
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </section>

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
              <h3 id={deleteTitleId} className="text-base font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                Eliminar reporte
              </h3>
              <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#52525B] dark:text-[#94a3b8]">
                {deleting ? (
                  "Por favor espera; esto puede tardar unos segundos."
                ) : (
                  <>
                    ¿Eliminar{" "}
                    <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                      {deletingFolio || "este reporte"}
                    </span>
                    {deletingRow?.orden_cliente ? <> de «{deletingRow.orden_cliente}»?</> : "?"} Esta acción no se
                    puede deshacer.
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
