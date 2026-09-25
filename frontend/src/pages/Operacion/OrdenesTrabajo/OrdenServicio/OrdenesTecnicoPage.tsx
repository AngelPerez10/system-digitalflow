import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { OrdenesPageStats } from "./list/OrdenesPageStats";
import OrdenesListFiltersPopover from "./list/OrdenesListFiltersPopover";
import OrdenesStatusSegmentFilter from "./list/OrdenesStatusSegmentFilter";
import { tecnicoDisplayLabel } from "./form/tabs/ordenTabHelpers";
import OrdenFormModal, { ORDEN_FORM_PANEL_IDS, ORDEN_FORM_TAB_IDS } from "./form/OrdenFormModal";
import { OrdenClienteTab } from "./form/tabs/OrdenClienteTab";
import { OrdenDetalleTab } from "./form/tabs/OrdenDetalleTab";
import { OrdenEquiposTab } from "./form/tabs/OrdenEquiposTab";
import {
  type Orden,
  type Usuario,
} from "./shared/ordenesPageTypes";
import { useOrdenFormModalState } from "./form/useOrdenFormModalState";
import { useOrdenFormDraft, type LevantamientoSnap } from "./form/useOrdenFormDraft";
import OrdenLocationMapModal from "./form/fields/OrdenLocationMapModal";
import { useOrdenesList } from "./shared/useOrdenesList";
import { useOrdenesPagePermissions } from "./useOrdenesPagePermissions";
import { MobileOrderList } from "./list/MobileOrderCard";
import { OrdenesTable } from "./list/OrdenesTable";
import { OrdenesHero } from "./list/OrdenesHero";
import { MonthSwitcher } from "../../Proyectos/list/ProyectosHero";
import { formatYearMonthLabel, shiftYearMonth } from "../../Proyectos/shared/proyectoListUtils";
import { OrdenesMonthLoadingBanner } from "./list/OrdenesMonthLoadingBanner";
import { OrdenPdfLoadingModal } from "./list/OrdenPdfLoadingModal";
import OrdenEnviarPdfModal, { type OrdenEnviarPdfTarget } from "./list/OrdenEnviarPdfModal";
import { groupOrdenesByStatus } from "./shared/ordenStatusSections";
import {
  handleOrdenPdfClick,
  resolveClienteCorreoSugerido,
  getNowHHMM,
  fetchOrdenDetail,
} from "./shared/useOrdenesShared";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { Cliente } from "@/types/cliente";
import { OrdenDeleteDialog, OrdenDetailModal } from "./shared/OrdenDialogs";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  pageCardShellClass,
  pageSearchInputClass,
} from "./ordenServicioStyles";


