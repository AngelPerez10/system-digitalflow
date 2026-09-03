import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { PencilIcon } from "@/icons";
import { FOLIO_SERIE, formatDocumentFolio, matchesDocumentFolio } from "@/utils/documentFolio";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpHeroBlurClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpSansStyle,
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
  osHeroBandClass,
  osHeroBodyClass,
  osHeroEyebrowClass,
  osTableBodyClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import PolizaFormModal from "./form/PolizaFormModal";
import { EstadoPolizaBadge } from "./list/EstadoPolizaBadge";
import { PolizaPdfGlyph } from "./list/PolizaPdfGlyph";
import { PolizasMobileList } from "./list/PolizasMobileList";
import { PolizasPageStats } from "./list/PolizasPageStats";
import { PolizaStatusSectionHeader } from "./list/PolizaStatusSectionHeader";
import { groupPolizasByEstado } from "./list/polizaStatusSections";
import { polizaPdfSearchFromRow } from "./list/polizaPdf";
import {
  EMPTY_POLIZA_VALUES,
  computePolizaStats,
  estadoPolizaLabel,
  formatPolizaFecha,
  nextPolizaIdx,
  nextVisitIso,
  valuesFromRow,
} from "./list/polizaDemoData";
import { createPoliza, isPolizaApiError, listPolizas, updatePoliza } from "./list/polizaApi";
import type { PolizaAltaValues, PolizaRow } from "./list/polizaListTypes";

function polizaMatchesSearch(row: PolizaRow, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    matchesDocumentFolio(row.folio, term) ||
    matchesDocumentFolio(row.cotizacionFolio, term) ||
    row.cliente.toLowerCase().includes(term) ||
    row.tipoLabel.toLowerCase().includes(term) ||
    estadoPolizaLabel(row.estado).toLowerCase().includes(term)
  );
}

