import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { PencilIcon } from "@/icons";
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
import PolizaFormModal from "./form/PolizaFormModal";
import { PolizasMobileList } from "./list/PolizasMobileList";
import { PolizasPageStats } from "./list/PolizasPageStats";
import { PolizaPdfGlyph } from "./list/PolizaPdfGlyph";
import { polizaPdfSearchFromDraft, polizaPdfSearchFromRow } from "./list/polizaPdf";
import {
  EMPTY_POLIZA_VALUES,
  computePolizaStats,
  estadoPolizaBadgeClass,
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

  const openPdfFromDraft = (values: PolizaAltaValues) => {
    const clienteLabel =
      values.clienteNombre ||
      editingRow?.cliente ||
      "";
    navigate(
      `/polizas-mantenimiento/pdf?${polizaPdfSearchFromDraft({
        folio: editingRow?.folio || nextFolio,
        values,
        clienteLabel,
      })}`,
      { state: { from: "/polizas-mantenimiento" } }
    );
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
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass} style={erpSansStyle}>
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
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Póliza de mantenimiento</span>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={sectionLabelOrangeClass}>Operación</p>
              <h1 className={`mt-0.5 ${erpHeroHeadingClass}`}>Póliza de mantenimiento</h1>
              <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                Consulta todas las pólizas, filtra por folio o cliente y abre el expediente para ligar la cotización{" "}
                <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">DigitalFlow</span> y las tres visitas
                del año.
              </p>
              <div className={erpHeroGradientClass} />
            </div>
          </div>
        </header>

        <PolizasPageStats stats={stats} />

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
              aria-label="Buscar pólizas"
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
            Nueva póliza
          </button>
        </div>

        <ComponentCard
          compact
          title="Listado de pólizas"
          className={`!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)] ${pageCardShellClass}`}
        >
          <div className="p-2 pt-0 sm:p-3 sm:pt-0">
            <PolizasMobileList
              rows={filteredRows}
              hasSearch={hasSearch}
              loading={loading}
              onEdit={openEdit}
              onPdf={openPdf}
            />

            <div className={"hidden md:block " + erpTableWrapClass}>
              <Table className="w-full min-w-[920px] table-fixed sm:min-w-0 xl:min-w-full">
                <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                  <TableRow>
                    <TableCell isHeader scope="col" className="w-[110px] min-w-[96px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Folio
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[28%] min-w-[180px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Cliente
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[160px] min-w-[140px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Tipo
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[120px] min-w-[110px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Cotización
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[130px] min-w-[120px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                      Próxima visita
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[130px] min-w-[120px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                      Estado
                    </TableCell>
                    <TableCell isHeader scope="col" className="w-[120px] min-w-[108px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-2 py-10">
                        <div
                          className="text-center text-sm text-gray-500 dark:text-gray-400"
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
                          <span className="block truncate text-gray-900 dark:text-white">{row.tipoLabel}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-2 align-middle tabular-nums">
                          {row.cotizacionFolio}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-2 align-middle tabular-nums">
                          {formatPolizaFecha(nextVisitIso(row))}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center align-middle">
                          <span className={estadoPolizaBadgeClass(row.estado)}>
                            {estadoPolizaLabel(row.estado)}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center align-middle">
                          <div className={`${erpRowActionBarClass} justify-center`}>
                            <button
                              type="button"
                              className={`${erpRowActionBtnClass} hover:border-red-400 hover:text-red-600`}
                              onClick={() => openPdf(row)}
                              aria-label={`Ver plantilla PDF de la póliza ${row.folio}`}
                              title="Ver plantilla PDF"
                            >
                              <PolizaPdfGlyph className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className={erpRowActionBtnClass}
                              onClick={() => openEdit(row)}
                              aria-label={`Ver póliza ${row.folio}`}
                              title="Ver póliza"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>

        <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
          {hasSearch ? (
            <>
              {filteredRows.length.toLocaleString("es-MX")} resultado
              {filteredRows.length === 1 ? "" : "s"} para «{searchTerm.trim()}»
            </>
          ) : (
            <>
              Mostrando{" "}
              <span className="font-medium text-[#1c1917] dark:text-[#f8fafc]">
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
        onViewTemplate={(values) => {
          if (editingRow) openPdf(editingRow);
          else openPdfFromDraft(values);
        }}
      />
    </div>
  );
}