export default function OrdenesTecnico() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    permissions,
    authLoading,
    isAuthenticated,
    canOrdenesView,
    canOrdenesCreate,
    canOrdenesEdit,
    canOrdenesDelete,
    ordenesOwnOnly,
    canViewAllOrdenes,
    canChangeStatusOrdenes,
    canStatusOnlyOrdenes,
  } = useOrdenesPagePermissions();
  const { user, isAdmin } = useAuth();

  const formScrollRef = useRef<HTMLFormElement>(null);

  const levantamientoSnapshotRef = useRef<LevantamientoSnap | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (canViewAllOrdenes) {
      navigate("/ordenes", { replace: true });
    }
  }, [authLoading, isAuthenticated, canViewAllOrdenes, navigate]);


  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const {
    setOrdenes,
    monthLoading,
    searchTerm,
    setSearchTerm,
    searchActive,
    selectedMonth,
    selectMonth,
    filterStatus,
    setFilterStatus,
    filterServicio,
    setFilterServicio,
    filterDate,
    setFilterDate,
    filterTecnicoId,
    setFilterTecnicoId,
    clearSecondaryFilters,
    secondaryFilterCount,
    statusCounts,
    totalBeforeStatus,
    shownList,
    stats: ordenStats,
    alert,
    setAlert,
    fetchOrdenes,
  } = useOrdenesList({ variant: "tecnico", canView: canOrdenesView, usuarios });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState<Orden | null>(null);
  /** Modal se abre al instante; el cuerpo muestra esqueleto mientras llega firma/fotos/equipos. */
  const [detailLoading, setDetailLoading] = useState(false);
  const editDetailSeqRef = useRef(0);

  const {
    showModal,
    setShowModal,
    showClienteModal,
    setShowClienteModal,
    activeTab,
    setActiveTab,
    editingOrden,
    setEditingOrden,
    tipoOrden,
    setTipoOrden,
    isReadOnly,
    isLimitedEdit,
    isFieldReadOnly,
    statusOnly,
    tipoOrdenLabel,
    resetOrdenModalShell,
  } = useOrdenFormModalState({
    canCreate: canOrdenesCreate,
    canEdit: canOrdenesEdit,
    canChangeStatus: canChangeStatusOrdenes,
    statusOnly: canStatusOnlyOrdenes,
    userId: user?.id ?? null,
    isAdmin,
    ownOnly: ordenesOwnOnly,
  });

  const [modalAlert, setModalAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });
  const [enviarPdfOrden, setEnviarPdfOrden] = useState<OrdenEnviarPdfTarget | null>(null);
  const [enviarPdfInitialCorreo, setEnviarPdfInitialCorreo] = useState("");

  const openEnviarPdfModal = (orden: Orden | OrdenEnviarPdfTarget) => {
    const cid = orden.cliente_id != null ? Number(orden.cliente_id) : null;
    const cliente = cid != null ? clientes.find((c) => c.id === cid) : null;
    setEnviarPdfInitialCorreo(resolveClienteCorreoSugerido(cliente));
    setEnviarPdfOrden({
      id: orden.id,
      folio: orden.folio,
      idx: "idx" in orden ? (orden as Orden).idx : undefined,
      cliente: orden.cliente,
      cliente_id: orden.cliente_id ?? null,
      status: orden.status,
    });
  };

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const goToOrdenTab = (fromPointer?: boolean) => {
    const apply = () => {
      setActiveTab("orden");
      activeTabRef.current = "orden";
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    };
    if (fromPointer) window.setTimeout(apply, 0);
    else apply();
  };

  const {
    formData,
    setFormData,
    resetForm,
    loadFromOrden,
    bumpFormNonce,
    handleSubmit,
    isSaving,
    maxPhotosAllowed,
    getRootProps,
    getInputProps,
    isDragActive,
    handleDeletePhoto,
    deletingPhoto,
    uploadingPhotos,
    photoUploadProgress,
    fetchClientes,
    serviciosDisponibles,
    setServiciosDisponibles,
    setClienteSearch,
    tecnicoSearch,
    setTecnicoSearch,
    quienInstaloSearch,
    setQuienInstaloSearch,
    quienEntregoSearch,
    setQuienEntregoSearch,
    servicioSearch,
    setServicioSearch,
    selectCliente,
    selectTecnico,
    selectQuienInstalo,
    selectQuienEntrego,
    setFirmaClienteUrl,
    addServicio,
    addEquipoFromItem,
    updateEquipo,
    removeEquipo,
    tecnicoSignatureUrl,
  } = useOrdenFormDraft({
    variant: "tecnico",
    open: showModal,
    editingOrden,
    setEditingOrden,
    tipoOrden,
    isLimitedEdit,
    userId: user?.id ?? null,
    isAdmin,
    isAuthenticated,
    clientes,
    setClientes,
    usuarios,
    setUsuarios,
    setOrdenes,
    fetchOrdenes,
    levantamientoSnapshotRef,
    activeTabRef,
    setActiveTab,
    goToOrdenTab,
    setAlert,
    setModalAlert,
    onAfterSaveClose: resetOrdenModalShell,
    openEnviarPdfModal,
    statusOnly,
  });

  const confirmDeletePhoto = async (index: number, url: string) => {
    await handleDeletePhoto(index, url);
    setConfirmDelete({ open: false, index: null, url: null });
  };

  const ro = isFieldReadOnly;
  const inputLockedClass = useCallback(
    (field: Parameters<typeof isFieldReadOnly>[0]) =>
      ro(field)
        ? 'bg-[#F1F5FF] text-[#52525B] cursor-not-allowed dark:bg-[#111827]/50 dark:text-[#8EA0B8]'
        : 'bg-white text-[#09090B] dark:bg-[#111827] dark:text-[#B7C1D1] focus:border-[#1B5CFF] focus:ring-2 focus:ring-[#1B5CFF]/20',
    [ro],
  );

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({ open: false, index: null, url: null });
  const [photoPreview, setPhotoPreview] = useState<{ open: boolean; url: string | null; index: number }>({
    open: false,
    url: null,
    index: 0,
  });
  const [filterOpen, setFilterOpen] = useState(false);

  const formatYmdToDMY = (ymd: string | null | undefined) => {
    if (!ymd) return '-';
    const s = ymd.toString().slice(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return '-';
    const dt = new Date(y, m - 1, d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void fetchOrdenes();
  }, [authLoading, isAuthenticated, canOrdenesView, fetchOrdenes]);

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const handleOrdenPdf = (orden: Orden) => {
    handleOrdenPdfClick(orden, navigate, location.pathname, {
      onDownloading: (id) => setPdfDownloading(id != null),
      onError: (message) => {
        setAlert({ show: true, variant: "error", title: "PDF", message });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 5000);
      },
    });
  };

  const [showMapModal, setShowMapModal] = useState(false);

  const [problematicaModal, setProblematicaModal] = useState<{ open: boolean, content: string }>({ open: false, content: '' });
  const [serviciosModal, setServiciosModal] = useState<{ open: boolean; content: string[] }>({ open: false, content: [] });
  const [comentarioModal, setComentarioModal] = useState<{ open: boolean; content: string }>({ open: false, content: '' });


  const handleDeleteClick = (orden: Orden) => {
    if (!canOrdenesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setOrdenToDelete(orden);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!ordenToDelete) return;

    try {
      const response = await fetchApi(`/api/ordenes/${ordenToDelete.id}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchOrdenes();
        setShowDeleteModal(false);

        // Show success alert (3s)
        setAlert({
          show: true,
          variant: "success",
          title: "Orden Eliminada",
          message: `La orden para "${ordenToDelete?.cliente}" ha sido eliminada exitosamente.`
        });
        setOrdenToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      } else {
        if (response.status === 403) {
          setAlert({ show: true, variant: "error", title: "Sin permisos", message: "No tienes permisos para eliminar esta orden." });
        } else if (response.status === 404) {
          setAlert({ show: true, variant: "error", title: "No encontrada", message: "La orden no existe o ya no tienes acceso." });
        } else {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo eliminar la orden." });
        }
        await fetchOrdenes();
        setShowDeleteModal(false);
        setOrdenToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
      }
    } catch (error) {
      console.error("Error al eliminar orden:", error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setOrdenToDelete(null);
  };

  const handleEdit = async (orden: Orden): Promise<boolean> => {
    if (!canOrdenesEdit && !canStatusOnlyOrdenes) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return false;
    }

    // Abrir de inmediato con la fila del listado; el detalle completo llega en segundo plano
    // (misma estrategia que la vista admin — evita esperar al GET antes de mostrar el modal).
    const seq = ++editDetailSeqRef.current;
    setEditingOrden(orden);
    setActiveTab("cliente");
    const seedType = String(orden.tipo_orden || "").toLowerCase();
    setTipoOrden(seedType === "levantamiento" ? "levantamiento" : "servicio_tecnico");
    loadFromOrden(orden);
    setDetailLoading(true);
    setShowModal(true);

    const detail = await fetchOrdenDetail(orden.id);
    if (seq !== editDetailSeqRef.current) return true;

    if (!detail) {
      setDetailLoading(false);
      setModalAlert({
        show: true,
        variant: "warning",
        title: "Detalle incompleto",
        message: "No se pudieron cargar firma y fotos. Revisa tu conexión antes de guardar.",
      });
      return true;
    }

    setEditingOrden(detail);
    const orderType = String(detail.tipo_orden || "").toLowerCase();
    setTipoOrden(orderType === "levantamiento" ? "levantamiento" : "servicio_tecnico");
    loadFromOrden(detail);
    setDetailLoading(false);
    return true;
  };

  const handleCloseModal = () => {
    editDetailSeqRef.current++;
    setDetailLoading(false);
    bumpFormNonce();
    resetOrdenModalShell();
    resetForm();
  };

  const handleClienteSuccess = (newCliente: Cliente) => {
    fetchClientes();
    selectCliente(newCliente);
    setShowClienteModal(false);
  };

  const triggerSaveFromFooter = () => {
    if (activeTabRef.current === "cliente") {
      goToOrdenTab();
      return;
    }
    formScrollRef.current?.requestSubmit();
  };

  // Paginación por mes (mostrar todas las órdenes del mes seleccionado)
  const startIndex = 0;
  const currentOrdenes = shownList;
  /**
   * Mismo criterio que la vista admin: secciones por estado; dentro de cada
   * una el orden ya viene por folio (`idx` desc).
   */
  const listadoOrdenes = currentOrdenes;
  const statusSections = useMemo(
    () => groupOrdenesByStatus(listadoOrdenes),
    [listadoOrdenes],
  );
  const ordenIndexById = useMemo(() => {
    const map = new Map<number, number>();
    listadoOrdenes.forEach((orden, idx) => {
      if (typeof orden.id === "number") map.set(orden.id, idx);
    });
    return map;
  }, [listadoOrdenes]);

  const shiftMonth = (delta: number) => selectMonth(shiftYearMonth(selectedMonth, delta));

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
    <div className={erpPageInnerClass}>
      <PageMeta
        title="Órdenes de Trabajo | Sistema Grupo Intrax GPS"
        description="Gestión de órdenes de servicio para el sistema de administración Grupo Intrax GPS"
      />
      <nav
        className={erpBreadcrumbNavClass}
        aria-label="Migas de pan"
      >
        <Link to="/" className={erpBreadcrumbLinkClass}>
          Inicio
        </Link>
        <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
          /
        </span>
        <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Mis órdenes</span>
      </nav>

      <OrdenPdfLoadingModal open={pdfDownloading} downloading />
      <OrdenEnviarPdfModal
        open={enviarPdfOrden != null}
        orden={enviarPdfOrden}
        initialCorreo={enviarPdfInitialCorreo}
        onClose={() => setEnviarPdfOrden(null)}
        onSent={(correo) => {
          setAlert({
            show: true,
            variant: "success",
            title: "Correo enviado",
            message: `El PDF se envió a ${correo}.`,
          });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
        }}
        onError={(message) => {
          setAlert({ show: true, variant: "error", title: "Correo", message });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 5000);
        }}
      />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      <OrdenesHero
        eyebrow="Operación"
        title={canViewAllOrdenes ? "Órdenes" : "Mis órdenes"}
        description={
          canViewAllOrdenes
            ? "Puedes ver y editar todas las órdenes. Registra servicio, firmas y evidencia desde aquí."
            : "Órdenes donde eres el técnico asignado o el creador. Registra servicio, firmas y evidencia desde aquí."
        }
        selectedMonth={selectedMonth}
        onShiftMonth={shiftMonth}
      />

      <OrdenesPageStats stats={ordenStats} showEstrella={false} />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
        <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8EA0B8] sm:left-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en tus órdenes…"
            className={pageSearchInputClass}
            aria-label="Buscar en tus órdenes de todos los meses"
            aria-describedby="ordenes-tecnico-search-hint"
          />
          <p id="ordenes-tecnico-search-hint" className="sr-only">
            Con al menos dos caracteres la búsqueda incluye tus órdenes de cualquier mes por folio, cliente o estado.
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-10 items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/6 sm:h-9 sm:min-w-11 sm:rounded-lg"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
              </svg>
            </button>
          )}
        </div>
        {canOrdenesCreate && (
          <button
            type="button"
            onClick={() => {
              if (!editingOrden) {
                const today = new Date().toISOString().slice(0, 10);
                setFormData({
                  ...formData,
                  fecha_inicio: formData.fecha_inicio || today,
                  hora_inicio: getNowHHMM(),
                });
              }
              setTipoOrden('servicio_tecnico');
              setActiveTab("cliente");
              setShowModal(true);
            }}
            className={erpPrimaryBtnClass + " lg:shrink-0"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nueva orden
          </button>
        )}
      </div>

      <section
        className={`overflow-visible ${pageCardShellClass}`}
        aria-labelledby="ordenes-tecnico-listado-heading"
      >
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
                <h2 id="ordenes-tecnico-listado-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Listado de órdenes
                </h2>
              </div>
              <p className="mt-2 text-[14px] leading-5 text-[#52525B] dark:text-[#B7C1D1]">
                Órdenes visibles para tu cuenta. Usa la barra de estado y los filtros para acotar el listado.
              </p>
            </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <OrdenesListFiltersPopover
              open={filterOpen}
              onOpenChange={setFilterOpen}
              filterServicio={filterServicio}
              setFilterServicio={setFilterServicio}
              filterDate={filterDate}
              setFilterDate={setFilterDate}
              filterTecnicoId={filterTecnicoId}
              setFilterTecnicoId={setFilterTecnicoId}
              serviciosDisponibles={serviciosDisponibles}
              usuarios={usuarios}
              activeFilterCount={secondaryFilterCount}
              onClear={clearSecondaryFilters}
              showTecnicoFilter={false}
              datePickerId="filtro-fecha-ordenes-tecnico"
            />
          </div>
          </div>
          <div className="mt-3 min-w-0 max-w-full overflow-hidden">
            <OrdenesStatusSegmentFilter
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              statusCounts={statusCounts}
              totalBeforeStatus={totalBeforeStatus}
            />
          </div>
        </div>
        <div>
          {monthLoading ? (
            <div className="px-3 pt-3 sm:px-5">
              <OrdenesMonthLoadingBanner selectedMonth={selectedMonth} />
            </div>
          ) : null}
          <div className="p-2 sm:p-3 xl:hidden">
            <MobileOrderList
            ordenes={listadoOrdenes}
            startIndex={startIndex}
            loading={monthLoading}
            formatDate={formatYmdToDMY}
            onPdf={handleOrdenPdf}
            onEnviarPdf={openEnviarPdfModal}
            onEdit={canOrdenesEdit || canStatusOnlyOrdenes ? handleEdit : undefined}
            onDelete={canOrdenesDelete ? handleDeleteClick : undefined}
            canEdit={canOrdenesEdit || canStatusOnlyOrdenes}
            canDelete={canOrdenesDelete}
            usuarios={usuarios}
            groupByStatus
            selectedMonth={selectedMonth}
            hideFrom="wide"
          />
            </div>
          <div className="hidden xl:block">
              <OrdenesTable
                sections={statusSections}
                indexById={ordenIndexById}
                startIndex={startIndex}
                usuarios={usuarios}
                selectedMonth={selectedMonth}
                admin={false}
                loading={monthLoading}
                empty={
                  <div className="flex flex-col items-center py-14 text-center">
                    <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin órdenes</p>
                    <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Cambia de mes o ajusta los filtros para ver resultados.</p>
                  </div>
                }
                onPdf={handleOrdenPdf}
                onEnviarPdf={openEnviarPdfModal}
                onEdit={canOrdenesEdit || canStatusOnlyOrdenes ? handleEdit : undefined}
                onDelete={canOrdenesDelete ? handleDeleteClick : undefined}
                onVerProblematica={(content) => setProblematicaModal({ open: true, content })}
                onVerServicios={(content) => setServiciosModal({ open: true, content })}
                onVerComentario={(content) => setComentarioModal({ open: true, content })}
              />
            </div>

          {/* Pie: conteo; en celular también el cambio de mes (la banda no se muestra). */}
          <div className="flex flex-col gap-3 border-t border-[#E7E7EA] px-5 py-3.5 dark:border-[#273244] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
              {monthLoading ? (
                <span role="status">
                  {searchActive ? "Buscando en todos los meses…" : "Cargando órdenes del mes…"}
                </span>
              ) : searchActive ? (
                <>
                  <span className="font-medium tabular-nums text-[#09090B] dark:text-white">{shownList.length.toLocaleString("es-MX")}</span>{" "}
                  {shownList.length === 1 ? "orden" : "órdenes"} para «{searchTerm.trim()}» (todos los meses)
                </>
              ) : (
                <>
                  <span className="font-medium tabular-nums text-[#09090B] dark:text-white">{shownList.length.toLocaleString("es-MX")}</span>{" "}
                  {shownList.length === 1 ? "orden" : "órdenes"} en <span className="capitalize">{formatYearMonthLabel(selectedMonth)}</span>
                </>
              )}
            </p>
            <div className="sm:hidden">
              <MonthSwitcher selectedMonth={selectedMonth} onShiftMonth={shiftMonth} tone="light" />
            </div>
          </div>
        </div>
      </section>

      {/* Modales de detalle */}
      <OrdenDetailModal
        open={problematicaModal.open}
        onClose={() => setProblematicaModal({ open: false, content: "" })}
        title="Problemática"
        subtitle="Detalle completo reportado por el cliente"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      >
        <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#0f172a]/40">
          {problematicaModal.content || "-"}
        </pre>
      </OrdenDetailModal>

      <OrdenDetailModal
        open={serviciosModal.open}
        onClose={() => setServiciosModal({ open: false, content: [] })}
        title="Servicios realizados"
        subtitle="Listado de servicios registrados"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        }
      >
        {Array.isArray(serviciosModal.content) && serviciosModal.content.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {serviciosModal.content.map((s: string, i: number) => (
              <li key={i} className="inline-flex items-center gap-2 rounded-lg border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-2 dark:border-[#273244] dark:bg-[#0f172a]/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1B5CFF]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-[#E7E7EA] p-4 text-center text-[#6E6E77] dark:border-[#273244]">
            Sin servicios registrados
          </div>
        )}
      </OrdenDetailModal>

      <OrdenDetailModal
        open={comentarioModal.open}
        onClose={() => setComentarioModal({ open: false, content: "" })}
        title="Comentario del técnico"
        subtitle="Observaciones y notas del técnico"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        }
      >
        <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#0f172a]/40">
          {comentarioModal.content || "-"}
        </pre>
      </OrdenDetailModal>

      <OrdenFormModal
        variant="tecnico"
        isOpen={showModal}
        onClose={handleCloseModal}
        closeOnEscape={!confirmDelete.open && !photoPreview.open}
        editingOrden={editingOrden}
        tipoOrdenLabel={tipoOrdenLabel}
        isLimitedEdit={isLimitedEdit}
        formScrollRef={formScrollRef}
          onSubmit={handleSubmit}
        activeTabRef={activeTabRef}
        goToOrdenTab={goToOrdenTab}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        modalAlert={modalAlert}
        isSaving={isSaving}
        uploadingPhotos={uploadingPhotos}
        bodyLoading={detailLoading}
        triggerSaveFromFooter={triggerSaveFromFooter}
        summary={{
          cliente: formData.cliente,
          tecnico: tecnicoDisplayLabel(usuarios, formData.tecnico_asignado) || undefined,
          prioridad: ({ alta: "Alta", media: "Media", baja: "Baja" } as Record<string, string>)[formData.prioridad_pool],
        }}
        ordenCompletada={["resuelto", "cancelada"].includes(
          String(formData.status || "").toLowerCase()
        )}
        canOrdenesEdit={canOrdenesEdit}
        canOrdenesCreate={canOrdenesCreate}
      >

          {activeTab === "cliente" ? (
          <OrdenClienteTab
            part="cliente"
            hidden={false}
            variant="tecnico"
            panelId={ORDEN_FORM_PANEL_IDS.cliente}
            labelledBy={ORDEN_FORM_TAB_IDS.cliente}
            editingOrden={editingOrden}
            formData={formData}
            setFormData={setFormData}
            ro={ro}
            inputLockedClass={inputLockedClass}
            setClienteSearch={setClienteSearch}
            clientes={clientes}
            selectCliente={selectCliente}
            setShowClienteModal={setShowClienteModal}
            tecnicoSearch={tecnicoSearch}
            setTecnicoSearch={setTecnicoSearch}
            quienInstaloSearch={quienInstaloSearch}
            setQuienInstaloSearch={setQuienInstaloSearch}
            quienEntregoSearch={quienEntregoSearch}
            setQuienEntregoSearch={setQuienEntregoSearch}
            usuarios={usuarios}
            selectTecnico={selectTecnico}
            selectQuienInstalo={selectQuienInstalo}
            selectQuienEntrego={selectQuienEntrego}
            setFirmaClienteUrl={setFirmaClienteUrl}
            setShowMapModal={setShowMapModal}
            tecnicoSignatureUrl={tecnicoSignatureUrl}
            maxPhotosAllowed={maxPhotosAllowed}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            photoPreview={photoPreview}
            setPhotoPreview={setPhotoPreview}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            confirmDeletePhoto={confirmDeletePhoto}
            deletingPhoto={deletingPhoto}
            uploadingPhotos={uploadingPhotos}
            photoUploadProgress={photoUploadProgress}
            isReadOnly={isReadOnly}
            isLimitedEdit={isLimitedEdit}
            isAdmin={isAdmin}
          />
          ) : null}
        {activeTab === "orden" ? (
        <OrdenDetalleTab
            part="trabajo"
            variant="tecnico"
            panelId={ORDEN_FORM_PANEL_IDS.orden}
            labelledBy={ORDEN_FORM_TAB_IDS.orden}
            isActive
            showLevantamiento={tipoOrden === "levantamiento"}
            tipoOrden={tipoOrden}
            setTipoOrden={setTipoOrden}
            isReadOnly={isReadOnly}
            isLimitedEdit={isLimitedEdit}
            editingOrden={editingOrden}
            levantamientoSnapshotRef={levantamientoSnapshotRef}
            formData={formData}
            setFormData={setFormData}
            ro={ro}
            inputLockedClass={inputLockedClass}
            servicioSearch={servicioSearch}
            setServicioSearch={setServicioSearch}
            serviciosDisponibles={serviciosDisponibles}
            setServiciosDisponibles={setServiciosDisponibles}
            addServicio={addServicio}
          />
        ) : null}
        {activeTab === "asignacion" ? (
          <OrdenClienteTab
            part="asignacion"
            hidden={false}
            variant="tecnico"
            panelId={ORDEN_FORM_PANEL_IDS.asignacion}
            labelledBy={ORDEN_FORM_TAB_IDS.asignacion}
            editingOrden={editingOrden}
            formData={formData}
            setFormData={setFormData}
            ro={ro}
            inputLockedClass={inputLockedClass}
            setClienteSearch={setClienteSearch}
            clientes={clientes}
            selectCliente={selectCliente}
            setShowClienteModal={setShowClienteModal}
            tecnicoSearch={tecnicoSearch}
            setTecnicoSearch={setTecnicoSearch}
            quienInstaloSearch={quienInstaloSearch}
            setQuienInstaloSearch={setQuienInstaloSearch}
            quienEntregoSearch={quienEntregoSearch}
            setQuienEntregoSearch={setQuienEntregoSearch}
            usuarios={usuarios}
            selectTecnico={selectTecnico}
            selectQuienInstalo={selectQuienInstalo}
            selectQuienEntrego={selectQuienEntrego}
            setFirmaClienteUrl={setFirmaClienteUrl}
            setShowMapModal={setShowMapModal}
            tecnicoSignatureUrl={tecnicoSignatureUrl}
            maxPhotosAllowed={maxPhotosAllowed}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            photoPreview={photoPreview}
            setPhotoPreview={setPhotoPreview}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            confirmDeletePhoto={confirmDeletePhoto}
            deletingPhoto={deletingPhoto}
            uploadingPhotos={uploadingPhotos}
            photoUploadProgress={photoUploadProgress}
            isReadOnly={isReadOnly}
            isLimitedEdit={isLimitedEdit}
            isAdmin={isAdmin}
          />
        ) : null}
        {activeTab === "equipos" && (
          <OrdenEquiposTab
            panelId={ORDEN_FORM_PANEL_IDS.equipos}
            labelledBy={ORDEN_FORM_TAB_IDS.equipos}
            equipos={formData.equipos_inventario}
            isAdmin={isAdmin}
            isReadOnly={isReadOnly}
            canMarkInstalacion={
              !isReadOnly && (isAdmin || (!isLimitedEdit && canOrdenesEdit))
            }
            onAddFromItem={addEquipoFromItem}
            onUpdateEquipo={updateEquipo}
            onRemoveEquipo={removeEquipo}
          />
        )}
        {activeTab === "evidencia" && (
          <div
            id={ORDEN_FORM_PANEL_IDS.evidencia}
            role="tabpanel"
            aria-labelledby={ORDEN_FORM_TAB_IDS.evidencia}
            tabIndex={-1}
            className="space-y-5 outline-none"
          >
            <OrdenClienteTab
              part="evidencia"
              embedded
              hidden={false}
              variant="tecnico"
              panelId={ORDEN_FORM_PANEL_IDS.evidencia}
              labelledBy={ORDEN_FORM_TAB_IDS.evidencia}
              editingOrden={editingOrden}
              formData={formData}
              setFormData={setFormData}
              ro={ro}
              inputLockedClass={inputLockedClass}
              setClienteSearch={setClienteSearch}
              clientes={clientes}
              selectCliente={selectCliente}
              setShowClienteModal={setShowClienteModal}
              tecnicoSearch={tecnicoSearch}
              setTecnicoSearch={setTecnicoSearch}
              quienInstaloSearch={quienInstaloSearch}
              setQuienInstaloSearch={setQuienInstaloSearch}
              quienEntregoSearch={quienEntregoSearch}
              setQuienEntregoSearch={setQuienEntregoSearch}
              usuarios={usuarios}
              selectTecnico={selectTecnico}
              selectQuienInstalo={selectQuienInstalo}
              selectQuienEntrego={selectQuienEntrego}
              setFirmaClienteUrl={setFirmaClienteUrl}
              setShowMapModal={setShowMapModal}
              tecnicoSignatureUrl={tecnicoSignatureUrl}
              maxPhotosAllowed={maxPhotosAllowed}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
              photoPreview={photoPreview}
              setPhotoPreview={setPhotoPreview}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              confirmDeletePhoto={confirmDeletePhoto}
              deletingPhoto={deletingPhoto}
              uploadingPhotos={uploadingPhotos}
              photoUploadProgress={photoUploadProgress}
              isReadOnly={isReadOnly}
              isLimitedEdit={isLimitedEdit}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </OrdenFormModal>

      {ordenToDelete && (
        <OrdenDeleteDialog
          open={showDeleteModal}
          clienteLabel={ordenToDelete.cliente}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}

      <OrdenLocationMapModal
        open={showMapModal}
        onClose={() => setShowMapModal(false)}
        direccion={formData.direccion}
        onConfirm={(url) => {
          bumpFormNonce();
          setFormData((prev) => ({ ...prev, direccion: url }));
        }}
        onNotify={({ variant, title, message }) => {
          setAlert({ show: true, variant, title, message });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3200);
        }}
      />

      <ClienteFormModal
        isOpen={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSuccess={handleClienteSuccess}
        editingCliente={null}
        permissions={permissions}
      />
    </div>
    </div>
  );
}
