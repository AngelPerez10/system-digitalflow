import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { TrashBinIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import {
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpSecondaryBtnClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
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
  erpSansStyle,
  osHeroBandClass,
  osHeroBodyClass,
  osHeroEyebrowClass,
  pageCardShellClass,
  pageSearchInputClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { PolizasDesktopTable } from "./list/PolizasDesktopTable";
import { PolizasMobileList } from "./list/PolizasMobileList";
import { PolizasPageStats } from "./list/PolizasPageStats";
import { groupPolizasByEstado } from "./list/polizaStatusSections";
import { polizaPdfSearchFromRow } from "./list/polizaPdf";
import {
  EMPTY_POLIZA_VALUES,
  computePolizaStats,
  estadoPolizaLabel,
  nextPolizaIdx,
  valuesFromRow,
} from "./list/polizaDemoData";
import { createPoliza, deletePoliza, isPolizaApiError, listPolizas, updatePoliza } from "./list/polizaApi";
import type { PolizaAltaValues, PolizaRow } from "./list/polizaListTypes";

const PolizaFormModal = lazy(() => import("./form/PolizaFormModal"));

function prefetchPolizaForm() {
  void import("./form/PolizaFormModal");
}

function useIsDesktopList() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isDesktop;
}

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
  const { isAdmin } = useAuth();
  const isDesktopList = useIsDesktopList();
  const deleteTitleId = useId();
  const [rows, setRows] = useState<PolizaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<PolizaRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<PolizaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const stats = useMemo(() => computePolizaStats(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((row) => polizaMatchesSearch(row, deferredSearch)),
    [rows, deferredSearch]
  );
  const statusSections = useMemo(() => groupPolizasByEstado(filteredRows), [filteredRows]);
  const hasSearch = Boolean(deferredSearch.trim());
  const searchPending = searchTerm !== deferredSearch;
  const nextIdx = nextPolizaIdx(rows);
  const nextFolio = formatDocumentFolio(FOLIO_SERIE.poliza, nextIdx);
  const extraClienteOption = useMemo(
    () => (editingRow ? { value: editingRow.clienteId, label: editingRow.cliente } : null),
    [editingRow]
  );
  const extraCotizacionOption = useMemo(
    () => (editingRow ? { value: editingRow.cotizacionId, label: editingRow.cotizacionFolio } : null),
    [editingRow]
  );

  const showAlert = useCallback((
    variant: "success" | "warning" | "error",
    title: string,
    message: string
  ) => {
    setAlert({ show: true, variant, title, message });
  }, []);

  useEffect(() => {
    const idle = window.setTimeout(prefetchPolizaForm, 800);
    return () => window.clearTimeout(idle);
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

  const openNew = useCallback(() => {
    prefetchPolizaForm();
    setEditingRow(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((row: PolizaRow) => {
    prefetchPolizaForm();
    setEditingRow(row);
    setShowModal(true);
  }, []);

  const openPdf = useCallback((row: PolizaRow) => {
    navigate(`/polizas-mantenimiento/pdf?${polizaPdfSearchFromRow(row)}`, {
      state: { from: "/polizas-mantenimiento" },
    });
  }, [navigate]);

  const closeModal = useCallback(() => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
  }, [saving]);

  const requestDelete = useCallback((row: PolizaRow) => {
    setDeletingRow(row);
  }, []);

  const confirmDelete = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await deletePoliza(deletingRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      showAlert("success", "Póliza eliminada", `${deletingRow.folio} se eliminó correctamente.`);
      setDeletingRow(null);
    } catch (err) {
      showAlert(
        "error",
        "No se pudo eliminar",
        isPolizaApiError(err) ? err.message : "Inténtalo de nuevo."
      );
    } finally {
      setDeleting(false);
    }
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
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
            onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
          />
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
              aria-busy={searchPending || undefined}
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

          <button
            type="button"
            onClick={openNew}
            onMouseEnter={prefetchPolizaForm}
            onFocus={prefetchPolizaForm}
            className={`${erpPrimaryBtnClass} w-full sm:w-auto lg:shrink-0`}
          >
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
          <div className="p-2 sm:p-3" aria-busy={searchPending || undefined}>
            {isDesktopList ? (
              <PolizasDesktopTable
                sections={statusSections}
                filteredCount={filteredRows.length}
                hasSearch={hasSearch}
                loading={loading}
                canDelete={Boolean(isAdmin)}
                onEdit={openEdit}
                onPdf={openPdf}
                onDelete={requestDelete}
              />
            ) : (
              <PolizasMobileList
                sections={statusSections}
                hasSearch={hasSearch}
                loading={loading}
                onEdit={openEdit}
                onPdf={openPdf}
                onDelete={isAdmin ? requestDelete : undefined}
              />
            )}
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

      {showModal ? (
        <Suspense
          fallback={
            <p className="sr-only" role="status">
              Cargando formulario de póliza
            </p>
          }
        >
          <PolizaFormModal
            open={showModal}
            editing={Boolean(editingRow)}
            folio={editingRow?.folio || nextFolio}
            folioIsPreview={!editingRow}
            initialValues={editingRow ? valuesFromRow(editingRow) : EMPTY_POLIZA_VALUES}
            extraClienteOption={extraClienteOption}
            extraCotizacionOption={extraCotizacionOption}
            saving={saving}
            onClose={closeModal}
            onSave={handleSave}
          />
        </Suspense>
      ) : null}

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
              Eliminar póliza
            </h3>
            <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#52525B] dark:text-[#94a3b8]">
              {deleting ? (
                "Por favor espera; esto puede tardar unos segundos."
              ) : (
                <>
                  ¿Eliminar{" "}
                  <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                    {deletingRow?.folio || "esta póliza"}
                  </span>
                  {deletingRow?.cliente ? <> de «{deletingRow.cliente}»?</> : "?"} Esta acción no se puede
                  deshacer.
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
  );
}
