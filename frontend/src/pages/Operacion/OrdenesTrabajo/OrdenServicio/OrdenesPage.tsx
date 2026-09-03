import { useState, useEffect, useId, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { OrdenesPageStats } from "./list/OrdenesPageStats";
import OrdenesListFiltersPopover from "./list/OrdenesListFiltersPopover";
import OrdenLocationMapModal from "./form/fields/OrdenLocationMapModal";
import OrdenFormModal, { ORDEN_FORM_PANEL_IDS, ORDEN_FORM_TAB_IDS } from "./form/OrdenFormModal";
import { OrdenClienteTab } from "./form/tabs/OrdenClienteTab";
import { OrdenDetalleTab } from "./form/tabs/OrdenDetalleTab";
import { OrdenEquiposTab } from "./form/tabs/OrdenEquiposTab";
import {
  type Orden,
  type Usuario,
} from "./shared/ordenesPageTypes";
import { useOrdenFormModalState } from "./form/useOrdenFormModalState";
import { useOrdenFormDraft } from "./form/useOrdenFormDraft";
import { useOrdenesList } from "./shared/useOrdenesList";
import { useOrdenesPagePermissions } from "./useOrdenesPagePermissions";
import { buildClienteSearchActions } from "@/components/clientes/clienteSearchActions";
import { PencilIcon, TrashBinIcon, MailIcon } from "@/icons";
import { MobileOrderList } from "./list/MobileOrderCard";
import { OrdenStatusSectionHeader } from "./list/OrdenStatusSectionHeader";
import { OrdenesMonthLoadingBanner } from "./list/OrdenesMonthLoadingBanner";
import { OrdenPdfLoadingModal } from "./list/OrdenPdfLoadingModal";
import OrdenEnviarPdfModal, { type OrdenEnviarPdfTarget } from "./list/OrdenEnviarPdfModal";
import {
  downloadOrdenesMesPdf,
  handleOrdenPdfClick,
  isOrdenResuelta,
  isOrdenServicioTecnico,
  displayOrdenFolio,
  resolveClienteCorreoSugerido,
  fetchOrdenDetail,
} from "./shared/useOrdenesShared";
import {
  formatYmdToDMY,
  getNowHHMM,
  isGoogleMapsUrl,
  isOrdenStatusChangeRecent,
  ORDEN_RECIEN_RESUELTA_BADGE_CLASS,
  ORDEN_RECIEN_RESUELTA_ROW_CLASS,
  parseYearMonth,
} from "./shared/ordenesPageUtils";
import { groupOrdenesByStatus } from "./shared/ordenStatusSections";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { Cliente } from "@/types/cliente";
import {
  OrdenDeleteModal,
  OrdenViewModal,
} from "../OrdenTrabajoModals";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpHeroBlurClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpMonthNavBtnClass,
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
  pageCardShellClass,
  pageSearchInputClass,
} from "./ordenServicioStyles";


