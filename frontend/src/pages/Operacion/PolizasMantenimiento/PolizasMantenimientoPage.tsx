/**
 * Pólizas de mantenimiento: indicadores que filtran, listado con búsqueda y la
 * agenda de los próximos 30 días. Alta / edición en un modal diferido.
 *
 * Movimiento sutil (modal-kit/motion.css): entrada escalonada de bloques y
 * filas, destello de cifras al cambiar y un barrido único en la cabecera. Solo
 * transform/opacity y nada con prefers-reduced-motion.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import "@/components/ui/modal-kit/motion.css";
import { erpPrimaryBtnClass, pageSearchInputClass } from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { useAuth } from "@/context/AuthContext";
import { FOLIO_SERIE, formatDocumentFolio, matchesDocumentFolio } from "@/utils/documentFolio";
import {
  polBreadcrumbLinkClass,
  polBreadcrumbNavClass,
  polCardClass,
  polHeroBodyClass,
  polHeroClass,
  polHeroEyebrowClass,
  polHeroGlowClass,
  polHeroIconClass,
  polHeroTitleClass,
  polPageCanvasClass,
  polPageInnerClass,
  polSansStyle,
} from "./shared/polizaStyles";
import PolizasEstadoTabs from "./list/PolizasEstadoTabs";
import PolizasList from "./list/PolizasList";
import PolizasAgenda from "./list/PolizasAgenda";
import PolizaDeleteModal from "./form/PolizaDeleteModal";
import { polizaPdfSearchFromRow } from "./list/polizaPdf";
import {
  computePolizaStats,
  EMPTY_POLIZA_VALUES,
  estadoPolizaLabel,
  filtrarPorEstado,
  nextPolizaIdx,
  sortPolizasPorUrgencia,
  valuesFromRow,
} from "./list/polizaEstado";
import { createPoliza, deletePoliza, isPolizaApiError, listPolizas, updatePoliza } from "./list/polizaApi";
import type { PolizaAltaValues, PolizaEstadoFiltro, PolizaRow } from "./list/polizaListTypes";

const PolizaFormModal = lazy(() => import("./form/PolizaFormModal"));
const prefetchForm = () => void import("./form/PolizaFormModal");

type Aviso = { id: number; variant: "success" | "warning" | "error"; title: string; message: string };

function coincide(row: PolizaRow, q: string): boolean {
  if (!q) return true;
  return (
    matchesDocumentFolio(row.folio, q) ||
    matchesDocumentFolio(row.cotizacionFolio, q) ||
    row.cliente.toLowerCase().includes(q) ||
    row.servicioTipo.toLowerCase().includes(q) ||
    row.equiposAtendidos.toLowerCase().includes(q) ||
    estadoPolizaLabel(row.estado).toLowerCase().includes(q)
  );
}

export default function PolizasMantenimientoPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState<PolizaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [estado, setEstado] = useState<PolizaEstadoFiltro>("todas");
  const [modal, setModal] = useState<{ open: boolean; row: PolizaRow | null }>({ open: false, row: null });
  const [deletingRow, setDeletingRow] = useState<PolizaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const notify = useCallback((variant: Aviso["variant"], title: string, message: string) => {
    setAviso({ id: Date.now(), variant, title, message });
  }, []);

  useEffect(() => {
    let cancelled = false;
    listPolizas()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) {
          notify("error", "No se pudo cargar", isPolizaApiError(err) ? err.message : "Revisa tu conexión e inténtalo de nuevo.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const idle = window.setTimeout(prefetchForm, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(idle);
    };
  }, [notify]);

  const ordenadas = useMemo(() => sortPolizasPorUrgencia(rows), [rows]);
  const stats = useMemo(() => computePolizaStats(rows), [rows]);
  const q = deferredSearch.trim().toLowerCase();
  const visibles = useMemo(
    () => filtrarPorEstado(ordenadas, estado).filter((row) => coincide(row, q)),
    [ordenadas, estado, q],
  );
  const filtrado = Boolean(q) || estado !== "todas";

  const nextFolio = formatDocumentFolio(FOLIO_SERIE.poliza, nextPolizaIdx(rows));
  const editingRow = modal.row;
  const extraCliente = useMemo(
    () => (editingRow ? { value: editingRow.clienteId, label: editingRow.cliente } : null),
    [editingRow],
  );
  const extraCotizacion = useMemo(
    () => (editingRow ? { value: editingRow.cotizacionId, label: editingRow.cotizacionFolio } : null),
    [editingRow],
  );

  const openNew = useCallback(() => {
    prefetchForm();
    setModal({ open: true, row: null });
  }, []);
  const openEdit = useCallback((row: PolizaRow) => {
    prefetchForm();
    setModal({ open: true, row });
  }, []);
  const closeModal = useCallback(() => {
    if (!saving) setModal({ open: false, row: null });
  }, [saving]);
  const openPdf = useCallback(
    (row: PolizaRow) =>
      navigate(`/polizas-mantenimiento/pdf?${polizaPdfSearchFromRow(row)}`, {
        state: { from: "/polizas-mantenimiento" },
      }),
    [navigate],
  );
  const clearFilters = useCallback(() => {
    setSearch("");
    setEstado("todas");
  }, []);

  const handleSave = async (values: PolizaAltaValues) => {
    setSaving(true);
    try {
      if (editingRow) {
        const updated = await updatePoliza(editingRow.id, values);
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        notify("success", "Póliza actualizada", `${updated.folio} se guardó correctamente.`);
      } else {
        const created = await createPoliza(values);
        setRows((prev) => [created, ...prev]);
        notify("success", "Póliza creada", `${created.folio} · ${created.cliente}`);
      }
      setModal({ open: false, row: null });
    } catch (err) {
      notify("error", "No se pudo guardar", isPolizaApiError(err) ? err.message : "Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await deletePoliza(deletingRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      notify("success", "Póliza eliminada", `${deletingRow.folio} se eliminó.`);
      setDeletingRow(null);
    } catch (err) {
      notify("error", "No se pudo eliminar", isPolizaApiError(err) ? err.message : "Inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={polPageCanvasClass} style={polSansStyle}>
      <PageMeta
        title="Pólizas de mantenimiento | Operación"
        description="Pólizas de mantenimiento: cliente, cotización, visitas del año y agenda"
      />
      <div className={polPageInnerClass}>
        <nav className={polBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={polBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Pólizas de mantenimiento</span>
        </nav>

        <header className={polHeroClass}>
          <div className={polHeroGlowClass} aria-hidden />
          <div className="relative">
            <div className="flex min-w-0 items-start gap-4">
              <span className={polHeroIconClass} aria-hidden>
                <ShieldCheck className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className={polHeroEyebrowClass}>Operación</p>
                <h1 className={polHeroTitleClass}>Pólizas de mantenimiento</h1>
                <p className={polHeroBodyClass}>
                  Contratos de mantenimiento con su cotización y hasta 4 visitas al año. Atiende primero las vencidas y
                  las que tienen visita cerca.
                </p>
              </div>
            </div>
          </div>
        </header>

        <PolizasEstadoTabs stats={stats} value={estado} onChange={setEstado} loading={loading} />

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio, cliente o cotización…"
              className={pageSearchInputClass}
              aria-label="Buscar pólizas"
              aria-busy={search !== deferredSearch || undefined}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-10 items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/6 sm:h-9 sm:min-w-11 sm:rounded-lg"
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
            onMouseEnter={prefetchForm}
            onFocus={prefetchForm}
            className={`${erpPrimaryBtnClass} w-full sm:w-auto lg:shrink-0`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nueva póliza
          </button>
        </div>


        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
          <section
            className={`${polCardClass} cot-rise min-w-0 overflow-hidden`}
            style={{ "--cot-i": 2 } as CSSProperties}
            aria-labelledby="polizas-listado-titulo"
          >
            <div className="flex flex-col gap-3 border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 id="polizas-listado-titulo" className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  {estado === "todas" ? "Todas las pólizas" : estadoPolizaLabel(estado)}
                </h2>
                <p className="text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
                  {loading
                    ? "Cargando…"
                    : `${visibles.length.toLocaleString("es-MX")} ${visibles.length === 1 ? "póliza" : "pólizas"}${
                        q ? ` para «${deferredSearch.trim()}»` : ""
                      } · por urgencia`}
                </p>
              </div>
            </div>

            {/* Re-montar al cambiar de estado da una transición breve entre listados. */}
            <div key={estado} className="cot-fade" aria-busy={search !== deferredSearch || undefined}>
              <PolizasList
                rows={visibles}
                loading={loading}
                filtered={filtrado}
                onEdit={openEdit}
                onPdf={openPdf}
                onDelete={isAdmin ? setDeletingRow : undefined}
                onNew={openNew}
                onClearFilters={clearFilters}
              />
            </div>
          </section>

          <aside
            className="cot-rise order-first lg:sticky lg:top-4 lg:order-0"
            style={{ "--cot-i": 3 } as CSSProperties}
            aria-label="Agenda de visitas"
          >
            <PolizasAgenda rows={rows} loading={loading} onOpen={openEdit} />
          </aside>
        </div>
      </div>

      {modal.open ? (
        <Suspense
          fallback={
            <p className="sr-only" role="status">
              Cargando formulario
            </p>
          }
        >
          <PolizaFormModal
            key={editingRow ? editingRow.id : "nueva"}
            open={modal.open}
            editing={Boolean(editingRow)}
            folio={editingRow?.folio || nextFolio}
            folioIsPreview={!editingRow}
            initialValues={editingRow ? valuesFromRow(editingRow) : EMPTY_POLIZA_VALUES}
            extraClienteOption={extraCliente}
            extraCotizacionOption={extraCotizacion}
            saving={saving}
            onClose={closeModal}
            onSave={(values) => void handleSave(values)}
          />
        </Suspense>
      ) : null}

      <PolizaDeleteModal
        row={deletingRow}
        deleting={deleting}
        onCancel={() => setDeletingRow(null)}
        onConfirm={() => void confirmDelete()}
      />

      {aviso ? (
        <Alert
          key={aviso.id}
          variant={aviso.variant}
          title={aviso.title}
          message={aviso.message}
          showLink={false}
          onClose={() => setAviso(null)}
        />
      ) : null}
    </div>
  );
}
