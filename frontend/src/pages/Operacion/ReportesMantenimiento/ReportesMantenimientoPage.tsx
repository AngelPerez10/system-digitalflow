import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/lib/utils";
import { erpSansStyle } from "@/layout/erpPageStyles";
import { FOLIO_SERIE, formatDocumentFolio, matchesDocumentFolio } from "@/utils/documentFolio";
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

export default function ReportesMantenimientoPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReporteMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const showAlert = useCallback(
    (variant: "success" | "warning" | "error", title: string, message: string) => {
      setAlert({ show: true, variant, title, message });
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
        isReporteApiError(err) ? err.message : "No se pudo cargar el listado."
      );
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const handleDelete = async (row: ReporteMantenimiento) => {
    const ok = window.confirm(`¿Eliminar el reporte ${row.folio}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setDeletingId(row.id);
    try {
      await deleteReporte(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showAlert("success", "Reporte eliminado", `${row.folio} se eliminó correctamente.`);
    } catch (err) {
      showAlert(
        "error",
        "No se pudo eliminar",
        isReporteApiError(err) ? err.message : "Inténtalo de nuevo."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openPdf = (row: ReporteMantenimiento) => {
    navigate(`/reportes-mantenimiento/${row.id}/pdf`, {
      state: { from: "/reportes-mantenimiento" },
    });
  };

  return (
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass} style={erpSansStyle}>
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
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Reporte de mantenimiento</span>
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
                  d="M4 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M13 3v5h5M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={sectionLabelOrangeClass}>Operación</p>
              <h1 className={`mt-0.5 ${erpHeroHeadingClass}`}>Reporte de mantenimiento</h1>
              <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                Vincula una orden de servicio, captura evidencia Antes / Después y genera el PDF desde el servidor.
              </p>
              <div className={erpHeroGradientClass} />
            </div>
          </div>
        </header>

        <ReportesPageStats stats={stats} />

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
              placeholder="Buscar por folio RM, orden, cliente o técnico…"
              className={pageSearchInputClass}
              aria-label="Buscar reportes"
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

          <button
            type="button"
            onClick={() => navigate("/reportes-mantenimiento/nuevo")}
            className={`${erpPrimaryBtnClass} w-full sm:w-auto lg:shrink-0`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo reporte
          </button>
        </div>

        <ComponentCard
          compact
          title="Listado de reportes"
          desc={
            loading
              ? "Cargando…"
              : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}${hasSearch ? " · filtro activo" : ""}`
          }
          className={`!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)] ${pageCardShellClass}`}
        >
          <div className="p-2 pt-0 sm:p-3 sm:pt-0">
            {/* Mobile */}
            <div className="md:hidden">
              {loading ? (
                <p className="px-2 py-10 text-center text-sm text-[#78716c]" role="status">
                  Cargando…
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm text-[#78716c]">
                  {hasSearch
                    ? "Sin coincidencias. Prueba otro folio, cliente o técnico."
                    : "Aún no hay reportes. Crea el primero con «Nuevo reporte»."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {filtered.map((row) => {
                    const folio =
                      row.folio || formatDocumentFolio(FOLIO_SERIE.reporte, row.idx);
                    return (
                      <li
                        key={row.id}
                        className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-4 dark:border-[#273244] dark:bg-[#111827]/80"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{folio}</p>
                            <p className="mt-1 truncate text-sm font-medium text-[#1c1917] dark:text-white">
                              {row.orden_cliente || "Sin cliente"}
                            </p>
                            <p className="mt-0.5 text-xs text-[#78716c]">
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
                              className={erpRowActionBtnClass}
                              aria-label={`Eliminar ${folio}`}
                              disabled={deletingId === row.id}
                              onClick={() => void handleDelete(row)}
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-[#efe6d8] pt-3 text-xs dark:border-[#273244]">
                          <div>
                            <dt className="text-[#78716c]">Técnico</dt>
                            <dd className="mt-0.5 truncate font-medium text-[#1c1917] dark:text-white">
                              {row.tecnico_nombre || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#78716c]">Fotos</dt>
                            <dd className="mt-0.5 font-medium tabular-nums text-[#1c1917] dark:text-white">
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

            {/* Desktop — mismo patrón denso que Proyectos / Órdenes */}
            {loading ? (
              <div
                className="hidden px-4 py-10 text-center text-sm text-[#78716c] dark:text-[#8ea0b8] md:block"
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
                      <TableCell isHeader scope="col" className="w-[100px] whitespace-nowrap px-2 py-2 text-left">
                        Folio
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[100px] whitespace-nowrap px-2 py-2 text-left">
                        Orden
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[22%] min-w-[140px] px-2 py-2 text-left">
                        Cliente
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[100px] whitespace-nowrap px-2 py-2 text-left">
                        Fecha
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[16%] min-w-[120px] px-2 py-2 text-left">
                        Técnico
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[72px] whitespace-nowrap px-2 py-2 text-center">
                        Fotos
                      </TableCell>
                      <TableCell isHeader scope="col" className="w-[120px] whitespace-nowrap px-2 py-2 text-center">
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-[#f1e8db] text-[12px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb]">
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="px-2 py-10 text-center text-sm text-[#78716c]">
                          {hasSearch
                            ? "Sin coincidencias. Prueba otro folio, cliente o técnico."
                            : "Aún no hay reportes. Crea el primero con «Nuevo reporte»."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => {
                        const folio =
                          row.folio || formatDocumentFolio(FOLIO_SERIE.reporte, row.idx);
                        return (
                          <TableRow key={row.id} className={erpTableRowHoverClass}>
                            <TableCell className="px-2 py-2.5 font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                              {folio}
                            </TableCell>
                            <TableCell className="px-2 py-2.5 font-medium">{row.orden_folio || "—"}</TableCell>
                            <TableCell className="px-2 py-2.5">
                              <span className="line-clamp-1" title={row.orden_cliente || undefined}>
                                {row.orden_cliente || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2.5 tabular-nums">
                              {formatFechaMx(row.fecha_servicio)}
                            </TableCell>
                            <TableCell className="px-2 py-2.5">
                              <span className="line-clamp-1" title={row.tecnico_nombre || undefined}>
                                {row.tecnico_nombre || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2.5 text-center">
                              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-[#fff3e6] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#c45f00] ring-1 ring-inset ring-[#ff801f]/25 dark:bg-[#fb923c]/15 dark:text-[#fdba74]">
                                {countReporteFotos(row.secciones)}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2.5">
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
                                  className={erpRowActionBtnClass}
                                  aria-label={`Eliminar ${folio}`}
                                  title="Eliminar"
                                  disabled={deletingId === row.id}
                                  onClick={() => void handleDelete(row)}
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
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
