import { useState } from "react";
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
  tecnicoDisplayLabel,
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
  setShowMapModal: (open: boolean) => void;
  tecnicoSignatureUrl: string;
  mySignatureUrl: string;
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
  setShowMapModal,
  tecnicoSignatureUrl,
  mySignatureUrl,
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

  const tecnicoAsignadoActions = variant === "admin" ? tecnicoActions : quienInstaloActions;
  const tecnicoAsignadoSearch = variant === "admin" ? tecnicoSearch : quienInstaloSearch;
  const setTecnicoAsignadoSearch = variant === "admin" ? setTecnicoSearch : setQuienInstaloSearch;
  const quienInstaloFieldActions = variant === "admin" ? quienInstaloActions : quienEntregoActions;
  const quienInstaloFieldSearch = variant === "admin" ? quienInstaloSearch : quienEntregoSearch;
  const setQuienInstaloFieldSearch = variant === "admin" ? setQuienInstaloSearch : setQuienEntregoSearch;
  const quienEntregoFieldActions = variant === "admin" ? quienEntregoActions : tecnicoActions;
  const quienEntregoFieldSearch = variant === "admin" ? quienEntregoSearch : tecnicoSearch;
  const setQuienEntregoFieldSearch = variant === "admin" ? setQuienEntregoSearch : setTecnicoSearch;

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
    <div id={panelId} role="tabpanel" aria-labelledby={labelledBy} className="space-y-5">
      {/* SECCIÓN 1: Detalles Generales */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <svg className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles Generales</h4>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40">
          {editingOrden && (
            <div>
              <label htmlFor={folioInputId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Folio
              </label>
              <input
                id={folioInputId}
                type="text"
                value={formData.folio || ""}
                readOnly={ro("folio")}
                disabled={ro("folio")}
                onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                className={`h-10 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("folio")}`}
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
                value={clienteSearch || formData.cliente || ""}
                onQueryChange={setClienteSearch}
                onSelectAction={handleClienteSelect as never}
              />
            </div>
            {(formData.cliente_id || formData.cliente) && !ro("cliente") && (
              <ClearSelectionButton onClick={() => selectCliente(null)} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={nombreClienteId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Nombre del Cliente
              </label>
              <input
                id={nombreClienteId}
                type="text"
                value={formData.nombre_cliente}
                readOnly={ro("nombre_cliente")}
                disabled={ro("nombre_cliente")}
                onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                className={`h-10 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("nombre_cliente")}`}
                placeholder="Nombre completo del cliente"
              />
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ActionSearchBar
                  actions={tecnicoAsignadoActions as never}
                  defaultOpen={false}
                  label="Técnico Asignado"
                  placeholder="Buscar técnico..."
                  value={tecnicoAsignadoSearch || tecnicoDisplayLabel(usuarios, formData.tecnico_asignado)}
                  onQueryChange={setTecnicoAsignadoSearch}
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
                  actions={quienInstaloFieldActions as never}
                  defaultOpen={false}
                  label="¿Quien instaló?"
                  placeholder="Buscar técnico..."
                  value={quienInstaloFieldSearch || tecnicoDisplayLabel(usuarios, formData.quien_instalo)}
                  onQueryChange={setQuienInstaloFieldSearch}
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
                  actions={quienEntregoFieldActions as never}
                  defaultOpen={false}
                  label="¿Quien entregó?"
                  placeholder="Buscar técnico..."
                  value={quienEntregoFieldSearch || tecnicoDisplayLabel(usuarios, formData.quien_entrego)}
                  onQueryChange={setQuienEntregoFieldSearch}
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
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <svg className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
            {variant === "tecnico" && <path d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles del Cliente</h4>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40">
          <div>
            <label htmlFor={telefonoId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Teléfono
            </label>
            <div className="flex items-center gap-2">
              <input
                id={telefonoId}
                type="tel"
                value={formData.telefono_cliente}
                readOnly={ro("telefono_cliente")}
                disabled={ro("telefono_cliente")}
                onChange={(e) => {
                  setFormData({ ...formData, telefono_cliente: e.target.value.replace(/\D/g, "") });
                }}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                className={`h-10 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("telefono_cliente")}`}
                placeholder="Teléfono del cliente"
                maxLength={10}
              />
              <a
                href={formData.telefono_cliente ? `tel:${formData.telefono_cliente}` : undefined}
                onClick={(e) => {
                  if (!formData.telefono_cliente) e.preventDefault();
                }}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${!formData.telefono_cliente ? "pointer-events-none opacity-50" : ""}`}
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
              <label htmlFor={direccionId} className="block text-xs font-medium text-gray-600 dark:text-gray-300">
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
                className={`w-full resize-none rounded-lg border border-gray-300 px-3 py-2 pr-12 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("direccion")}`}
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
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <svg className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles de Tiempo</h4>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40">
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
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
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
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  <TimeIcon className="size-6" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Firmas y Archivos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <svg className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Firmas y Archivos</h4>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SignaturePad
              label="Firma del Encargado"
              value={tecnicoSignatureUrl || mySignatureUrl || formData.firma_encargado_url}
              disabled
              onChange={() => {}}
              width={400}
              height={250}
            />
            <SignaturePad
              label="Firma del Cliente"
              value={formData.firma_cliente_url}
              disabled={ro("firma_cliente_url")}
              onChange={(signature) => setFormData({ ...formData, firma_cliente_url: signature })}
              width={400}
              height={250}
            />
          </div>

          {!ro("fotos_extra_max") && (
            <div className={`rounded-lg border border-gray-200 p-3 dark:border-white/10 sm:p-4 ${variant === "tecnico" ? "mb-3" : ""} space-y-2`}>
              <label htmlFor={fotosExtraId} className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                Fotos adicionales (además de las {ORDEN_BASE_MAX_FOTOS} base)
              </label>
              <select
                id={fotosExtraId}
                value={formData.fotos_extra_max}
                onChange={(e) => {
                  const n = Number(e.target.value) as FotosExtraMax;
                  setFormData({ ...formData, fotos_extra_max: n });
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#ff801f]/80 focus:ring-2 focus:ring-[#ff801f]/20 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100"
                aria-describedby={fotosExtraHintId}
              >
                <option value={0}>Ninguna — máximo {ORDEN_BASE_MAX_FOTOS} en total</option>
                <option value={2}>+2 — máximo {ORDEN_BASE_MAX_FOTOS + 2} en total</option>
                <option value={3}>+3 — máximo {ORDEN_BASE_MAX_FOTOS + 3} en total</option>
                <option value={4}>+4 — máximo {ORDEN_BASE_MAX_FOTOS + 4} en total</option>
                <option value={5}>+5 — máximo {ORDEN_BASE_MAX_FOTOS + 5} en total</option>
              </select>
              <p id={fotosExtraHintId} className="text-xs text-gray-600 dark:text-gray-400">
                Límite actual: {maxPhotosAllowed} fotos en total.
              </p>
            </div>
          )}

          {!ro("fotos_urls") && (
            <div
              className={`rounded-lg border border-dashed transition dark:border-gray-700 ${
                uploadingPhotos
                  ? "cursor-wait border-brand-300 dark:border-brand-500/40"
                  : "cursor-pointer border-gray-300 hover:border-[#ff801f] dark:hover:border-[#ff801f]"
              }`}
            >
              <div
                {...getRootProps()}
                className={`dropzone rounded-lg border-dashed p-4 sm:p-5 ${
                  uploadingPhotos
                    ? "border-brand-400 bg-brand-50/70 dark:bg-brand-500/10"
                    : isDragActive
                      ? "border-[#ff801f] bg-[#fff8f1] dark:bg-gray-800"
                      : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
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
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      <svg className="fill-current" width="22" height="22" viewBox="0 0 29 28" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90 sm:text-base">
                    {uploadingPhotos
                      ? "Procesando fotos…"
                      : isDragActive
                        ? "Suelta aquí para subir"
                        : `Haz clic o arrastra imágenes (máx. ${maxPhotosAllowed})`}
                  </h4>
                  <span className="mb-2 block w-full max-w-[320px] text-center text-[12px] text-gray-700 dark:text-gray-400">
                    {uploadingPhotos
                      ? "Puedes elegir varias; se suben de dos en dos para que no salgan en blanco."
                      : "JPG, PNG o WebP. En iPhone usa «Más compatible» (no HEIC)."}
                  </span>
                  {photoUploadProgress ? (
                    <p role="status" aria-live="polite" className="text-sm font-medium text-brand-700 dark:text-brand-300">
                      {formatOrdenPhotoProgress(photoUploadProgress)}
                    </p>
                  ) : (
                    <span className="text-[12px] font-medium text-[#ff801f] underline">Buscar archivos</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {Array.isArray(formData.fotos_urls) && formData.fotos_urls.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {formData.fotos_urls.map((preview, index) => (
                <div key={`${preview}-${index}`} className="group relative">
                  <button
                    type="button"
                    onClick={() => setPhotoPreview({ open: true, url: preview, index })}
                    className="block w-full cursor-zoom-in overflow-hidden rounded-lg border-2 border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 dark:border-gray-700"
                    aria-label={`Ver foto ${index + 1} en tamaño completo`}
                  >
                    {brokenPhotoUrls[preview] ? (
                      <div className="flex h-24 w-full items-center justify-center bg-gray-100 px-2 text-center text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        No se pudo mostrar
                      </div>
                    ) : (
                      <img
                        src={preview}
                        alt={`Foto ${index + 1} de la orden`}
                        className="pointer-events-none h-24 w-full bg-gray-100 object-cover dark:bg-gray-800"
                        loading="lazy"
                        decoding="async"
                        onError={() => setBrokenPhotoUrls((prev) => ({ ...prev, [preview]: true }))}
                      />
                    )}
                  </button>
                  {!ro("fotos_urls") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ open: true, index, url: preview });
                      }}
                      className="absolute right-1 top-1 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-error-600 text-white opacity-100 transition-opacity hover:bg-error-700 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`Eliminar foto ${index + 1}`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <OrdenPhotoPreviewModal
            open={photoPreview.open}
            url={photoPreview.url}
            index={photoPreview.index}
            total={formData.fotos_urls.length}
            onClose={() => setPhotoPreview({ open: false, url: null, index: 0 })}
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