export default function PolizasMantenimientoPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PolizaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<PolizaRow | null>(null);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const stats = useMemo(() => computePolizaStats(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((row) => polizaMatchesSearch(row, searchTerm)),
    [rows, searchTerm]
  );
  const statusSections = useMemo(() => groupPolizasByEstado(filteredRows), [filteredRows]);
  const hasSearch = Boolean(searchTerm.trim());
  const nextIdx = nextPolizaIdx(rows);
  const nextFolio = formatDocumentFolio(FOLIO_SERIE.poliza, nextIdx);

  const showAlert = useCallback((
    variant: "success" | "warning" | "error",
    title: string,
    message: string
  ) => {
    setAlert({ show: true, variant, title, message });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listPolizas();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          showAlert(
            "error",
            "Error al cargar",
            isPolizaApiError(err) ? err.message : "No se pudo cargar el listado de pólizas."
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

  const openNew = () => {
    setEditingRow(null);
    setShowModal(true);
  };

  const openEdit = (row: PolizaRow) => {
    setEditingRow(row);
    setShowModal(true);
  };

  const openPdf = (row: PolizaRow) => {
    navigate(`/polizas-mantenimiento/pdf?${polizaPdfSearchFromRow(row)}`, {
      state: { from: "/polizas-mantenimiento" },
    });
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
  };

  const handleSave = async (values: PolizaAltaValues) => {
    setSaving(true);
    try {
      if (editingRow) {
        const updated = await updatePoliza(editingRow.id, values);
        setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        showAlert("success", "Póliza actualizada", `${updated.folio} se guardó correctamente.`);
      } else {
        const created = await createPoliza(values);
        setRows((prev) => [created, ...prev]);
        showAlert("success", "Póliza guardada", `${created.folio} ya está en el listado.`);
      }
      setShowModal(false);
      setEditingRow(null);
    } catch (err) {
      showAlert(
        "error",
        "No se pudo guardar",
        isPolizaApiError(err) ? err.message : "Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title="Póliza de mantenimiento | Operación"
          description="Listado de pólizas de mantenimiento: cliente, tipo CCTV, cotización y visitas"
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
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Póliza de mantenimiento</span>
        </nav>

        <header className={osHeroBandClass}>
          <div className={erpHeroBlurClass} aria-hidden />
          <div className="relative flex min-w-0 items-start gap-4">
            <span className={erpHeroIconWrapClass} aria-hidden>
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className={osHeroEyebrowClass}>Operación</p>
              <h1 className={`mt-1 ${erpHeroHeadingClass}`}>Póliza de mantenimiento</h1>
              <p className={osHeroBodyClass}>
                Consulta todas las pólizas, filtra por folio o cliente y abre el expediente para ligar la cotización
                y las tres visitas del año.
              </p>
            </div>
          </div>
        </header>

        <PolizasPageStats stats={stats} />

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
              placeholder="Buscar por folio, cliente o cotización…"
              className={pageSearchInputClass}
              aria-label="Buscar pólizas"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
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
            Nueva póliza
          </button>
        </div>

        <section className={`overflow-visible ${pageCardShellClass}`} aria-labelledby="polizas-listado-heading">
          <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <rect x="3" y="4" width="18" height="17" rx="2.2" />
                  <path d="M3 9.5h18" />
                </svg>
              </span>
              <h2 id="polizas-listado-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                Listado de pólizas
              </h2>
            </div>
            <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
              Resultados según búsqueda. En pantallas pequeñas desplázate horizontalmente si hace falta.
            </p>
          </div>
          <div className="p-2 sm:p-3">
            <PolizasMobileList
              sections={statusSections}
              hasSearch={hasSearch}
              loading={loading}
              onEdit={openEdit}
              onPdf={openPdf}
            />

            <div className={"hidden md:block " + erpTableWrapClass}>
              <Table className="w-full min-w-[920px] table-fixed border-collapse sm:min-w-0 xl:min-w-full">
                <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                  <TableRow>
                    <TableCell isHeader scope="col" className="w-[110px] min-w-[96px] whitespace-nowrap px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                      Folio
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[28%] min-w-[180px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                      Cliente
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[160px] min-w-[140px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                      Tipo
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[120px] min-w-[110px] px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                      Cotización
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[130px] min-w-[120px] whitespace-nowrap px-3 py-2 text-left text-[#52525B] dark:text-[#B7C1D1]">
                      Próxima visita
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[130px] min-w-[120px] whitespace-nowrap px-3 py-2 text-center text-[#52525B] dark:text-[#B7C1D1]">
                      Estado
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[120px] min-w-[108px] whitespace-nowrap px-3 py-2 text-center text-[#52525B] dark:text-[#B7C1D1]">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className={osTableBodyClass}>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-3 py-10">
                        <div
                          className="text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]"
                          role="status"
                          aria-busy={loading && !hasSearch}
                        >
                          {hasSearch
                            ? "No hay pólizas que coincidan con la búsqueda."
                            : loading
                              ? "Cargando pólizas…"
                              : "Aún no hay pólizas registradas."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    statusSections.flatMap((section) => {
                      const headingId = `polizas-table-${section.key}`;
                      const headerRow = (
                        <TableRow key={`${section.key}-header`} className="hover:bg-transparent dark:hover:bg-transparent">
                          <TableCell isHeader scope="colgroup" colSpan={7} className="border-y-0 bg-transparent p-0 text-left">
                            <div className="px-3 py-2">
                              <PolizaStatusSectionHeader
                                estado={section.key}
                                label={section.label}
                                count={section.rows.length}
                                headingId={headingId}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );

                      const dataRows = section.rows.map((row) => (
                        <TableRow key={row.id} className={erpTableRowHoverClass} aria-labelledby={headingId}>
                          <TableCell className="whitespace-nowrap px-3 py-2 align-middle">
                            <span className="inline-flex items-center justify-center rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] sm:text-[11px]">
                              {row.folio}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top">
                            <span className="block truncate font-medium text-[#09090B] dark:text-white sm:text-[12px]" title={row.cliente}>
                              {row.cliente}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top">
                            <span className="block truncate text-[#52525B] dark:text-[#B7C1D1]">{row.tipoLabel}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-3 py-2 align-middle tabular-nums text-[#52525B] dark:text-[#B7C1D1]">
                            {row.cotizacionFolio}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-3 py-2 align-middle tabular-nums text-[#52525B] dark:text-[#B7C1D1]">
                            {formatPolizaFecha(nextVisitIso(row))}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center align-middle">
                            <EstadoPolizaBadge estado={row.estado} />
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center align-middle">
                            <div className={`${erpRowActionBarClass} justify-center`}>
                              <button
                                type="button"
                                className={erpRowActionBtnClass}
                                onClick={() => openEdit(row)}
                                aria-label={`Ver póliza ${row.folio}`}
                                title="Ver póliza"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className={erpRowActionBtnClass}
                                onClick={() => openPdf(row)}
                                aria-label={`Ver PDF de la póliza ${row.folio}`}
                                title="Ver PDF"
                              >
                                <PolizaPdfGlyph className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ));

                      return [headerRow, ...dataRows];
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <p className="text-xs text-[#52525B] dark:text-[#8EA0B8] sm:text-sm">
          {hasSearch ? (
            <>
              {filteredRows.length.toLocaleString("es-MX")} resultado
              {filteredRows.length === 1 ? "" : "s"} para «{searchTerm.trim()}»
            </>
          ) : (
            <>
              Mostrando{" "}
              <span className="font-medium text-[#09090B] dark:text-white">
                {filteredRows.length.toLocaleString("es-MX")}
              </span>{" "}
              pólizas
            </>
          )}
        </p>
      </div>

      <PolizaFormModal
        open={showModal}
        editing={Boolean(editingRow)}
        folio={editingRow?.folio || nextFolio}
        folioIsPreview={!editingRow}
        initialValues={editingRow ? valuesFromRow(editingRow) : EMPTY_POLIZA_VALUES}
        extraClienteOption={
          editingRow
            ? { value: editingRow.clienteId, label: editingRow.cliente }
            : null
        }
        extraCotizacionOption={
          editingRow
            ? { value: editingRow.cotizacionId, label: editingRow.cotizacionFolio }
            : null
        }
        saving={saving}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
