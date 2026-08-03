import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { OrdenesPageStats } from "./list/OrdenesPageStats";
import OrdenesListFiltersPopover from "./list/OrdenesListFiltersPopover";
import OrdenFormModal, { ORDEN_FORM_PANEL_IDS, ORDEN_FORM_TAB_IDS } from "./form/OrdenFormModal";
import { OrdenClienteTab } from "./form/tabs/OrdenClienteTab";
import { OrdenDetalleTab } from "./form/tabs/OrdenDetalleTab";
import {
  type Orden,
  type Usuario,
} from "./shared/ordenesPageTypes";
import { useOrdenFormModalState } from "./form/useOrdenFormModalState";
import { useOrdenFormDraft } from "./form/useOrdenFormDraft";
import {
  markOrdenesListInitialLoad,
  ORDENES_PAGE_INIT_THROTTLE_MS,
  useOrdenesList,
} from "./shared/useOrdenesList";
import { useOrdenesPagePermissions } from "./useOrdenesPagePermissions";
import { buildClienteSearchActions } from "@/components/clientes/clienteSearchActions";
import { PencilIcon, TrashBinIcon, MailIcon } from "@/icons";
import { MobileOrderList } from "./list/MobileOrderCard";
import { OrdenPdfLoadingModal } from "./list/OrdenPdfLoadingModal";
import OrdenEnviarPdfModal, { type OrdenEnviarPdfTarget } from "./list/OrdenEnviarPdfModal";
import {
  handleOrdenPdfClick,
  isOrdenResuelta,
  isOrdenServicioTecnico,
  displayOrdenFolio,
  resolveClienteCorreoSugerido,
  getNowHHMM,
} from "./shared/useOrdenesShared";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { Cliente } from "@/types/cliente";
import {
  OrdenDeleteModal,
  OrdenViewModal,
} from "../OrdenTrabajoModals";
import {
  claudeBodyClass,
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
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
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
  pageCardShellClass,
  pageSearchInputClass,
  sectionLabelOrangeClass,
} from "../ordenTrabajoStyles";


