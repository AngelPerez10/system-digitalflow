import { useState, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import PageMeta from "@/components/common/PageMeta";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { TrashBinIcon } from "@/icons";
import { onlyDigits10 } from "./clientesCatalogos";
import { ClienteSimplifiedFormFields } from "@/components/clientes/ClienteSimplifiedFormFields";
import { ClienteMapPickerModal } from "@/components/clientes/ClienteMapPickerModal";
import {
  type ClienteFormTab,
  type ClienteTipo,
  TIPO_OPTIONS,
  buildClientePayload,
  emptyFormData,
  formatApiErrors,
  formDataFromCliente,
  isGoogleMapsLink,
  upsertClienteContactoFromForm,
} from "@/components/clientes/clienteFormShared";

/* --------------------------------------------------------------------------
   Mismo sistema que `Perfil/ProfilePage`, `Configuracion/*` y `MiEscritorio/
   Tareas`: marino + dorado sobre lienzo blanco, azul eléctrico como único
   acento de acción, líneas de 1 px. En oscuro, la familia slate del
   contenedor de la app (lienzo #0f172a → panel #111827 → tarjeta hundida
   #1B2539).
   -------------------------------------------------------------------------- */

const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const panelClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

const sunkenCardClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

const searchInputClass =
  "h-12 w-full rounded-[10px] border border-[#E7E7EA] bg-white pl-10 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:h-11";

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] max-sm:w-full sm:h-11";

const secondaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:w-full sm:h-11";

const dangerBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full sm:h-11";

const actionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

const actionDangerBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#C22B2B]/50 hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C22B2B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#F87171]/50 dark:hover:text-[#F87171]";

const pagerBtnClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#09090B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048]";

/* --- Sistema de modales — cascarón blanco, cabecera marina, cuerpo en
   lienzo y pie hundido con las acciones ancladas. --- */
const modalShellClass =
  "flex max-h-[min(92vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

const modalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

const modalHeaderClass = "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";
const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";
const modalEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";
const modalTitleClass = "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";
const modalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";
const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";

type AlertVariant = "success" | "error" | "warning" | "info";

const alertTone: Record<AlertVariant, { border: string; bg: string; dot: string; title: string; msg: string }> = {
  success: {
    border: "border-[#BFE6D4] dark:border-[#1E5A42]",
    bg: "bg-[#E9F8F0] dark:bg-[#0F2A1C]",
    dot: "bg-[#04724D] dark:bg-[#4ADE80]",
    title: "text-[#04724D] dark:text-[#4ADE80]",
    msg: "text-[#04724D]/85 dark:text-[#4ADE80]/80",
  },
  error: {
    border: "border-[#F6CFCF] dark:border-[#7F1D1D]",
    bg: "bg-[#FEF2F2] dark:bg-[#3F1518]",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    title: "text-[#C22B2B] dark:text-[#F87171]",
    msg: "text-[#C22B2B]/85 dark:text-[#F87171]/80",
  },
  warning: {
    border: "border-[rgba(230,162,60,0.4)] dark:border-[rgba(230,162,60,0.3)]",
    bg: "bg-[rgba(230,162,60,0.10)] dark:bg-[rgba(230,162,60,0.10)]",
    dot: "bg-[#9A6B15] dark:bg-[#E6A23C]",
    title: "text-[#9A6B15] dark:text-[#E6A23C]",
    msg: "text-[#9A6B15]/85 dark:text-[#E6A23C]/85",
  },
  info: {
    border: "border-[rgba(27,92,255,0.28)] dark:border-[rgba(75,124,255,0.3)]",
    bg: "bg-[rgba(27,92,255,0.06)] dark:bg-[rgba(75,124,255,0.10)]",
    dot: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    title: "text-[#1B5CFF] dark:text-[#4B7CFF]",
    msg: "text-[#1B5CFF]/85 dark:text-[#4B7CFF]/85",
  },
};

function InlineAlert({ variant, title, message }: { variant: AlertVariant; title: string; message: string }) {
  const tone = alertTone[variant];
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 ${tone.border} ${tone.bg}`}
    >
      <span className={`mt-1.5 size-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      <div className="min-w-0">
        <p className={`text-[15px] font-medium ${tone.title}`}>{title}</p>
        <p className={`mt-0.5 text-[13px] ${tone.msg}`}>{message}</p>
      </div>
    </div>
  );
}

