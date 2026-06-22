import { useState, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import PageMeta from "@/components/common/PageMeta";
import { Link } from "react-router-dom";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { onlyDigits10 } from "./clientesCatalogos";
import { ClienteSimplifiedFormFields } from "@/components/clientes/ClienteSimplifiedFormFields";
import { ClienteMapPickerModal } from "@/components/clientes/ClienteMapPickerModal";
import {
  type ClienteTipo,
  TIPO_OPTIONS,
  buildClientePayload,
  emptyFormData,
  formatApiErrors,
  formDataFromCliente,
  isGoogleMapsLink,
} from "@/components/clientes/clienteFormShared";

const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const searchInputClass =
  "min-h-[44px] w-full rounded-2xl border border-[#e2d9ca] bg-[#fffdf8] py-2 pl-10 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#7c7a74] focus:border-[#ff801f]/60 focus:ring-4 focus:ring-[#ff801f]/12 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20 sm:min-h-[46px] sm:pl-11";

const claudeHeroHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSectionHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";

const claudeBodyClass =
  "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const claudeCaptionClass = "text-sm font-normal leading-relaxed text-[#57534e] dark:text-[#8ea0b8]";

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

interface Cliente {
  id: number;
  idx: number;
  nombre: string;
  direccion: string;
  telefono: string;
  fecha_creacion: string;

  correo?: string;
  calle?: string;
  numero_exterior?: string;
  interior?: string;
  colonia?: string;
  codigo_postal?: string;
  ciudad?: string;
  pais?: string;
  estado?: string;
  localidad?: string;
  municipio?: string;
  rfc?: string;
  curp?: string;
  aplica_retenciones?: boolean;
  desglosar_ieps?: boolean;
  numero_precio?: string;
  limite_credito?: string | number | null;
  dias_credito?: number | null;
  notas?: string;
  descuento_pct?: string | number | null;

  portal_web?: string;
  nombre_facturacion?: string;
  numero_facturacion?: string;
  domicilio_facturacion?: string;

  calle_envio?: string;
  numero_envio?: string;
  colonia_envio?: string;
  codigo_postal_envio?: string;
  pais_envio?: string;
  estado_envio?: string;
  ciudad_envio?: string;
  tipo?: 'EMPRESA' | 'PERSONA_FISICA' | 'PROVEEDOR';
  is_prospecto?: boolean;
  clave?: string;
  representante?: string;
  celular?: string;
  idcif?: string;
  curp_fiscal?: string;
  regimen_fiscal?: string;
  uso_cfdi?: string;

  contactos?: ClienteContacto[];
  documento?: ClienteDocumento | null;
}

type ClienteContacto = {
  id?: number;
  cliente?: number;
  nombre_apellido: string;
  titulo: string;
  area_puesto: string;
  celular: string;
  correo: string;
  is_principal?: boolean;
};

type ClienteDocumento = {
  id: number;
  cliente: number;
  url: string;
  public_id: string;
  nombre_original: string;
  size_bytes: number | null;
};

const trimOrEmpty = (value: unknown) => String(value ?? "").trim();

const getTipoLabel = (tipo?: ClienteTipo) =>
  TIPO_OPTIONS.find((o) => o.value === tipo)?.label || tipo || "—";

const CLIENTES_MAP_CONTAINER_ID = "clientes-leaflet-map";

type ClientesPageProps = {
  fixedTipo?: ClienteTipo;
};

const ClientesPage = ({ fixedTipo }: ClientesPageProps) => {
  const { permissions } = useAuth();
  const viewPlural = fixedTipo === 'EMPRESA'
    ? 'Empresas'
    : fixedTipo === 'PROVEEDOR'
      ? 'Proveedores'
      : fixedTipo === 'PERSONA_FISICA'
        ? 'Personas Físicas'
        : 'Clientes';

  const viewSingular = fixedTipo === 'EMPRESA'
    ? 'Empresa'
    : fixedTipo === 'PROVEEDOR'
      ? 'Proveedor'
      : fixedTipo === 'PERSONA_FISICA'
        ? 'Persona Física'
        : 'Cliente';

  const nombreColHeader = fixedTipo === 'EMPRESA'
    ? 'Empresa'
    : fixedTipo === 'PROVEEDOR'
      ? 'Proveedor'
      : fixedTipo === 'PERSONA_FISICA'
        ? 'Persona'
        : 'Empresa';

  const canClientesView = permissions?.clientes?.view === true;
  const canClientesCreate = permissions?.clientes?.create === true;
  const canClientesEdit = permissions?.clientes?.edit === true;
  const canClientesDelete = permissions?.clientes?.delete === true;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const clientesFetchInFlightRef = useRef(false);
  const lastClientesFetchKeyRef = useRef<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  // Form state
  const [activeTab, setActiveTab] = useState<"general" | "more">("general");
  const [modalError, setModalError] = useState<string>("");

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [formData, setFormData] = useState<Record<string, unknown>>(emptyFormData(fixedTipo));

  useEffect(() => {
    if (!fixedTipo) return;
    setFormData((prev) => ({ ...prev, tipo: fixedTipo }));

  }, [fixedTipo]);

  const fetchClientes = async (page = 1, search = "") => {
    if (!canClientesView) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: "20",
        search: search.trim(),
      });
      if (fixedTipo) params.set("tipo", fixedTipo);
      const res = await fetchApi(`/api/clientes/?${params.toString()}`);
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (!res.ok) { setClientes([]); setTotalCount(0); return; }
      const rows = Array.isArray(data) ? data : (data.results || []);
      setClientes(rows);
      setTotalCount(data.count ?? rows.length);
    } catch {
      setClientes([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canClientesView) {
      setLoading(false);
      return;
    }
    const key = `${currentPage}::${debouncedSearch.trim()}::${fixedTipo || ''}`;
    if (clientesFetchInFlightRef.current && lastClientesFetchKeyRef.current === key) return;
    lastClientesFetchKeyRef.current = key;
    clientesFetchInFlightRef.current = true;
    Promise.resolve(fetchClientes(currentPage, debouncedSearch)).finally(() => {
      clientesFetchInFlightRef.current = false;
    });
  }, [canClientesView, currentPage, debouncedSearch, fixedTipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingCliente && !canClientesCreate) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }

    if (editingCliente && !canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }

    const missingFields: string[] = [];
    if (!trimOrEmpty(formData.nombre)) missingFields.push("Nombre");
    if (!trimOrEmpty(formData.telefono) || !onlyDigits10(String(formData.telefono || ""))) {
      missingFields.push("Teléfono (10 dígitos)");
    }

    if (missingFields.length > 0) {
      setModalError(`Campos requeridos faltantes: ${missingFields.join(", ")}`);
      return;
    }

    const url = editingCliente ? `/api/clientes/${editingCliente.id}/` : "/api/clientes/";
    const method = editingCliente ? "PUT" : "POST";
    const clienteNombre = String(formData.nombre || "");
    const isEditing = !!editingCliente;

    try {
      const response = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildClientePayload(formData, fixedTipo)),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        setModalError(formatApiErrors(txt) || 'No se pudo guardar el cliente.');
        return;
      }

      const saved = await response.json().catch(() => null);
      const clienteId = saved?.id || editingCliente?.id;
      if (!clienteId) {
        setModalError('No se pudo obtener el ID del cliente guardado.');
        return;
      }

      await fetchClientes();
      setShowModal(false);
      setFormData(emptyFormData(fixedTipo));
      setActiveTab("general");
      setEditingCliente(null);

      setAlert({
        show: true,
        variant: 'success',
        title: isEditing ? 'Cliente Actualizado' : 'Cliente Creado',
        message: isEditing
          ? `El cliente "${clienteNombre}" ha sido actualizado exitosamente.`
          : `El cliente "${clienteNombre}" ha sido creado exitosamente.`,
      });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setModalError(String(error));
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    if (!canClientesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setClienteToDelete(cliente);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    try {
      const response = await fetchApi(`/api/clientes/${clienteToDelete.id}/`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchClientes();
        setShowDeleteModal(false);
        setAlert({
          show: true,
          variant: "success",
          title: "Cliente Eliminado",
          message: `El cliente "${clienteToDelete?.nombre}" ha sido eliminado exitosamente.`
        });
        setClienteToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setClienteToDelete(null);
  };

  const handleEdit = (cliente: Cliente) => {
    if (!canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingCliente(cliente);
    setModalError("");
    setActiveTab("general");
    setFormData(formDataFromCliente(cliente as Parameters<typeof formDataFromCliente>[0], fixedTipo));
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setModalError("");
    setActiveTab("general");
    setFormData(emptyFormData(fixedTipo));
  };

  const openCreate = () => {
    setEditingCliente(null);
    setModalError("");
    setActiveTab("general");
    setFormData(emptyFormData(fixedTipo));
    setShowModal(true);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClientes = clientes;



  const handleConfirmMap = () => {
    if (!selectedLocation) {
      setShowMapModal(false);
      return;
    }
    const { lat, lng } = selectedLocation;
    setFormData({ ...formData, direccion: `https://www.google.com/maps?q=${lat},${lng}` });
    setShowMapModal(false);
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]" style={claudeSansStyle}>
        <PageMeta
          title={`${viewPlural} | Sistema Grupo Intrax GPS`}
          description={`Gestión de ${viewPlural.toLowerCase()} para el sistema de administración Grupo Intrax GPS`}
        />

        {alert.show && (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
          />
        )}

        {!canClientesView ? (
          <div className="rounded-3xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-10 text-center text-sm text-[#57534e] shadow-[0_20px_50px_-36px_rgba(28,25,23,0.2)] dark:border-[#273244] dark:bg-[#111827]/80 dark:text-[#b7c1d1] sm:px-6">
            No tienes permiso para ver {viewPlural}.
          </div>
        ) : (
          <>
            <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]" aria-label="Migas de pan">
              <Link to="/" className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white">
                Inicio
              </Link>
              <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
                /
              </span>
              <span className="text-[#44403c] dark:text-[#cbd5e1]">{viewPlural}</span>
            </nav>

            <header className={`relative flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
              <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
              <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">
                    Contactos de negocio
                  </p>
                  <h1 className={`mt-0.5 ${claudeHeroHeadingClass}`}>{viewPlural}</h1>
                  <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                    Consulta, crea y edita registros con{" "}
                    <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">contactos</span>, dirección y datos fiscales.
                  </p>
                  <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
                </div>
              </div>
            </header>

            <div className="grid w-full grid-cols-1 gap-2 sm:gap-3 lg:max-w-md">
              <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                      <path d="M20 22a8 8 0 1 0-16 0" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]">
                      Total {viewPlural}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-xl">{totalCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
              <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b] sm:left-3.5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Buscar ${viewPlural.toLowerCase()}...`}
                  className={searchInputClass}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!canClientesCreate) {
                    setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear clientes." });
                    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
                    return;
                  }
                  openCreate();
                }}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-sm font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:brightness-95 sm:w-auto sm:min-h-0 lg:shrink-0"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nuevo {viewSingular}
              </button>
            </div>

            <div className="mt-1">
              <ComponentCard
                compact
                title={`Listado de ${viewPlural.toLowerCase()}`}
                desc="En pantallas pequeñas desplázate horizontalmente para ver todas las columnas."
                className="overflow-hidden border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
              >
                <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:hidden">
                  <span className="inline-block h-px w-4 bg-[#ea580c]/70 dark:bg-[#fb923c]/70" aria-hidden />
                  Desliza horizontalmente para ver el listado completo
                </p>
                <div className="-mx-1 overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6]/90 dark:border-[#273244] dark:bg-[#0f172a]/50 sm:mx-0 sm:bg-transparent sm:dark:bg-transparent">
                  <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] px-1 pb-1 sm:px-0 sm:pb-0">
                    <Table className="w-full min-w-[920px] table-fixed sm:min-w-0 xl:min-w-full">
                      <TableHeader className="sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fcfaf6]/95 text-[11px] font-semibold text-[#1c1917] dark:border-[#334155] dark:bg-[#111a2b]/95 dark:text-[#f8fafc]">
                        <TableRow>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[64px] text-gray-700 dark:text-gray-300">ID</TableCell>
                          {!fixedTipo && (
                            <TableCell isHeader className="px-1.5 py-1 text-left w-[110px] text-gray-700 dark:text-gray-300">Tipo</TableCell>
                          )}
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[170px] text-gray-700 dark:text-gray-300">{nombreColHeader}</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[120px] text-gray-700 dark:text-gray-300">Ciudad</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[120px] text-gray-700 dark:text-gray-300">Teléfono</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[160px] text-gray-700 dark:text-gray-300">Contacto</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-left w-[210px] text-gray-700 dark:text-gray-300">Dirección</TableCell>
                          <TableCell isHeader className="px-1.5 py-1 text-center w-[96px] text-gray-700 dark:text-gray-300">Acciones</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-[#f5f0e8] text-[12px] text-[#44403c] dark:divide-[#334155]/80 dark:text-[#e5e7eb]">
                        {loading ? (
                          <TableRow>
                            <TableCell className="px-1.5 py-3" colSpan={fixedTipo ? 7 : 8}>Cargando...</TableCell>
                          </TableRow>
                        ) : currentClientes.length === 0 ? (
                          <TableRow>
                            <TableCell className="px-1.5 py-2" colSpan={fixedTipo ? 7 : 8}>
                              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No hay {viewPlural.toLowerCase()}.</div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentClientes.map((cliente) => (
                            <TableRow key={cliente.id} className="transition-colors hover:bg-[#fffdf8] dark:hover:bg-[#1e293b]/50">
                              <TableCell className="px-1.5 py-1 whitespace-nowrap tabular-nums font-semibold text-gray-900 dark:text-white">{cliente.idx}</TableCell>
                              {!fixedTipo && (
                                <TableCell className="px-1.5 py-1 whitespace-nowrap text-[11px] text-[#57534e] dark:text-[#cbd5e1]">
                                  {getTipoLabel(cliente.tipo)}
                                </TableCell>
                              )}
                              <TableCell className="px-1.5 py-1 text-gray-900 dark:text-white truncate">
                                <span className="block truncate" title={cliente.nombre}>{cliente.nombre}</span>
                              </TableCell>
                              <TableCell className="px-1.5 py-1 whitespace-nowrap">
                                {(() => {
                                  const ciudad = cliente.ciudad || '';
                                  const estado = cliente.estado || '';
                                  if (!ciudad && !estado) return <span className="text-gray-500">-</span>;
                                  return (
                                    <div className="leading-tight">
                                      <div className="text-gray-900 dark:text-white truncate" title={ciudad || ''}>{ciudad || '-'}</div>
                                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={estado || ''}>{estado || '-'}</div>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="px-1.5 py-1 whitespace-nowrap">
                                <a href={`tel:${cliente.telefono}`} className="text-[#ff801f] hover:text-[#ff6a00] dark:text-[#ffa057] dark:hover:text-[#ffb174] hover:underline">
                                  {cliente.telefono}
                                </a>
                              </TableCell>
                              <TableCell className="px-1.5 py-1">
                                {(() => {
                                  const principal = (cliente.contactos || []).find((c) => c.is_principal) || (cliente.contactos || [])[0];
                                  const nombre =
                                    String(cliente.representante || "").trim() ||
                                    String(principal?.nombre_apellido || "").trim();
                                  const correo =
                                    String(cliente.correo || "").trim() ||
                                    String(principal?.correo || "").trim();
                                  if (!nombre && !correo) return <span className="text-gray-500">-</span>;
                                  return (
                                    <div className="leading-tight">
                                      <div className="text-gray-900 dark:text-white truncate" title={nombre || ''}>{nombre || '-'}</div>
                                      {correo ? (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={correo}>{correo}</div>
                                      ) : (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400">-</div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="px-1.5 py-1">
                                {isGoogleMapsLink(cliente.direccion) ? (
                                  <a
                                    href={cliente.direccion}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[#ff801f] dark:text-[#ffa057] hover:underline"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Ver ubicación
                                  </a>
                                ) : (
                                  <span className="block truncate" title={cliente.direccion}>{cliente.direccion}</span>
                                )}
                              </TableCell>
                              <TableCell className="px-1.5 py-1 text-center">
                                <div className="inline-flex items-center gap-1 rounded-lg border border-[#e7ded0]/80 bg-[#fcfaf6] px-1.5 py-1 dark:border-[#334155] dark:bg-[#0f172a]/80">
                                  {canClientesEdit && (
                                    <button
                                      onClick={() => handleEdit(cliente)}
                                      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-[#ff801f]/50 hover:text-[#ff801f] active:scale-[0.97] dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-[#ff801f]/50 sm:h-7 sm:w-7 sm:rounded"
                                      title="Editar"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canClientesDelete && (
                                    <button
                                      onClick={() => handleDeleteClick(cliente)}
                                      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-error-400 hover:text-error-600 active:scale-[0.97] dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-error-500 sm:h-7 sm:w-7 sm:rounded"
                                      title="Eliminar"
                                    >
                                      <TrashBinIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Paginación */}
                {!loading && totalCount > 0 && currentClientes.length > 0 && (
                  <div className="border-t border-[#e7ded0] px-4 py-3 dark:border-[#334155]/80 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrando <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{Math.min(endIndex, totalCount)}</span> de{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> clientes
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* First Page */}
                          {currentPage > 3 && (
                            <>
                              <button
                                onClick={() => setCurrentPage(1)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white dark:border-[#334155] dark:bg-[#111a2b] text-sm font-medium text-gray-700 dark:text-[#f0f0f0] hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                              >
                                1
                              </button>
                              {currentPage > 4 && <span className="px-1 text-gray-400">...</span>}
                            </>
                          )}

                          {/* Page Numbers */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              if (totalPages <= 5) return true;
                              return Math.abs(page - currentPage) <= 2;
                            })
                            .map(page => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === page
                                  ? 'border-[#ff801f]/30 bg-[#ff801f] text-black'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}

                          {/* Last Page */}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && <span className="px-1 text-gray-400">...</span>}
                              <button
                                onClick={() => setCurrentPage(totalPages)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </ComponentCard>
            </div>

          </>
        )}

        {/* Modal Crear/Editar */}
        <Modal
          mobileBottomSheet
          isOpen={showModal}
          onClose={handleCloseModal}
          closeOnBackdropClick={false}
          ariaLabel="Formulario de cliente"
          className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b]"
        >
          <div className="bg-[#fffdfa] dark:bg-[#111a2b]">
            <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-none dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:pr-16">
              <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z" fill="currentColor" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className={sectionLabelClass}>Contactos · {viewPlural}</p>
                  <h3 className={`mt-1 ${claudeSectionHeadingClass}`}>
                    {editingCliente ? `Editar ${viewSingular}` : `Nuevo ${viewSingular}`}
                  </h3>
                  <p className={claudeCaptionClass}>
                    Captura y revisa los datos antes de guardar
                  </p>
                </div>
              </div>
            </header>

            {/* Body */}
            <form onSubmit={handleSubmit} className="custom-scrollbar max-h-[78vh] space-y-4 overflow-y-auto p-4 sm:p-5">
              {modalError && (
                <Alert
                  variant={String(modalError).startsWith('Campos requeridos faltantes:') ? 'warning' : 'error'}
                  title={String(modalError).startsWith('Campos requeridos faltantes:') ? 'Faltan campos' : 'Error'}
                  message={modalError}
                  showLink={false}
                />
              )}

              <ClienteSimplifiedFormFields
                formData={formData}
                setFormData={setFormData}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                fixedTipo={fixedTipo}
                editingCliente={editingCliente}
                onOpenMap={() => setShowMapModal(true)}
              />

              {/* Footer Buttons */}
              <div className="sticky bottom-[-1rem] z-20 -mx-4 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 shadow-[0_-10px_24px_-20px_rgba(28,25,23,0.55)] before:absolute before:-bottom-3 before:left-0 before:h-3 before:w-full before:bg-[#fcfaf6] before:content-[''] dark:border-[#334155] dark:bg-[#0f172a] dark:before:bg-[#0f172a] sm:-mx-5 sm:bottom-[-1.25rem] sm:px-5">
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                    </svg>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] bg-[#ff801f] text-black hover:bg-[#ff6a00] focus:ring-2 focus:ring-[#ff801f]/30"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 12l4 4L19 6" strokeLinecap="round" />
                    </svg>
                    {editingCliente ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        <ClienteMapPickerModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          mapContainerId={CLIENTES_MAP_CONTAINER_ID}
          direccion={String(formData.direccion || "")}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          onConfirm={handleConfirmMap}
          onMapError={(message) => {
            setAlert({ show: true, variant: "error", title: "Error de mapa", message });
            setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
          }}
        />

        {/* Modal de Confirmación de Eliminación */}
        {
          clienteToDelete && (
            <Modal
              mobileBottomSheet
              isOpen={showDeleteModal}
              onClose={handleCancelDelete}
              ariaLabel="Confirmar eliminación de cliente"
              className="w-[94vw] max-w-md overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b]"
            >
              <div>
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Eliminar {viewSingular}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Esta acción no se puede deshacer
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ¿Estás seguro de que deseas eliminar al cliente{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {clienteToDelete.nombre}
                    </span>
                    ?
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20">
                    <p className="text-xs text-red-800 dark:text-red-300">
                      <strong>Advertencia:</strong> Todos los datos asociados a este cliente serán eliminados permanentemente.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[#e7ded0] bg-[#fcfaf6] px-6 py-4 dark:border-[#273244] dark:bg-[#0f172a]/70">
                  <button
                    onClick={handleCancelDelete}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:border-[#334155] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </Modal>
          )
        }
      </div>
    </div>
  );
};

export default ClientesPage;