let ordenesTecnicoSignatureLastLoadAt = 0;

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
  } = useOrdenesPagePermissions();
  const { user, isAdmin } = useAuth();

  const formScrollRef = useRef<HTMLFormElement>(null);

  const levantamientoSnapshotRef = useRef<{ payload: any; dibujo_url: string; cerco_materiales?: any[] } | null>(null);

  const [mySignatureUrl, setMySignatureUrl] = useState<string>('');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const now = Date.now();
    if (now - ordenesTecnicoSignatureLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
    ordenesTecnicoSignatureLastLoadAt = now;
    const load = async () => {
      try {
        const res = await fetchApi('/api/me/signature/', {
          cache: 'no-store' as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        setMySignatureUrl(data?.url || '');
      } catch {
        /* ignore */
      }
    };
    load();
  }, [authLoading, isAuthenticated]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const {
    setOrdenes,
    loading,
    searchTerm,
    setSearchTerm,
    selectedMonth,
    setSelectedMonth,
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
  } = useOrdenesList({ variant: "tecnico", canView: canOrdenesView, usuarios });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState<Orden | null>(null);

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
    resetOrdenModalShell,
  } = useOrdenFormModalState({
    canCreate: canOrdenesCreate,
    canEdit: canOrdenesEdit,
    userId: user?.id ?? null,
    isAdmin,
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

  const activeTabRef = useRef<"orden" | "cliente">(activeTab);
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
    addServicio,
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
    mySignatureUrl,
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

  const ro = isFieldReadOnly;
  const inputLockedClass = (field: Parameters<typeof isFieldReadOnly>[0]) =>
    ro(field)
      ? 'bg-gray-100 text-gray-600 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-400'
      : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20';

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

  const parseYearMonth = (value: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec((value || "").trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!Number.isFinite(year) || month < 1 || month > 12) return null;
    return { year, month };
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!markOrdenesListInitialLoad()) return;
    fetchOrdenes();
  }, [authLoading, isAuthenticated, canOrdenesView]);

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
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const zoomRef = useRef<number>(15);
  const mapContainerId = 'leaflet-map';

  const [problematicaModal, setProblematicaModal] = useState<{ open: boolean, content: string }>({ open: false, content: '' });
  const [serviciosModal, setServiciosModal] = useState<{ open: boolean; content: string[] }>({ open: false, content: [] });
  const [comentarioModal, setComentarioModal] = useState<{ open: boolean; content: string }>({ open: false, content: '' });

  // Cargar Leaflet en demanda e inicializar mapa al abrir modal
  useEffect(() => {
    if (!showMapModal) {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* mapa Leaflet ya destruido */ }
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const initFromDireccion = () => {
      const d = (formData.direccion || '').trim();
      const m = d.match(/q=([-\d.]+),([-\d.]+)/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedLocation({ lat, lng });
          return true;
        }
      }
      return false;
    };

    const ensureLeaflet = async () => {
      const w = window as Window & { L?: unknown };
      if (w.L) return w.L;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById('leaflet-js')) return resolve();
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin = '';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Leaflet load error'));
        document.body.appendChild(script);
      });
      return (window as Window & { L?: unknown }).L;
    };

    void (async () => {
      try {
        const L: any = await ensureLeaflet();
        const had = initFromDireccion();
        if (!had && !selectedLocation) {
          setSelectedLocation({ lat: 19.0653, lng: -104.2831 });
        }
        const container = document.getElementById(mapContainerId);
        if (!container) return;
        const center = selectedLocation || { lat: 19.0653, lng: -104.2831 };
        const map = L.map(container).setView([center.lat, center.lng], zoomRef.current || 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        map.on('zoomend', () => {
          try { zoomRef.current = map.getZoom(); } catch { /* zoom durante teardown */ }
        });
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
        });
        mapRef.current = map;
        if (selectedLocation) {
          markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
        }
      } catch {
        setAlert({ show: true, variant: 'error', title: 'Error de mapa', message: 'No se pudo cargar el mapa interactivo.' });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      }
    })();
  }, [showMapModal, formData.direccion, selectedLocation, setAlert]);

  useEffect(() => {
    const L: any = (window as any).L;
    if (!mapRef.current || !selectedLocation || !L) return;
    const map = mapRef.current;
    const currentZoom = typeof zoomRef.current === 'number' ? zoomRef.current : map.getZoom?.() || 15;
    map.setView([selectedLocation.lat, selectedLocation.lng], currentZoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    } else {
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
    }
  }, [selectedLocation]);

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

  const handleEdit = (orden: Orden) => {
    if (!canOrdenesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingOrden(orden);
    setTecnicoSearch('');
    setActiveTab("cliente");
    const orderType = String(orden.tipo_orden || '').toLowerCase();
    setTipoOrden(orderType === 'levantamiento' ? 'levantamiento' : 'servicio_tecnico');
    loadFromOrden(orden);
    setShowModal(true);
  };

  const handleCloseModal = () => {
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

  // Paginación
  // Paginación por mes (mostrar todas las órdenes del mes seleccionado)
  const startIndex = 0;
  const currentOrdenes = shownList;

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
          <svg className='w-4 h-4 text-[#ff801f]' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
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
            <svg className='w-4 h-4 text-[#ff801f]' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M12 5v14M5 12h14' />
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
    <div className={erpPageCanvasClass}>
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
        <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
          /
        </span>
        <span className="text-[#44403c] dark:text-[#cbd5e1]">Mis órdenes</span>
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

      <header className={`relative flex w-full flex-col gap-4 ${pageCardShellClass} p-4 sm:p-6`}>
        <div className={erpHeroBlurClass} />
        <div className="relative z-[1] flex min-w-0 gap-3 sm:gap-4">
          <div className={erpHeroIconWrapClass}>
            <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className={sectionLabelOrangeClass}>
              Operación
            </p>
            <h1 className={`mt-0.5 ${erpHeroHeadingClass}`}>Mis órdenes</h1>
            <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
              Órdenes donde eres el técnico asignado o el creador. Registra servicio, firmas y evidencia desde aquí.
            </p>
            <div className={erpHeroGradientClass} />
          </div>
        </div>
      </header>

      <OrdenesPageStats stats={ordenStats} showEstrella={false} />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
        <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en tus órdenes…"
            className={pageSearchInputClass}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
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

      <ComponentCard
        compact
        title="Listado"
        desc="Órdenes visibles para tu cuenta. Usa filtros para acotar por estado, servicio o fecha."
        className={`overflow-visible ${pageCardShellClass}`}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
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
              showTecnicoFilter={false}
              datePickerId="filtro-fecha-ordenes-tecnico"
            />
          </div>
        }
      >
        <div className="p-2">
          <MobileOrderList
            ordenes={currentOrdenes}
            startIndex={startIndex}
            loading={loading}
            formatDate={formatYmdToDMY}
            onPdf={handleOrdenPdf}
            onEnviarPdf={openEnviarPdfModal}
            onEdit={canOrdenesEdit ? handleEdit : undefined}
            onDelete={canOrdenesDelete ? handleDeleteClick : undefined}
            canEdit={canOrdenesEdit}
            canDelete={canOrdenesDelete}
            usuarios={usuarios}
          />
          <div className={"hidden md:block " + erpTableWrapClass}>
            <Table className="w-full min-w-[900px] sm:table-fixed sm:min-w-0 xl:min-w-full">
              <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-[70px] min-w-[60px] whitespace-nowrap text-gray-700 dark:text-gray-300">ID</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-2/5 min-w-[220px] whitespace-nowrap text-gray-700 dark:text-gray-300">Cliente</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/5 min-w-[220px] text-gray-700 dark:text-gray-300">Detalles</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-[130px] min-w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fechas</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-[160px] min-w-[160px] whitespace-nowrap text-gray-700 dark:text-gray-300">Técnico</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-[110px] min-w-[110px] whitespace-nowrap text-gray-700 dark:text-gray-300">Estado</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-[150px] min-w-[150px] whitespace-nowrap text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
                {currentOrdenes.map((orden, idx) => {
                  const fecha = orden.fecha_inicio || orden.fecha_creacion || '';
                  const fechaFmt = fecha ? formatYmdToDMY(fecha) : '-';
                  const finFmt = orden.fecha_finalizacion ? formatYmdToDMY(orden.fecha_finalizacion) : '-';
                  const folioDisplay = displayOrdenFolio(orden, startIndex + idx + 1);
                  const tecnico = usuarios.find(u => u.id === (orden as any).tecnico_asignado);
                  let tecnicoNombre = '-';
                  if (tecnico) {
                    tecnicoNombre = tecnico.first_name && tecnico.last_name ? `${tecnico.first_name} ${tecnico.last_name}` : (tecnico.username || tecnico.email);
                  } else if ((orden as any).tecnico_asignado_full_name) {
                    tecnicoNombre = (orden as any).tecnico_asignado_full_name;
                  } else if ((orden as any).tecnico_asignado_username) {
                    tecnicoNombre = (orden as any).tecnico_asignado_username;
                  } else if ((orden as any).tecnico_asignado) {
                    tecnicoNombre = `ID: ${(orden as any).tecnico_asignado}`;
                  }
                  return (
                    <TableRow key={orden.id ?? idx} className={erpTableRowHoverClass}>
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[90px] min-w-[80px]">{folioDisplay}</TableCell>
                      <TableCell className="px-2 py-2 text-gray-900 dark:text-white w-1/5 min-w-[220px]">
                        <div className="font-medium truncate">{orden.cliente || 'Sin cliente'}</div>
                        {orden.direccion && (
                          <a href={orden.direccion} target="_blank" rel="noreferrer" className="block text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate">{orden.direccion}</a>
                        )}
                        {orden.telefono_cliente && (
                          <a href={`tel:${orden.telefono_cliente}`} className="inline-block text-[11px] text-gray-600 dark:text-gray-400">{orden.telefono_cliente}</a>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 w-2/5 min-w-[220px] whitespace-normal">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => setProblematicaModal({ open: true, content: orden.problematica || '-' })}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver problemática"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
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
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[130px] min-w-[130px]">
                        <div className="text-[12px] text-gray-700 dark:text-gray-300">
                          <div><span className="text-gray-500">Inicio:</span> {fechaFmt}</div>
                          <div><span className="text-gray-500">Fin:</span> {finFmt}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[160px] min-w-[160px]">
                        <div className="space-y-1">
                          <div className="text-[12px] text-gray-700 dark:text-gray-300 truncate">{tecnicoNombre}</div>
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
                      <TableCell className="px-2 py-2 text-center w-[110px] min-w-[110px]">
                        {orden.status === 'resuelto' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Resuelto</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center w-[150px] min-w-[150px]">
                        <div className={erpRowActionBarClass}>
                          <button
                            type="button"
                            onClick={() => handleOrdenPdf(orden)}
                            className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-red-400 hover:text-red-600 dark:hover:border-red-500 transition"
                            title={orden.status === "resuelto" ? "Descargar PDF" : "Ver PDF"}
                            aria-label={orden.status === "resuelto" ? "Descargar PDF" : "Ver PDF"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                              <g>
                                <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105z" />
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
                              className={erpRowActionBtnClass}
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canOrdenesDelete && (
                            <button
                              onClick={() => handleDeleteClick(orden)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                              title="Eliminar"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!loading && shownList.length === 0) && (
                  <TableRow>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2 text-center text-[12px] text-gray-500">Sin órdenes</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {!loading && (
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 flex-wrap">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium text-gray-900 dark:text-white">{shownList.length > 0 ? 1 : 0}</span> a{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{shownList.length > 0 ? shownList.length : 0}</span> de{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{shownList.length}</span> órdenes
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return;
                      const d = new Date(ym.year, ym.month - 2, 1);
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      setSelectedMonth(`${d.getFullYear()}-${mm}`);
                    }}
                    className={erpMonthNavBtnClass}
                    title="Mes anterior"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="min-w-[130px] sm:min-w-[160px] text-center text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-300">
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
                      const d = new Date(ym.year, ym.month, 1);
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      setSelectedMonth(`${d.getFullYear()}-${mm}`);
                    }}
                    className={erpMonthNavBtnClass}
                    title="Mes siguiente"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ComponentCard>

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
        <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#334155] dark:bg-[#0f172a]/40">
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
              <li key={i} className="inline-flex items-center gap-2 rounded-lg border border-[#e7ded0] bg-[#fcfaf6] px-3 py-2 dark:border-[#334155] dark:bg-[#0f172a]/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff801f]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-[#e7ded0] p-4 text-center text-[#78716c] dark:border-[#334155]">
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
        <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#334155] dark:bg-[#0f172a]/40">
          {comentarioModal.content || "-"}
        </pre>
      </OrdenViewModal>

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
        triggerSaveFromFooter={triggerSaveFromFooter}
        canOrdenesEdit={canOrdenesEdit}
        canOrdenesCreate={canOrdenesCreate}
      >

            {activeTab === "cliente" && (
          <OrdenClienteTab
            variant="tecnico"
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
            setShowMapModal={setShowMapModal}
            tecnicoSignatureUrl={tecnicoSignatureUrl}
            mySignatureUrl={mySignatureUrl}
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
          />
        )}
        {(activeTab === "orden" || tipoOrden === "levantamiento") && (
          <OrdenDetalleTab
            variant="tecnico"
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

      {/* Modal Mapa Interactivo */}
      <Modal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        closeOnBackdropClick={false}
        ariaLabel="Seleccionar ubicación en el mapa"
        className="w-[96vw] sm:w-[90vw] md:w-[80vw] max-w-3xl mx-0 sm:mx-auto"
      >
        <div className="p-0 overflow-hidden max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la ubicación</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5 flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="relative w-full h-[50vh] sm:h-[55vh] md:h-[60vh] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div id="leaflet-map" className="absolute inset-0" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">O ingresa las coordenadas manualmente</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="text" placeholder="Latitud (ej: 19.0653)" value={selectedLocation?.lat || ''} onChange={(e) => { const lat = parseFloat(e.target.value); if (!isNaN(lat)) setSelectedLocation({ lat, lng: selectedLocation?.lng || -104.2831 }); }} className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 text-gray-800 dark:text-gray-200 outline-none" />
                  </div>
                  <div>
                    <input type="text" placeholder="Longitud (ej: -104.2831)" value={selectedLocation?.lng || ''} onChange={(e) => { const lng = parseFloat(e.target.value); if (!isNaN(lng)) setSelectedLocation({ lat: selectedLocation?.lat || 19.0653, lng }); }} className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 text-gray-800 dark:text-gray-200 outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="px-4 sm:px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowMapModal(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                bumpFormNonce();
                if (!navigator.geolocation) {
                  setAlert({ show: true, variant: 'warning', title: 'Geolocalización no disponible', message: 'Tu navegador no soporta geolocalización.' });
                  setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                  return;
                }
                if (!window.isSecureContext) {
                  setAlert({ show: true, variant: 'warning', title: 'Se requiere conexión segura', message: 'La geolocalización requiere HTTPS (o localhost). Abre el sistema con HTTPS o en localhost e inténtalo de nuevo.' });
                  setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3200);
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setSelectedLocation({ lat: latitude, lng: longitude });
                    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    setFormData((prev) => ({ ...prev, direccion: url }));
                    setShowMapModal(false);
                    setSelectedLocation(null);
                  },
                  () => {
                    setAlert({ show: true, variant: 'warning', title: 'No se pudo obtener ubicación', message: 'Activa permisos de ubicación e inténtalo de nuevo.' });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                  },
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300/40 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Usar mi ubicación
            </button>
            <button
              type="button"
              onClick={() => {
                const loc = selectedLocation || { lat: 19.0653, lng: -104.2831 };
                const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                setFormData({ ...formData, direccion: url });
                setShowMapModal(false);
                setSelectedLocation(null);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-[#ff801f] text-white hover:bg-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Usar esta ubicación
            </button>
          </div>
        </div>
      </Modal>

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