function RowActions({
  name,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  name: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canEdit && !canDelete) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]">
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className={actionBtnClass}
          title="Editar"
          aria-label={`Editar ${name}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
          </svg>
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className={actionDangerBtnClass}
          title="Eliminar"
          aria-label={`Eliminar ${name}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="m6 6 1 14h10l1-14" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

const iconSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

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
  const { permissions, isAdmin } = useAuth();
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

  const canClientesView = isAdmin || permissions?.clientes?.view === true;
  const canClientesCreate = isAdmin || permissions?.clientes?.create === true;
  const canClientesEdit = isAdmin || permissions?.clientes?.edit === true;
  const canClientesDelete = isAdmin || permissions?.clientes?.delete === true;

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
    variant: AlertVariant;
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  // Form state
  const [activeTab, setActiveTab] = useState<ClienteFormTab>("general");
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

      try {
        await upsertClienteContactoFromForm(Number(clienteId), formData);
      } catch (contactError) {
        setModalError(
          contactError instanceof Error
            ? contactError.message
            : "El cliente se guardó, pero no se pudo guardar el contacto."
        );
        await fetchClientes();
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
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1400px]" style={sheetFontStyle}>
        <PageMeta
          title={`${viewPlural} | Sistema Grupo Intrax GPS`}
          description={`Gestión de ${viewPlural.toLowerCase()} para el sistema de administración Grupo Intrax GPS`}
        />

        {alert.show && (
          <div className="mb-4">
            <InlineAlert variant={alert.variant} title={alert.title} message={alert.message} />
          </div>
        )}

        {!canClientesView ? (
          <div className={`${sunkenCardClass} px-4 py-10 text-center text-[15px] text-[#52525B] dark:text-[#B7C1D1] sm:px-6`}>
            No tienes permiso para ver {viewPlural}.
          </div>
        ) : (
          <>
            <nav
              className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]"
              aria-label="Migas de pan"
            >
              <Link
                to="/"
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
              >
                Inicio
              </Link>
              <span aria-hidden className="text-[#D3D3D8] dark:text-[#3A4661]">
                /
              </span>
              <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">{viewPlural}</span>
            </nav>

            <div className="space-y-5">
              {/* Banda marina de cabecera con el conteo total. */}
              <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
                <div
                  className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                        <path fillRule="evenodd" clipRule="evenodd" d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z" fill="currentColor" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z" fill="currentColor" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Contactos de negocio</p>
                      <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                        {viewPlural}
                      </h1>
                      <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                        Consulta, crea y edita registros con contactos, dirección y datos fiscales.
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex h-[3.25rem] shrink-0 items-center gap-3 self-start rounded-[16px] bg-white/10 px-4 lg:self-center">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/10 text-[#E6A23C]">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                        <path d="M20 22a8 8 0 1 0-16 0" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">Total {viewPlural}</p>
                      <p className="text-[18px] font-semibold tabular-nums leading-none text-white">{totalCount}</p>
                    </div>
                  </div>
                </div>
              </header>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <svg {...iconSvgProps} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Buscar ${viewPlural.toLowerCase()}…`}
                    className={searchInputClass}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Limpiar búsqueda"
                      className="absolute inset-y-0 right-0 my-1.5 mr-1.5 inline-flex h-8 min-w-[32px] items-center justify-center rounded-[8px] text-[#A1A1AA] transition-colors hover:bg-[#FAFAFA] hover:text-[#52525B] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC]"
                    >
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
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
                  className={primaryBtnClass}
                >
                  <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nuevo {viewSingular}
                </button>
              </div>

              <section className={panelClass} aria-labelledby="clientes-list-heading">
                <div className="border-b border-[#E7E7EA] px-5 py-4 dark:border-[#273244] sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg {...iconSvgProps} className="size-4">
                        <rect x="3" y="4" width="18" height="17" rx="2.2" />
                        <path d="M3 9.5h18" />
                      </svg>
                    </span>
                    <h2 id="clientes-list-heading" className={sectionLabelClass}>
                      Listado de {viewPlural.toLowerCase()}
                    </h2>
                  </div>
                  <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
                    En pantallas pequeñas desplázate horizontalmente para ver todas las columnas.
                  </p>
                </div>

                <div className="p-2 sm:p-3">
                  <div className="overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]">
                    <Table className="w-full min-w-[820px] sm:min-w-0 xl:min-w-full">
                      <TableHeader className="sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]">
                        <TableRow>
                          <TableCell isHeader className="px-3 py-2 text-left w-[64px] text-[#52525B] dark:text-[#B7C1D1]">ID</TableCell>
                          {!fixedTipo && (
                            <TableCell isHeader className="px-3 py-2 text-left w-[110px] text-[#52525B] dark:text-[#B7C1D1]">Tipo</TableCell>
                          )}
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[180px] max-w-[280px] text-[#52525B] dark:text-[#B7C1D1]">{nombreColHeader}</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-[#52525B] dark:text-[#B7C1D1]">Ciudad</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-[#52525B] dark:text-[#B7C1D1]">Teléfono</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[160px] max-w-[220px] text-[#52525B] dark:text-[#B7C1D1]">Contacto</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[180px] max-w-[280px] text-[#52525B] dark:text-[#B7C1D1]">Dirección</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-center w-[100px] text-[#52525B] dark:text-[#B7C1D1]">Acción</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-[#EDEDED] text-[12px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb]">
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={fixedTipo ? 7 : 8} className="px-3 py-8 text-center text-[#6E6E77] dark:text-[#8EA0B8]">
                              <div className="inline-flex items-center gap-2 text-[15px]">
                                <svg {...iconSvgProps} className="h-4.5 w-4.5 animate-spin" strokeWidth={2}>
                                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Cargando…
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : currentClientes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={fixedTipo ? 7 : 8} className="px-3 py-10 text-center text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]">
                              No hay {viewPlural.toLowerCase()}.
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentClientes.map((cliente) => (
                            <TableRow key={cliente.id} className="hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                              <TableCell className="px-3 py-2 w-[64px] whitespace-nowrap font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{cliente.idx}</TableCell>
                              {!fixedTipo && (
                                <TableCell className="px-3 py-2 w-[110px] whitespace-nowrap">
                                  {getTipoLabel(cliente.tipo)}
                                </TableCell>
                              )}
                              <TableCell className="max-w-[280px] min-w-[180px] overflow-hidden px-3 py-2">
                                <span className="block truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={cliente.nombre}>{cliente.nombre}</span>
                              </TableCell>
                              <TableCell className="px-3 py-2 w-[120px]">
                                {(() => {
                                  const ciudad = cliente.ciudad || '';
                                  const estado = cliente.estado || '';
                                  if (!ciudad && !estado) return <span className="text-[#A1A1AA]">—</span>;
                                  return (
                                    <div className="leading-tight">
                                      <div className="truncate text-[#09090B] dark:text-[#F8FAFC]" title={ciudad || undefined}>{ciudad || "—"}</div>
                                      <div className="truncate text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]" title={estado || undefined}>{estado || "—"}</div>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap">
                                <a href={`tel:${cliente.telefono}`} className="font-medium text-[#1B5CFF] hover:underline dark:text-[#4B7CFF]">
                                  {cliente.telefono}
                                </a>
                              </TableCell>
                              <TableCell className="max-w-[220px] min-w-[160px] overflow-hidden px-3 py-2">
                                {(() => {
                                  const principal = (cliente.contactos || []).find((c) => c.is_principal) || (cliente.contactos || [])[0];
                                  const nombre =
                                    String(cliente.representante || "").trim() ||
                                    String(principal?.nombre_apellido || "").trim();
                                  const correo =
                                    String(cliente.correo || "").trim() ||
                                    String(principal?.correo || "").trim();
                                  if (!nombre && !correo) return <span className="text-[#A1A1AA]">—</span>;
                                  return (
                                    <div className="leading-tight">
                                      <div className="truncate text-[#09090B] dark:text-[#F8FAFC]" title={nombre || undefined}>{nombre || "—"}</div>
                                      {correo ? (
                                        <div className="truncate text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]" title={correo}>{correo}</div>
                                      ) : (
                                        <div className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">—</div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="max-w-[280px] min-w-[180px] overflow-hidden px-3 py-2">
                                {isGoogleMapsLink(cliente.direccion) ? (
                                  <a
                                    href={cliente.direccion}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-semibold text-[#1B5CFF] hover:underline dark:text-[#4B7CFF]"
                                  >
                                    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Ver ubicación
                                  </a>
                                ) : (
                                  <span className="block truncate" title={cliente.direccion || undefined}>
                                    {cliente.direccion || <span className="text-[#A1A1AA]">—</span>}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-center w-[100px]">
                                <RowActions
                                  name={cliente.nombre}
                                  canEdit={canClientesEdit}
                                  canDelete={canClientesDelete}
                                  onEdit={() => handleEdit(cliente)}
                                  onDelete={() => handleDeleteClick(cliente)}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {!loading && totalCount > 0 && currentClientes.length > 0 && (
                  <div className="border-t border-[#E7E7EA] px-4 py-3 dark:border-[#273244] sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        Mostrando <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{startIndex + 1}</span> a{" "}
                        <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{Math.min(endIndex, totalCount)}</span> de{" "}
                        <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{totalCount}</span> {viewPlural.toLowerCase()}
                      </p>

                      <div className="flex min-w-0 items-center gap-2 overflow-x-auto" role="navigation" aria-label={`Paginación de ${viewPlural.toLowerCase()}`}>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className={pagerBtnClass}
                          aria-label="Página anterior"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>

                        <div className="flex items-center gap-1">
                          {currentPage > 3 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                className={pagerBtnClass}
                                aria-label="Ir a la página 1"
                              >
                                1
                              </button>
                              {currentPage > 4 && <span className="px-1 text-[#A1A1AA]" aria-hidden>…</span>}
                            </>
                          )}

                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              if (totalPages <= 5) return true;
                              return Math.abs(page - currentPage) <= 2;
                            })
                            .map(page => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                aria-label={`Ir a la página ${page}`}
                                aria-current={currentPage === page ? "page" : undefined}
                                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] ${currentPage === page
                                  ? 'border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]'
                                  : 'border-[#E7E7EA] bg-white text-[#09090B] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:bg-white/[0.06]'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}

                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && <span className="px-1 text-[#A1A1AA]" aria-hidden>…</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                className={pagerBtnClass}
                                aria-label={`Ir a la página ${totalPages}`}
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className={pagerBtnClass}
                          aria-label="Página siguiente"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
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
          className={modalShellClass}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <header className={modalHeaderClass}>
              <div className="flex min-w-0 items-start gap-3.5">
                <span className={modalHeaderIconClass}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z" fill="currentColor" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className={modalEyebrowClass}>Contactos · {viewPlural}</p>
                  <h3 className={`mt-1 ${modalTitleClass}`}>
                    {editingCliente ? `Editar ${viewSingular}` : `Nuevo ${viewSingular}`}
                  </h3>
                  <p className={modalSubtitleClass}>Captura y revisa los datos antes de guardar.</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
              <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-white p-4 dark:bg-[#111827] sm:p-6">
                {modalError && (
                  <InlineAlert
                    variant={String(modalError).startsWith('Campos requeridos faltantes:') ? 'warning' : 'error'}
                    title={String(modalError).startsWith('Campos requeridos faltantes:') ? 'Faltan campos' : 'Error'}
                    message={modalError}
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
              </div>

              <div className={modalFooterClass}>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button type="button" onClick={handleCloseModal} className={secondaryBtnClass}>
                    Cancelar
                  </button>
                  <button type="submit" className={primaryBtnClass}>
                    <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
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

        {/* Modal de confirmación de eliminación */}
        {clienteToDelete && (
          <Modal
            mobileBottomSheet
            isOpen={showDeleteModal}
            onClose={handleCancelDelete}
            ariaLabel="Confirmar eliminación de cliente"
            className={modalSmallShellClass}
          >
            <div className="bg-white p-6 dark:bg-[#111827]">
              <div className="mb-5 flex items-start gap-3.5">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
                  <svg {...iconSvgProps} className="size-5">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 16h10l1-16" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                    Eliminar {viewSingular}
                  </h3>
                  <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
                </div>
              </div>

              <p className="text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
                ¿Estás seguro de que deseas eliminar al {viewSingular.toLowerCase()}{" "}
                <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{clienteToDelete.nombre}</span>?
              </p>
              <div className="mt-3 rounded-[12px] border border-[#F6CFCF] bg-[#FEF2F2] p-3 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                <p className="text-[13px] text-[#C22B2B] dark:text-[#F87171]">
                  <strong>Advertencia:</strong> todos los datos asociados a este registro se eliminarán permanentemente.
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button onClick={handleCancelDelete} className={secondaryBtnClass}>
                  Cancelar
                </button>
                <button onClick={handleConfirmDelete} className={dangerBtnClass}>
                  <TrashBinIcon className="size-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ClientesPage;
