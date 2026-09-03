import { useEffect, useState } from "react";
import type { DropzoneRootProps, DropzoneInputProps } from "react-dropzone";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import DatePicker from "@/components/form/date-picker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { TimeIcon } from "@/icons";
import { Cliente } from "@/types/cliente";
import { ORDEN_BASE_MAX_FOTOS, type FotosExtraMax, type Usuario } from "../../shared/ordenesPageTypes";
import {
  OrdenPhotoDeleteModal,
  OrdenPhotoPreviewModal,
} from "../../../OrdenTrabajoModals";
import type { OrdenFormData } from "../useOrdenFormDraft";
import { formatOrdenPhotoProgress } from "../../shared/ordenImageUpload";
import {
  ClearSelectionButton,
  openDireccionInMaps,
  type OrdenFieldKey,
} from "./ordenTabHelpers";

export type OrdenClienteTabProps = {
  variant: "admin" | "tecnico";
  panelId: string;
  labelledBy: string;
  editingOrden: { id?: number } | null;
  formData: OrdenFormData;
  setFormData: React.Dispatch<React.SetStateAction<OrdenFormData>>;
  ro: (field: OrdenFieldKey) => boolean;
  inputLockedClass: (field: OrdenFieldKey) => string;
  clienteActions: unknown[];
  clienteSearch: string;
  setClienteSearch: (q: string) => void;
  clientes: Cliente[];
  selectCliente: (c: Cliente | null) => void;
  setShowClienteModal: (open: boolean) => void;
  tecnicoActions: unknown[];
  tecnicoSearch: string;
  setTecnicoSearch: (q: string) => void;
  quienInstaloActions: unknown[];
  quienInstaloSearch: string;
  setQuienInstaloSearch: (q: string) => void;
  quienEntregoActions: unknown[];
  quienEntregoSearch: string;
  setQuienEntregoSearch: (q: string) => void;
  usuarios: Usuario[];
  selectTecnico: (u: Usuario | null) => void;
  selectQuienInstalo: (u: Usuario | null) => void;
  selectQuienEntrego: (u: Usuario | null) => void;
  setFirmaClienteUrl: (signature: string) => void;
  setShowMapModal: (open: boolean) => void;
  tecnicoSignatureUrl: string;
  maxPhotosAllowed: number;
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  isDragActive: boolean;
  photoPreview: { open: boolean; url: string | null; index: number };
  setPhotoPreview: (v: { open: boolean; url: string | null; index: number }) => void;
  confirmDelete: { open: boolean; index: number | null; url: string | null };
  setConfirmDelete: (v: { open: boolean; index: number | null; url: string | null }) => void;
  confirmDeletePhoto: (index: number, url: string) => void | Promise<void>;
  deletingPhoto: boolean;
  uploadingPhotos?: boolean;
  photoUploadProgress?: { done: number; total: number } | null;
};