export default function Ordenes() {
  const navigate = useNavigate();
  const location = useLocation();

  const formScrollRef = useRef<HTMLFormElement>(null);

  const levantamientoSnapshotRef = useRef<{ payload: any; dibujo_url: string; cerco_materiales?: any[] } | null>(null);
  const {
    permissions,
    authLoading,
    isAuthenticated,
    canOrdenesView,
    canOrdenesCreate,
    canOrdenesEdit,
    canOrdenesDelete,
    ordenesOwnOnly,
  } = useOrdenesPagePermissions();
  const { user, isAdmin } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const {
    ordenes,
    setOrdenes,
    loading,
    monthLoading,
    searchTerm,
    setSearchTerm,
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
    clearListFilters,
    activeFilterCount,
    shownList,
    stats: ordenStats,
    alert,
    setAlert,
    fetchOrdenes,
  } = useOrdenesList({ variant: "admin", canView: canOrdenesView, usuarios });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState<Orden | null>(null);
  /** Al editar: el modal se abre de inmediato y el cuerpo muestra un esqueleto mientras llega el detalle (firma/fotos). */
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
    tipoOrdenLabel,
    openNewOrden,
    resetOrdenModalShell,
  } = useOrdenFormModalState({
    canCreate: canOrdenesCreate,
    canEdit: canOrdenesEdit,
    userId: user?.id ?? null,
    isAdmin,
    ownOnly: ordenesOwnOnly,
  });

  const ro = isFieldReadOnly;
  const inputLockedClass = (field: Parameters<typeof isFieldReadOnly>[0]) =>
    ro(field)
      ? 'bg-[#F1F5FF] text-[#52525B] cursor-not-allowed dark:bg-[#111827]/50 dark:text-[#8EA0B8]'
      : 'bg-white text-[#09090B] dark:bg-[#111827] dark:text-[#B7C1D1] focus:border-[#1B5CFF] focus:ring-2 focus:ring-[#1B5CFF]/20 dark:focus:border-[#4B7CFF] dark:focus:ring-[#4B7CFF]/20';
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({ open: false, index: null, url: null });
  const [photoPreview, setPhotoPreview] = useState<{ open: boolean; url: string | null; index: number }>({
    open: false,
    url: null,
    index: 0,
  });
  const [showMapModal, setShowMapModal] = useState(false);
  const [problematicaModal, setProblematicaModal] = useState<{ open: boolean; content: string }>({
    open: false,
    content: "",
  });
  const [serviciosModal, setServiciosModal] = useState<{ open: boolean; content: string[] }>({
    open: false,
    content: [],
  });
  const [comentarioModal, setComentarioModal] = useState<{ open: boolean; content: string }>({
    open: false,
    content: "",
  });

  // Abrir modal de nueva orden con tipo "levantamiento" al llegar desde /levantamiento (Nueva Orden)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nueva') === 'levantamiento' && canOrdenesCreate) {
      openNewOrden({ tipo: "levantamiento", tab: "cliente" });
      navigate('/ordenes', { replace: true });
    }
  }, [location.search, canOrdenesCreate, navigate, openNewOrden]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void fetchOrdenes();
  }, [authLoading, isAuthenticated, canOrdenesView, fetchOrdenes]);

  const [modalAlert, setModalAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [mesPdfLoading, setMesPdfLoading] = useState(false);
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

  const handleOrdenPdf = (orden: Orden) => {
    handleOrdenPdfClick(orden, navigate, location.pathname, {
      onDownloading: (id) => setPdfDownloading(id != null),
      onError: (message) => {
        setAlert({ show: true, variant: "error", title: "PDF", message });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 5000);
      },
    });
  };

  const ordenesDelMes = useMemo(() => {
    if (!selectedMonth || !Array.isArray(ordenes)) return [];
    const prefix = `${selectedMonth}-`;
    return ordenes.filter((o) => {
      const base = (o.fecha_inicio || o.fecha_creacion || "").toString();
      return base.startsWith(prefix);
    });
  }, [ordenes, selectedMonth]);

  const handleDownloadMesPdf = () => {
    const ym = parseYearMonth(selectedMonth);
    if (!ym) {
      setAlert({
        show: true,
        variant: "warning",
        title: "PDF del mes",
        message: "Seleccione un mes válido para descargar el listado.",
      });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4000);
      return;
    }
    if (ordenesDelMes.length === 0) {
      setAlert({
        show: true,
        variant: "info",
        title: "Sin órdenes",
        message: "No hay órdenes registradas en el mes seleccionado.",
      });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4000);
      return;
    }
    setMesPdfLoading(true);
    void downloadOrdenesMesPdf(selectedMonth).then((result) => {
      setMesPdfLoading(false);
      if (!result.ok && result.message) {
        setAlert({ show: true, variant: "error", title: "PDF del mes", message: result.message });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 5000);
      }
    });
  };

  const statusTecnicoId = useId().replace(/:/g, "");
  const statusAdminId = useId().replace(/:/g, "");
  const fechaEnvioAdminId = useId().replace(/:/g, "");

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
    clienteSearch,
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
    statusAdministrativo,
    setStatusAdministrativo,
    fechaEnvioAdmin,
    setFechaEnvioAdmin,
    cotizacionesAdmin,
    setCotizacionesAdmin,
  } = useOrdenFormDraft({
    variant: "admin",
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
    goToOrdenTab,
    setAlert,
    setModalAlert,
    onAfterSaveClose: resetOrdenModalShell,
    openEnviarPdfModal,
  });

  const confirmDeletePhoto = async (index: number, url: string) => {
    await handleDeletePhoto(index, url);
    setConfirmDelete({ open: false, index: null, url: null });
  };

  const triggerSaveFromFooter = () => {
    if (activeTabRef.current === "cliente") {
      goToOrdenTab();
      return;
    }
    formScrollRef.current?.requestSubmit();
  };

  const handleClienteSuccess = (newCliente: Cliente) => {
    void fetchClientes();
    selectCliente(newCliente);
    setShowClienteModal(false);
  };

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
    if (!ordenToDelete) return;    try {
      const response = await fetchApi(`/api/ordenes/${ordenToDelete.id}/`, {
        method: "DELETE",      });

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
    if (!canOrdenesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return false;
    }

    // Abrir el modal de inmediato con lo que ya trae el listado; el detalle
    // completo (firma, fotos, equipos) llega en segundo plano.
    const seq = ++editDetailSeqRef.current;
    setEditingOrden(orden);
    setActiveTab("cliente");
    const seedType = String(orden.tipo_orden || '').toLowerCase();
    setTipoOrden(seedType === 'levantamiento' ? 'levantamiento' : 'servicio_tecnico');
    loadFromOrden(orden);
    setDetailLoading(true);
    setShowModal(true);

    const detail = await fetchOrdenDetail(orden.id);
    if (seq !== editDetailSeqRef.current) return true; // se abrió otra orden mientras tanto

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
    const orderType = String(detail.tipo_orden || '').toLowerCase();
    setTipoOrden(orderType === 'levantamiento' ? 'levantamiento' : 'servicio_tecnico');
    loadFromOrden(detail);
    setDetailLoading(false);
    return true;
  };

  const handleEditRef = useRef(handleEdit);
  handleEditRef.current = handleEdit;

  const abrirOrdenFromQueryDoneRef = useRef<string | null>(null);

  // Desde historial global (MonthlyTarget): /ordenes?abrir=<id> abre el modal de edición de esa orden
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("abrir");
    if (!raw) {
      abrirOrdenFromQueryDoneRef.current = null;
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      navigate("/ordenes", { replace: true });
      return;
    }
    if (loading) return;

    const doneKey = `abrir-${id}`;
    if (abrirOrdenFromQueryDoneRef.current === doneKey) return;

    const open = async () => {
      const fromList = ordenes.find((o) => o.id === id);
      const stub = fromList ?? ({ id } as Orden);
      const opened = await handleEditRef.current(stub);
      if (opened) {
        abrirOrdenFromQueryDoneRef.current = doneKey;
      }
      navigate("/ordenes", { replace: true });
    };

    void open();
  }, [loading, ordenes, location.search, navigate]);

  const handleCloseModal = () => {
    editDetailSeqRef.current++;
    setDetailLoading(false);
    bumpFormNonce();
    resetOrdenModalShell();
    resetForm();
  };

  const startIndex = 0;
  const currentOrdenes = shownList;
  const statusSections = useMemo(
    () => groupOrdenesByStatus(currentOrdenes),
    [currentOrdenes],
  );
  const ordenIndexById = useMemo(() => {
    const map = new Map<number, number>();
    currentOrdenes.forEach((orden, idx) => {
      if (typeof orden.id === "number") map.set(orden.id, idx);
    });
    return map;
  }, [currentOrdenes]);

  const clienteActions = useMemo(
    () => buildClienteSearchActions(clientes, clienteSearch),
    [clientes, clienteSearch]
  );

  const buildTecnicoActions = (searchValue: string) => {
    const q = searchValue.trim().toLowerCase();
    return (usuarios || [])
      .filter((u) => {
        if (!q) return true;
        const nombre = (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email).toLowerCase();
        return nombre.includes(q);
      })
      .map((u) => {
        const nombre = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email;
        return {
          id: String(u.id),
          label: nombre,
          icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">
              {nombre.slice(0, 1).toUpperCase()}
            </span>
          ),
          description: u.email,
          short: '',
          end: '',
        };
      });
  };

  const tecnicoActions = useMemo(() => buildTecnicoActions(tecnicoSearch), [usuarios, tecnicoSearch]);
  const quienInstaloActions = useMemo(() => buildTecnicoActions(quienInstaloSearch), [usuarios, quienInstaloSearch]);
  const quienEntregoActions = useMemo(() => buildTecnicoActions(quienEntregoSearch), [usuarios, quienEntregoSearch]);

  const servicioActions = useMemo(() => {
    const q = servicioSearch.trim().toLowerCase();
    const base = serviciosDisponibles
      .filter((s) => {
        const matches = !q || s.toLowerCase().includes(q);
        const notSelected = !formData.servicios_realizados.includes(s);
        return matches && notSelected;
      })
      .map((s) => ({
        id: s,
        label: s,
        icon: (
          <svg className='w-4 h-4 text-[#1B5CFF]' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
          </svg>
        ),
        description: "Servicio disponible",
        short: '',
        end: '',
      }));

    if (q !== "" && !serviciosDisponibles.some(s => s.toLowerCase() === q)) {
      return [
        {
          id: "__new__",
          label: `Crear "${servicioSearch.trim()}"`,
          icon: (
            <svg className='w-4 h-4 text-[#1B5CFF]' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M12 5v14M5 12h14M4 12h16' />
            </svg>
          ),
          description: "Nuevo servicio",
          short: '',
          end: '',
        },
        ...base
      ];
    }

    return base;
  }, [serviciosDisponibles, servicioSearch, formData.servicios_realizados]);

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
        <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Órdenes de trabajo</span>
      </nav>

      <OrdenPdfLoadingModal open={pdfDownloading || mesPdfLoading} downloading />
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

      <header className={osHeroBandClass}>
        <div className={erpHeroBlurClass} aria-hidden />
        <div className="relative flex min-w-0 items-start gap-4">
          <span className={erpHeroIconWrapClass} aria-hidden>
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className={osHeroEyebrowClass}>Operación</p>
            <h1 className={`mt-1 ${erpHeroHeadingClass}`}>Órdenes de trabajo</h1>
            <p className={osHeroBodyClass}>
              Administra órdenes de servicio, fotos, firmas y PDF. Filtra por estado, servicio o fecha en el listado.
            </p>
          </div>
        </div>
      </header>

      <OrdenesPageStats stats={ordenStats} />
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
        <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8EA0B8] sm:left-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio, cliente, técnico o estado…"
            className={pageSearchInputClass}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (!canOrdenesCreate) {
              setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear órdenes.' });
              setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
              return;
            }
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
      </div>

      <section
        className={`overflow-visible ${pageCardShellClass}`}
        aria-labelledby="ordenes-listado-heading"
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
                <h2 id="ordenes-listado-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Listado de órdenes
                </h2>
              </div>
              <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
                Resultados según búsqueda y filtros. En pantallas pequeñas desplázate horizontalmente si hace falta.
              </p>
            </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDownloadMesPdf}
              disabled={mesPdfLoading || loading}
              className={erpSecondaryBtnClass + " h-10 w-full sm:w-auto shrink-0"}
              title="Descargar PDF con todas las órdenes del mes visible"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              PDF del mes
            </button>
            {/* Filtro desplegable */}
            <OrdenesListFiltersPopover
              open={filterOpen}
              onOpenChange={setFilterOpen}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterServicio={filterServicio}
              setFilterServicio={setFilterServicio}
              filterDate={filterDate}
              setFilterDate={setFilterDate}
              filterTecnicoId={filterTecnicoId}
              setFilterTecnicoId={setFilterTecnicoId}
              serviciosDisponibles={serviciosDisponibles}
              usuarios={usuarios}
              activeFilterCount={activeFilterCount}
              onClear={clearListFilters}
              showTecnicoFilter
              datePickerId="filtro-fecha-ordenes-admin"
            />
          </div>
          </div>
        </div>
        <div className="p-2 sm:p-3">
          {monthLoading ? (
            <OrdenesMonthLoadingBanner selectedMonth={selectedMonth} className="mb-3" />
          ) : null}
          <MobileOrderList
            ordenes={currentOrdenes}
            startIndex={startIndex}
            loading={monthLoading}
            formatDate={formatYmdToDMY}
            onPdf={handleOrdenPdf}
            onEnviarPdf={openEnviarPdfModal}
            onEdit={canOrdenesEdit ? handleEdit : undefined}
            onDelete={canOrdenesDelete ? handleDeleteClick : undefined}
            canEdit={canOrdenesEdit}
            canDelete={canOrdenesDelete}
            usuarios={usuarios}
            highlightRecentStatus={isAdmin}
            groupByStatus
          />
          <div className={"hidden md:block " + erpTableWrapClass}>
            <Table className="w-full min-w-[900px] table-fixed sm:min-w-0 xl:min-w-full">
              <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                <TableRow>
                  <TableCell isHeader className="px-3 py-2 text-left w-[90px] min-w-[80px] whitespace-nowrap text-[#52525B] dark:text-[#B7C1D1]">Folio</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-left w-2/5 min-w-[220px] whitespace-nowrap text-[#52525B] dark:text-[#B7C1D1]">Cliente</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-left w-1/5 min-w-[220px] text-[#52525B] dark:text-[#B7C1D1]">Detalles</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-left w-[130px] min-w-[130px] whitespace-nowrap text-[#52525B] dark:text-[#B7C1D1]">Fechas</TableCell>

                  <TableCell isHeader className="px-3 py-2 text-left w-[160px] min-w-[160px] whitespace-nowrap text-[#52525B] dark:text-[#B7C1D1]">Técnico</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-center w-[110px] min-w-[110px] whitespace-nowrap text-[#52525B] dark:text-[#B7C1D1]">Estado</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-center w-[150px] min-w-[150px] whitespace-nowrap text-[#52525B] dark:text-[#B7C1D1]">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#EDEDED] bg-white text-[12px] text-[#44403c] dark:divide-[#273244] dark:bg-[#111827] dark:text-[#e5e7eb]">
                {statusSections.flatMap((section) => {
                  const headingId = `ordenes-table-${section.key.toLowerCase()}`;
                  const headerRow = (
                    <TableRow
                      key={`${section.key}-header`}
                      className="hover:bg-transparent dark:hover:bg-transparent"
                    >
                      <TableCell
                        isHeader
                        scope="colgroup"
                        colSpan={7}
                        className="border-y-0 bg-transparent p-0 text-left"
                      >
                        <div className="px-3 py-2">
                          <OrdenStatusSectionHeader
                            statusKey={section.key}
                            label={section.label}
                            count={section.ordenes.length}
                            headingId={headingId}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );

                  const dataRows = section.ordenes.map((orden, sectionIdx) => {
                  const idx =
                    typeof orden.id === "number" && ordenIndexById.has(orden.id)
                      ? (ordenIndexById.get(orden.id) as number)
                      : sectionIdx;
                  const fecha = orden.fecha_inicio || orden.fecha_creacion || '';
                  const fechaFmt = fecha ? formatYmdToDMY(fecha) : '-';
                  const finFmt = orden.fecha_finalizacion ? formatYmdToDMY(orden.fecha_finalizacion) : '-';
                  const folioDisplay = displayOrdenFolio(orden, startIndex + idx + 1);
                  const recentResolved = isAdmin && isOrdenStatusChangeRecent(orden);

                  const tecnico = usuarios.find(u => u.id === (orden as any).tecnico_asignado);
                  const tecnicoNombre = tecnico
                    ? (tecnico.first_name && tecnico.last_name ? `${tecnico.first_name} ${tecnico.last_name}` : tecnico.email)
                    : ((orden as any).nombre_encargado || '-');
                  return (
                    <TableRow
                      key={orden.id ?? `${section.key}-${sectionIdx}`}
                      className={`${erpTableRowHoverClass}${recentResolved ? ` ${ORDEN_RECIEN_RESUELTA_ROW_CLASS}` : ""}`}
                      aria-label={recentResolved ? `Orden ${folioDisplay}, resuelta recientemente` : undefined}
                    >
                      <TableCell className="px-3 py-2 whitespace-nowrap w-[90px] min-w-[80px]">{folioDisplay}</TableCell>
                      <TableCell className="px-3 py-2 text-[#09090B] dark:text-white w-1/5 min-w-[220px]">
                        <div className="font-medium truncate">{orden.cliente || 'Sin cliente'}</div>
                        {orden.direccion && (
                          isGoogleMapsUrl(orden.direccion) ? (
                            <a href={orden.direccion} target="_blank" rel="noreferrer" className="block text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate">{orden.direccion}</a>
                          ) : (
                            <span className="block text-[11px] text-[#52525B] dark:text-[#8EA0B8] truncate" title={orden.direccion}>{orden.direccion}</span>
                          )
                        )}
                        {orden.telefono_cliente && (
                          <a href={`tel:${orden.telefono_cliente}`} className="inline-block text-[11px] text-[#52525B] dark:text-[#8EA0B8]">{orden.telefono_cliente}</a>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 w-2/5 min-w-[220px] whitespace-normal">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => setProblematicaModal({ open: true, content: orden.problematica || '-' })}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver problemática"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Problemática
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiciosModal({ open: true, content: Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : [] })}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver servicios realizados"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                            Servicios
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap w-[130px] min-w-[130px]">
                        <div className="text-[12px] text-[#52525B] dark:text-[#B7C1D1]">
                          <div><span className="text-[#6E6E77]">Inicio:</span> {fechaFmt}</div>
                          <div><span className="text-[#6E6E77]">Fin:</span> {finFmt}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap w-[160px] min-w-[160px]">
                        <div className="space-y-1">
                          <div className="text-[12px] text-[#52525B] dark:text-[#B7C1D1] truncate">{tecnicoNombre}</div>
                          <button
                            type="button"
                            onClick={() => setComentarioModal({ open: true, content: (orden.comentario_tecnico || '') as string })}
                            className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver comentario del técnico"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
                            Comentarios
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center w-[110px] min-w-[110px]">
                        <div className="inline-flex flex-col items-center gap-1">
                          {orden.status === 'resuelto' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Resuelto</span>
                          ) : orden.status === 'pausado' ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                              title={orden.motivo_pausa ? String(orden.motivo_pausa) : undefined}
                            >
                              Pausado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pendiente</span>
                          )}
                          {recentResolved && (
                            <span className={ORDEN_RECIEN_RESUELTA_BADGE_CLASS}>
                              <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Resuelto recién
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center w-[150px] min-w-[150px]">
                        <div className={erpRowActionBarClass}>
                          <button
                            type="button"
                            onClick={() => handleOrdenPdf(orden)}
                            className={erpRowActionBtnClass + " hover:border-red-400 hover:text-red-600"}
                            title={orden.status === "resuelto" ? "Descargar PDF" : "Ver PDF"}
                            aria-label={orden.status === "resuelto" ? "Descargar PDF" : "Ver PDF"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                              <g>
                                <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
                                <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
                                <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
                                <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
                              </g>
                            </svg>
                          </button>
                          {isOrdenResuelta(orden.status) && isOrdenServicioTecnico(orden.tipo_orden) && (
                            <button
                              type="button"
                              onClick={() => openEnviarPdfModal(orden)}
                              className={erpRowActionBtnClass + " hover:border-sky-400 hover:text-sky-600"}
                              title="Enviar PDF por correo"
                              aria-label="Enviar PDF por correo"
                            >
                              <MailIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canOrdenesEdit && (
                            <button
                              onClick={() => handleEdit(orden)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-[#111827] border border-[#E7E7EA] dark:border-white/10 hover:border-[#1B5CFF] hover:text-[#1B5CFF] dark:hover:border-[#1B5CFF] transition"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canOrdenesDelete && (
                            <button
                              onClick={() => handleDeleteClick(orden)}
                              className={erpRowActionBtnClass + " hover:border-rose-400 hover:text-rose-600"}
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  });

                  return [headerRow, ...dataRows];
                })}
                {monthLoading && shownList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-2 py-8 text-center text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]"
                    >
                      <span role="status" aria-live="polite">
                        Cargando órdenes del mes…
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {(!monthLoading && shownList.length === 0) && (
                  <TableRow>
                    <TableCell className="px-3 py-2">&nbsp;</TableCell>
                    <TableCell className="px-3 py-2">&nbsp;</TableCell>
                    <TableCell className="px-3 py-2 text-center text-[12px] text-[#6E6E77]">Sin órdenes</TableCell>
                    <TableCell className="px-3 py-2">&nbsp;</TableCell>
                    <TableCell className="px-3 py-2">&nbsp;</TableCell>
                    <TableCell className="px-3 py-2">&nbsp;</TableCell>
                    <TableCell className="px-3 py-2">&nbsp;</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Navegación por mes: siempre visible (también mientras carga). */}
          <div className="border-t border-[#E7E7EA] px-5 py-4 dark:border-[#273244]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between sm:gap-4 flex-wrap">
                <p className="text-xs sm:text-sm text-[#52525B] dark:text-[#8EA0B8]">
                  {monthLoading ? (
                    <span role="status" aria-live="polite">
                      Cargando órdenes del mes seleccionado…
                    </span>
                  ) : (
                    <>
                      Mostrando <span className="font-medium text-[#09090B] dark:text-white">{shownList.length > 0 ? 1 : 0}</span> a{" "}
                      <span className="font-medium text-[#09090B] dark:text-white">{shownList.length > 0 ? shownList.length : 0}</span> de{" "}
                      <span className="font-medium text-[#09090B] dark:text-white">{shownList.length}</span> órdenes
                    </>
                  )}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return;
                      const d = new Date(ym.year, ym.month - 2, 1);
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      selectMonth(`${d.getFullYear()}-${mm}`);
                    }}
                    className={erpMonthNavBtnClass}
                    title="Mes anterior"
                    aria-label="Mes anterior"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="min-w-[130px] sm:min-w-[160px] text-center text-[11px] sm:text-[12px] text-[#52525B] dark:text-[#B7C1D1] capitalize">
                    {(() => {
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return selectedMonth ? selectedMonth : 'Todos los meses';
                      return new Date(ym.year, ym.month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return;
                      const dt = new Date(ym.year, ym.month - 1, 1);
                      dt.setMonth(dt.getMonth() + 1);
                      const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                      selectMonth(next);
                    }}
                    className={erpMonthNavBtnClass}
                    title="Mes siguiente"
                    aria-label="Mes siguiente"
                  >
                    <svg className="w-4 h-4 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6 6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Modales de detalle */}
      <OrdenViewModal
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
      </OrdenViewModal>

      <OrdenViewModal
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
      </OrdenViewModal>

      <OrdenViewModal
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
      </OrdenViewModal>

      <OrdenFormModal
        variant="admin"
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
      >
        {activeTab === "cliente" && (
          <OrdenClienteTab
            variant="admin"
            panelId={ORDEN_FORM_PANEL_IDS.cliente}
            labelledBy={ORDEN_FORM_TAB_IDS.cliente}
            editingOrden={editingOrden}
            formData={formData}
            setFormData={setFormData}
            ro={ro}
            inputLockedClass={inputLockedClass}
            clienteActions={clienteActions}
            clienteSearch={clienteSearch}
            setClienteSearch={setClienteSearch}
            clientes={clientes}
            selectCliente={selectCliente}
            setShowClienteModal={setShowClienteModal}
            tecnicoActions={tecnicoActions}
            tecnicoSearch={tecnicoSearch}
            setTecnicoSearch={setTecnicoSearch}
            quienInstaloActions={quienInstaloActions}
            quienInstaloSearch={quienInstaloSearch}
            setQuienInstaloSearch={setQuienInstaloSearch}
            quienEntregoActions={quienEntregoActions}
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
          />
        )}
        {(activeTab === "orden" || tipoOrden === "levantamiento") && (
          <OrdenDetalleTab
            variant="admin"
            panelId={ORDEN_FORM_PANEL_IDS.orden}
            labelledBy={ORDEN_FORM_TAB_IDS.orden}
            isActive={activeTab === "orden"}
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
            servicioActions={servicioActions}
            servicioSearch={servicioSearch}
            setServicioSearch={setServicioSearch}
            serviciosDisponibles={serviciosDisponibles}
            setServiciosDisponibles={setServiciosDisponibles}
            addServicio={addServicio}
            isAdmin={isAdmin}
            statusTecnicoId={statusTecnicoId}
            statusAdminId={statusAdminId}
            fechaEnvioAdminId={fechaEnvioAdminId}
            statusAdministrativo={statusAdministrativo}
            setStatusAdministrativo={setStatusAdministrativo}
            fechaEnvioAdmin={fechaEnvioAdmin}
            setFechaEnvioAdmin={setFechaEnvioAdmin}
            cotizacionesAdmin={cotizacionesAdmin}
            setCotizacionesAdmin={setCotizacionesAdmin}
          />
        )}
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
      </OrdenFormModal>

      {ordenToDelete && (
        <OrdenDeleteModal
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
