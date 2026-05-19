import { useEffect, useId, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import type { Cliente } from "@/types/cliente";
import { onlyDigits10 } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import { ClienteMapPickerModal } from "./ClienteMapPickerModal";
import { ClienteSimplifiedFormFields } from "./ClienteSimplifiedFormFields";
import {
  type ClienteTipo,
  buildClientePayload,
  emptyFormData,
  formatApiErrors,
  formDataFromCliente,
} from "./clienteFormShared";

const claudeSectionHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";

const claudeCaptionClass = "text-sm font-normal leading-relaxed text-[#57534e] dark:text-[#8ea0b8]";

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const actionButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto";

const trimOrEmpty = (value: unknown) => String(value ?? "").trim();

export interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cliente: Cliente) => void;
  editingCliente?: Cliente | null;
  permissions?: {
    clientes?: {
      create?: boolean;
      edit?: boolean;
    };
  };
  fixedTipo?: ClienteTipo;
  sectionTitle?: string;
}

const MAP_CONTAINER_ID = "cliente-form-modal-leaflet-map";

export function ClienteFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingCliente = null,
  permissions,
  fixedTipo,
  sectionTitle = "Clientes",
}: ClienteFormModalProps) {
  const titleId = useId();
  const descId = useId();
  const errorId = useId();

  const [formData, setFormData] = useState<Record<string, unknown>>(emptyFormData(fixedTipo));
  const [activeTab, setActiveTab] = useState<"general" | "more">("general");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState("");

  const canClientesCreate = !!permissions?.clientes?.create;
  const canClientesEdit = permissions?.clientes?.edit !== false;

  const viewSingular =
    fixedTipo === "EMPRESA"
      ? "Empresa"
      : fixedTipo === "PERSONA_FISICA"
        ? "Persona física"
        : fixedTipo === "PROVEEDOR"
          ? "Proveedor"
          : "Cliente";

  useEffect(() => {
    if (!isOpen) return;
    setModalError("");
    setActiveTab("general");
    setMapError("");
    if (editingCliente) {
      setFormData(formDataFromCliente(editingCliente, fixedTipo));
    } else {
      setFormData(emptyFormData(fixedTipo));
    }
  }, [isOpen, editingCliente, fixedTipo]);

  useEffect(() => {
    if (!fixedTipo) return;
    setFormData((prev) => ({ ...prev, tipo: fixedTipo }));
  }, [fixedTipo]);

  const handleClose = () => {
    setModalError("");
    setActiveTab("general");
    setFormData(emptyFormData(fixedTipo));
    setSelectedLocation(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingCliente && !canClientesCreate) {
      setModalError("No tienes permiso para crear clientes.");
      return;
    }

    if (editingCliente && !canClientesEdit) {
      setModalError("No tienes permiso para editar clientes.");
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

    setSaving(true);
    try {
      const response = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildClientePayload(formData, fixedTipo)),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        setModalError(formatApiErrors(txt) || "No se pudo guardar el cliente.");
        return;
      }

      const saved = (await response.json().catch(() => null)) as Cliente | null;
      if (!saved?.id) {
        setModalError("No se pudo obtener el ID del cliente guardado.");
        return;
      }

      handleClose();
      onSuccess(saved);
    } catch (error) {
      setModalError(String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMap = () => {
    if (!selectedLocation) {
      setShowMapModal(false);
      return;
    }
    const { lat, lng } = selectedLocation;
    setFormData((prev) => ({
      ...prev,
      direccion: `https://www.google.com/maps?q=${lat},${lng}`,
    }));
    setShowMapModal(false);
  };

  const isValidationWarning = modalError.startsWith("Campos requeridos faltantes:");

  return (
    <>
      <Modal
        mobileBottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        closeOnBackdropClick={!saving}
        closeOnEscape={!saving}
        ariaLabelledBy={titleId}
        ariaDescribedBy={descId}
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b]"
      >
        <div className="bg-[#fffdfa] dark:bg-[#111a2b]">
          <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-none dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:pr-16">
            <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm"
                aria-hidden
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z"
                    fill="currentColor"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={sectionLabelClass}>Contactos · {sectionTitle}</p>
                <h3 id={titleId} className={`mt-1 ${claudeSectionHeadingClass}`}>
                  {editingCliente ? `Editar ${viewSingular}` : `Nuevo ${viewSingular}`}
                </h3>
                <p id={descId} className={claudeCaptionClass}>
                  Captura y revisa los datos antes de guardar
                </p>
              </div>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="custom-scrollbar max-h-[78vh] space-y-4 overflow-y-auto p-4 sm:p-5"
            aria-busy={saving}
            noValidate
          >
            {modalError && (
              <div id={errorId} role="alert" aria-live="assertive">
                <Alert
                  variant={isValidationWarning ? "warning" : "error"}
                  title={isValidationWarning ? "Faltan campos" : "Error"}
                  message={modalError}
                  showLink={false}
                />
              </div>
            )}

            {mapError && (
              <div role="alert" aria-live="polite">
                <Alert variant="error" title="Error de mapa" message={mapError} showLink={false} />
              </div>
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

            <div className="sticky bottom-[-1rem] z-20 -mx-4 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 shadow-[0_-10px_24px_-20px_rgba(28,25,23,0.55)] before:absolute before:-bottom-3 before:left-0 before:h-3 before:w-full before:bg-[#fcfaf6] before:content-[''] dark:border-[#334155] dark:bg-[#0f172a] dark:before:bg-[#0f172a] sm:-mx-5 sm:bottom-[-1.25rem] sm:px-5">
              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className={`${actionButtonClass} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-gray-400 disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  aria-describedby={modalError ? errorId : undefined}
                  className={`${actionButtonClass} bg-[#ff801f] text-black hover:bg-[#ff6a00] focus-visible:outline-[#ff801f] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M5 12l4 4L19 6" strokeLinecap="round" />
                  </svg>
                  {saving ? "Guardando…" : editingCliente ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <ClienteMapPickerModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        mapContainerId={MAP_CONTAINER_ID}
        direccion={String(formData.direccion || "")}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        onConfirm={handleConfirmMap}
        onMapError={(message) => setMapError(message)}
      />
    </>
  );
}