export function OrdenClienteTab({
  variant,
  panelId,
  labelledBy,
  editingOrden,
  formData,
  setFormData,
  ro,
  inputLockedClass,
  clienteActions,
  clienteSearch,
  setClienteSearch,
  clientes,
  selectCliente,
  setShowClienteModal,
  tecnicoActions,
  tecnicoSearch,
  setTecnicoSearch,
  quienInstaloActions,
  quienInstaloSearch,
  setQuienInstaloSearch,
  quienEntregoActions,
  quienEntregoSearch,
  setQuienEntregoSearch,
  usuarios,
  selectTecnico,
  selectQuienInstalo,
  selectQuienEntrego,
  setFirmaClienteUrl,
  setShowMapModal,
  tecnicoSignatureUrl,
  maxPhotosAllowed,
  getRootProps,
  getInputProps,
  isDragActive,
  photoPreview,
  setPhotoPreview,
  confirmDelete,
  setConfirmDelete,
  confirmDeletePhoto,
  deletingPhoto,
  uploadingPhotos = false,
  photoUploadProgress = null,
}: OrdenClienteTabProps) {
  const fotosExtraId = variant === "admin" ? "fotos-extra-max" : "fotos-extra-max-tecnico";
  const fotosExtraHintId = variant === "admin" ? "fotos-extra-hint-admin" : "fotos-extra-hint-tecnico";
  const folioInputId = "orden-cliente-folio";
  const nombreClienteId = "orden-cliente-nombre";
  const telefonoId = "orden-cliente-telefono";
  const direccionId = "orden-cliente-direccion";
  const [brokenPhotoUrls, setBrokenPhotoUrls] = useState<Record<string, boolean>>({});

  const normalizePreviewUrl = (url: string) => {
    const raw = String(url || "").trim();
    if (!raw) return raw;
    if (raw.startsWith("http://")) return `https://${raw.slice("http://".length)}`;
    return raw;
  };

  useEffect(() => {
    const active = new Set(Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []);
    setBrokenPhotoUrls((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [url, isBroken] of Object.entries(prev)) {
        if (active.has(url)) {
          next[url] = isBroken;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [formData.fotos_urls]);

  const onClienteQueryChange = (q: string) => {
    setClienteSearch(q);
    if (!q.trim() && (formData.cliente_id || formData.cliente) && !ro("cliente")) {
      selectCliente(null);
    }
  };

  const onTecnicoAsignadoQueryChange = (q: string) => {
    setTecnicoSearch(q);
    if (!q.trim() && formData.tecnico_asignado && !ro("tecnico_asignado")) {
      selectTecnico(null);
    }
  };

  const onQuienInstaloQueryChange = (q: string) => {
    setQuienInstaloSearch(q);
    if (!q.trim() && formData.quien_instalo && !ro("quien_instalo")) {
      selectQuienInstalo(null);
    }
  };

  const onQuienEntregoQueryChange = (q: string) => {
    setQuienEntregoSearch(q);
    if (!q.trim() && formData.quien_entrego && !ro("quien_entrego")) {
      selectQuienEntrego(null);
    }
  };

  const handleClienteSelect = (action: { id?: string | number; label?: string; __contacto?: { id?: number; celular?: string; nombre_apellido?: string } }) => {
    if (variant === "admin") {
      if (ro("cliente")) return;
    } else if (ro("cliente") && action?.id !== "__new__") {
      return;
    }
    if (action?.id === "__new__") {
      if (ro("cliente")) return;
      setShowClienteModal(true);
      return;
    }
    const rawId = String(action?.id ?? "");
    const clienteIdStr = rawId.includes("::") ? rawId.split("::")[0] : rawId;
    const id = Number(clienteIdStr);
    const c = clientes.find((x) => Number(x.id) === id);
    if (!c) return;

    const contacto = action?.__contacto;
    if (contacto) {
      setFormData({
        ...formData,
        cliente_id: c.id,
        contacto_id: contacto?.id != null ? Number(contacto.id) : null,
        cliente: c.nombre,
        direccion: c.direccion,
        telefono_cliente: String(contacto?.celular || c.telefono || ""),
        nombre_cliente: String(contacto?.nombre_apellido || ""),
      });
      setClienteSearch(String(action?.label || c.nombre || ""));
      return;
    }
    selectCliente(c);
  };

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className="space-y-5 focus:outline-none"
    >
      {/* SECCIÓN 1: Detalles Generales */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]">
          <svg className="h-5 w-5 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Detalles Generales</h3>
        </div>
        <div className="space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
          {editingOrden && (
            <div>
              <label htmlFor={folioInputId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                Folio
              </label>
              <input
                id={folioInputId}
                type="text"
                value={formData.folio || ""}
                readOnly={ro("folio")}
                disabled={ro("folio")}
                onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                className={`h-11 w-full rounded-[10px] border border-[#E7E7EA] px-3.5 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("folio")}`}
                placeholder="Ej: ATX2000"
              />
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <ActionSearchBar
                actions={clienteActions as never}
                showAllActions={variant === "admin"}
                defaultOpen={false}
                label="Cliente"
                placeholder="Buscar cliente por nombre o teléfono..."
                value={clienteSearch}
                onQueryChange={onClienteQueryChange}
                onSelectAction={handleClienteSelect as never}
              />
            </div>
            {(formData.cliente_id || formData.cliente) && !ro("cliente") && (
              <ClearSelectionButton onClick={() => selectCliente(null)} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={nombreClienteId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                Nombre del Cliente
              </label>
              <input
                id={nombreClienteId}
                type="text"
                value={formData.nombre_cliente}
                readOnly={ro("nombre_cliente")}
                disabled={ro("nombre_cliente")}
                onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                className={`h-11 w-full rounded-[10px] border border-[#E7E7EA] px-3.5 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("nombre_cliente")}`}
                placeholder="Nombre completo del cliente"
              />
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ActionSearchBar
                  actions={tecnicoActions as never}
                  defaultOpen={false}
                  label="Técnico Asignado"
                  placeholder="Buscar técnico..."
                  value={tecnicoSearch}
                  onQueryChange={onTecnicoAsignadoQueryChange}
                  onSelectAction={(action: { id?: string | number }) => {
                    if (ro("tecnico_asignado")) return;
                    const id = Number(action?.id);
                    const u = usuarios.find((x) => Number(x.id) === id);
                    if (u) selectTecnico(u);
                  }}
                />
              </div>
              {formData.tecnico_asignado && !ro("tecnico_asignado") && (
                <ClearSelectionButton onClick={() => selectTecnico(null)} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ActionSearchBar
                  actions={quienInstaloActions as never}
                  defaultOpen={false}
                  label="¿Quien instaló?"
                  placeholder="Buscar técnico..."
                  value={quienInstaloSearch}
                  onQueryChange={onQuienInstaloQueryChange}
                  onSelectAction={(action: { id?: string | number }) => {
                    if (ro("quien_instalo")) return;
                    const id = Number(action?.id);
                    const u = usuarios.find((x) => Number(x.id) === id);
                    if (u) selectQuienInstalo(u);
                  }}
                />
              </div>
              {formData.quien_instalo && !ro("quien_instalo") && (
                <ClearSelectionButton onClick={() => selectQuienInstalo(null)} />
              )}
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ActionSearchBar
                  actions={quienEntregoActions as never}
                  defaultOpen={false}
                  label="¿Quien entregó?"
                  placeholder="Buscar técnico..."
                  value={quienEntregoSearch}
                  onQueryChange={onQuienEntregoQueryChange}
                  onSelectAction={(action: { id?: string | number }) => {
                    if (ro("quien_entrego")) return;
                    const id = Number(action?.id);
                    const u = usuarios.find((x) => Number(x.id) === id);
                    if (u) selectQuienEntrego(u);
                  }}
                />
              </div>
              {formData.quien_entrego && !ro("quien_entrego") && (
                <ClearSelectionButton onClick={() => selectQuienEntrego(null)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Detalles del Cliente */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]">
          <svg className="h-5 w-5 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
            {variant === "tecnico" && <path d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <h3 className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Detalles del Cliente</h3>
        </div>
        <div className="space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
          <div>
            <label htmlFor={telefonoId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
              Teléfono
            </label>
            <div className="flex items-center gap-2">
              <input
                id={telefonoId}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                pattern="[0-9]*"
                value={formData.telefono_cliente}
                readOnly={ro("telefono_cliente")}
                disabled={ro("telefono_cliente")}
                onChange={(e) => {
                  setFormData({ ...formData, telefono_cliente: e.target.value.replace(/\D/g, "").slice(0, 10) });
                }}
                className={`h-11 w-full rounded-[10px] border border-[#E7E7EA] px-3.5 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("telefono_cliente")}`}
                placeholder="10 dígitos"
                maxLength={10}
              />
              <a
                href={formData.telefono_cliente ? `tel:${formData.telefono_cliente}` : undefined}
                onClick={(e) => {
                  if (!formData.telefono_cliente) e.preventDefault();
                }}
                aria-disabled={!formData.telefono_cliente || undefined}
                tabIndex={formData.telefono_cliente ? undefined : -1}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#52525B] transition-colors hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:hover:bg-[#243048] ${!formData.telefono_cliente ? "pointer-events-none opacity-50" : ""}`}
                aria-label="Llamar al cliente"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={direccionId} className="block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                Dirección
              </label>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                aria-label="Seleccionar dirección en mapa"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Seleccionar en mapa
              </button>
            </div>
            <div className="relative">
              <textarea
                id={direccionId}
                value={formData.direccion}
                readOnly={ro("direccion")}
                disabled={ro("direccion")}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                rows={2}
                className={`w-full resize-none rounded-[10px] border border-[#E7E7EA] px-3.5 py-2.5 pr-12 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("direccion")}`}
                placeholder="Dirección, coordenadas o URL de Google Maps"
              />
              {formData.direccion && (
                <button
                  type="button"
                  onClick={() => openDireccionInMaps(formData.direccion)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  aria-label="Abrir dirección en Google Maps"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Detalles de Tiempo */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]">
          <svg className="h-5 w-5 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Detalles de Tiempo</h3>
        </div>
        <div className="space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <DatePicker
                key={variant === "admin" ? `fecha-inicio-${editingOrden?.id ?? "new"}` : undefined}
                id="fecha-inicio"
                label="Fecha Inicio"
                placeholder="Seleccionar fecha"
                disabled={ro("fecha_inicio")}
                defaultDate={formData.fecha_inicio || undefined}
                onChange={(_dates, currentDateString) => {
                  setFormData((prev) => ({ ...prev, fecha_inicio: currentDateString || "" }));
                }}
              />
            </div>
            <div>
              <Label htmlFor="hora-inicio">Hora Inicio</Label>
              <div className="relative">
                <Input
                  type="time"
                  id="hora-inicio"
                  name="hora-inicio"
                  disabled={ro("hora_inicio")}
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E77] dark:text-[#8ea0b8]">
                  <TimeIcon className="size-6" />
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <DatePicker
                key={variant === "admin" ? `fecha-finalizacion-${editingOrden?.id ?? "new"}` : undefined}
                id="fecha-finalizacion"
                label="Fecha Finalización"
                placeholder="Seleccionar fecha"
                disabled={ro("fecha_finalizacion")}
                defaultDate={formData.fecha_finalizacion || undefined}
                onChange={(_dates, currentDateString) => {
                  setFormData((prev) => ({ ...prev, fecha_finalizacion: currentDateString || "" }));
                }}
              />
            </div>
            <div>
              <Label htmlFor="hora-termino">Hora Término</Label>
              <div className="relative">
                <Input
                  type="time"
                  id="hora-termino"
                  name="hora-termino"
                  disabled={ro("hora_termino")}
                  value={formData.hora_termino}
                  onChange={(e) => setFormData({ ...formData, hora_termino: e.target.value })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E77] dark:text-[#8ea0b8]">
                  <TimeIcon className="size-6" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Firmas y Archivos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]">
          <svg className="h-5 w-5 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Firmas y Archivos</h3>
        </div>
        <div className="space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SignaturePad
              label="Firma del Encargado"
              value={formData.tecnico_asignado != null ? tecnicoSignatureUrl : ""}
              disabled
              onChange={() => {}}
              width={400}
              height={250}
            />
            <SignaturePad
              label="Firma del Cliente"
              value={formData.firma_cliente_url}
              disabled={ro("firma_cliente_url")}
              onChange={setFirmaClienteUrl}
              width={400}
              height={250}
            />
          </div>

          {!ro("fotos_extra_max") && (
            <div className={`rounded-lg border border-[#E7E7EA] p-3 dark:border-[#273244] sm:p-4 ${variant === "tecnico" ? "mb-3" : ""} space-y-2`}>
              <label htmlFor={fotosExtraId} className="block text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">
                Fotos adicionales (además de las {ORDEN_BASE_MAX_FOTOS} base)
              </label>
              <select
                id={fotosExtraId}
                value={formData.fotos_extra_max}
                onChange={(e) => {
                  const n = Number(e.target.value) as FotosExtraMax;
                  setFormData({ ...formData, fotos_extra_max: n });
                }}
                className="w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2.5 text-sm text-[#09090B] outline-none transition-colors focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]"
                aria-describedby={fotosExtraHintId}
              >
                <option value={0}>Ninguna — máximo {ORDEN_BASE_MAX_FOTOS} en total</option>
                <option value={2}>+2 — máximo {ORDEN_BASE_MAX_FOTOS + 2} en total</option>
                <option value={3}>+3 — máximo {ORDEN_BASE_MAX_FOTOS + 3} en total</option>
                <option value={4}>+4 — máximo {ORDEN_BASE_MAX_FOTOS + 4} en total</option>
                <option value={5}>+5 — máximo {ORDEN_BASE_MAX_FOTOS + 5} en total</option>
              </select>
              <p id={fotosExtraHintId} className="text-xs text-[#52525B] dark:text-[#8ea0b8]">
                Límite actual: {maxPhotosAllowed} fotos en total.
              </p>
            </div>
          )}

          {!ro("fotos_urls") && (
            <div
              className={`rounded-[10px] border border-dashed transition dark:border-[#273244] ${
                uploadingPhotos
                  ? "cursor-wait border-[#93B4FF] dark:border-[#4B7CFF]/40"
                  : "cursor-pointer border-[#E7E7EA] hover:border-[#1B5CFF] dark:border-[#273244] dark:hover:border-[#4B7CFF]"
              }`}
            >
              <div
                {...getRootProps()}
                className={`dropzone rounded-lg border-dashed p-4 sm:p-5 ${
                  uploadingPhotos
                    ? "border-[#4B7CFF] bg-[#F1F5FF]/70 dark:bg-[rgba(75,124,255,0.1)]"
                    : isDragActive
                      ? "border-[#1B5CFF] bg-[#F1F5FF] dark:bg-[rgba(75,124,255,0.12)]"
                      : "border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]"
                }`}
                id="fotos-upload"
                role="button"
                tabIndex={0}
                aria-busy={uploadingPhotos}
                aria-disabled={uploadingPhotos}
                aria-label={`Subir fotos de la orden, máximo ${maxPhotosAllowed}`}
              >
                <input {...getInputProps()} />
                <div className="dz-message m-0! flex flex-col items-center">
                  <div className="mb-3 flex justify-center">
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#EDEDED] text-[#52525B] dark:bg-[#111827] dark:text-[#8ea0b8]">
                      <svg className="fill-current" width="22" height="22" viewBox="0 0 29 28" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h4 className="mb-1 text-sm font-semibold text-[#09090B] dark:text-white/90 sm:text-base">
                    {uploadingPhotos
                      ? "Procesando fotos…"
                      : isDragActive
                        ? "Suelta aquí para subir"
                        : `Haz clic o arrastra imágenes (máx. ${maxPhotosAllowed})`}
                  </h4>
                  <span className="mb-2 block w-full max-w-[320px] text-center text-[12px] text-[#3F3F46] dark:text-[#8ea0b8]">
                    {uploadingPhotos
                      ? "Puedes elegir varias; se suben de dos en dos para que no salgan en blanco."
                      : "JPG, PNG o WebP. En iPhone usa «Más compatible» (no HEIC)."}
                  </span>
                  {photoUploadProgress ? (
                    <p role="status" aria-live="polite" className="text-sm font-medium text-[#1244D1] dark:text-[#4B7CFF]">
                      {formatOrdenPhotoProgress(photoUploadProgress)}
                    </p>
                  ) : (
                    <span className="text-[12px] font-medium text-[#1B5CFF] underline">Buscar archivos</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {Array.isArray(formData.fotos_urls) && formData.fotos_urls.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8ea0b8]">
                  Fotos de la orden
                </p>
                <span className="text-[11px] tabular-nums text-[#6E6E77] dark:text-[#8ea0b8]">
                  {formData.fotos_urls.length} / {maxPhotosAllowed}
                </span>
              </div>
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                {formData.fotos_urls.map((preview, index) => {
                  const previewSrc = normalizePreviewUrl(preview);
                  return (
                    <li key={`${preview}-${index}`} className="group relative aspect-square">
                      <button
                        type="button"
                        onClick={() => setPhotoPreview({ open: true, url: previewSrc, index })}
                        className="relative block h-full w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] focus-visible:ring-offset-2 dark:border-[#273244] dark:bg-[#0f172a] dark:focus-visible:ring-offset-[#111827]"
                        aria-label={`Ver foto ${index + 1} en tamaño completo`}
                      >
                        {brokenPhotoUrls[preview] ? (
                          <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-[10px] text-[#6E6E77] dark:text-[#8ea0b8]">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <path d="M3 17l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M4 4l16 16" strokeLinecap="round" />
                            </svg>
                            No se pudo mostrar
                          </span>
                        ) : (
                          <>
                            <img
                              src={previewSrc}
                              alt={`Foto ${index + 1} de la orden`}
                              className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                              loading="lazy"
                              decoding="async"
                              onLoad={() =>
                                setBrokenPhotoUrls((prev) => {
                                  if (!prev[preview]) return prev;
                                  const next = { ...prev };
                                  delete next[preview];
                                  return next;
                                })
                              }
                              onError={() => setBrokenPhotoUrls((prev) => ({ ...prev, [preview]: true }))}
                            />
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/25 group-hover:opacity-100">
                              <svg className="h-6 w-6 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <circle cx="11" cy="11" r="7" />
                                <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" strokeLinecap="round" />
                              </svg>
                            </span>
                          </>
                        )}
                        <span className="pointer-events-none absolute bottom-1 left-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-md bg-black/55 px-1 text-[10px] font-semibold tabular-nums text-white">
                          {index + 1}
                        </span>
                      </button>
                      {!ro("fotos_urls") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ open: true, index, url: preview });
                          }}
                          className="absolute right-1 top-1 z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-[#C22B2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={`Eliminar foto ${index + 1}`}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <OrdenPhotoPreviewModal
            open={photoPreview.open}
            url={photoPreview.url}
            index={photoPreview.index}
            total={formData.fotos_urls.length}
            onClose={() => setPhotoPreview({ open: false, url: null, index: 0 })}
            onPrev={
              formData.fotos_urls.length > 1
                ? () => {
                    const n =
                      (photoPreview.index - 1 + formData.fotos_urls.length) % formData.fotos_urls.length;
                    setPhotoPreview({ open: true, url: normalizePreviewUrl(formData.fotos_urls[n]), index: n });
                  }
                : undefined
            }
            onNext={
              formData.fotos_urls.length > 1
                ? () => {
                    const n = (photoPreview.index + 1) % formData.fotos_urls.length;
                    setPhotoPreview({ open: true, url: normalizePreviewUrl(formData.fotos_urls[n]), index: n });
                  }
                : undefined
            }
          />
          <OrdenPhotoDeleteModal
            open={confirmDelete.open}
            deleting={deletingPhoto}
            onCancel={() => setConfirmDelete({ open: false, index: null, url: null })}
            onConfirm={() => {
              if (confirmDelete.index != null && confirmDelete.url) {
                void confirmDeletePhoto(confirmDelete.index, confirmDelete.url);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
