import { useEffect, useId, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import type { Cliente } from "@/types/cliente";
import { onlyDigits10 } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import { ClienteMapPickerModal } from "./ClienteMapPickerModal";
import { ClienteSimplifiedFormFields } from "./ClienteSimplifiedFormFields";
import { seedPrincipalDireccion } from "./clienteDireccionesApi";
import {
  type ClienteFormTab,
  type ClienteTipo,
  buildClientePayload,
  emptyFormData,
  formatApiErrors,
  formDataFromCliente,
  upsertClienteContactoFromForm,
} from "./clienteFormShared";

/* --------------------------------------------------------------------------
   Mismo cascarón que `ClientesPage`: cabecera marina, cuerpo en lienzo,
   pie hundido, azul eléctrico como acento de acción (no naranja legacy).
   -------------------------------------------------------------------------- */

const modalShellClass =
  "flex max-h-[min(92vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

const modalHeaderClass = "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";
const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";
const modalEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";
const modalTitleClass = "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";
const modalSubtitleClass = "mt-1 text-[14px] leading-5 text-white/70";
const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] max-sm:w-full sm:h-11";

const secondaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:w-full sm:h-11";

type AlertVariant = "error" | "warning";

const alertTone: Record<AlertVariant, { border: string; bg: string; dot: string; title: string; msg: string }> = {
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
};

function InlineAlert({
  variant,
  title,
  message,
  id,
}: {
  variant: AlertVariant;
  title: string;
  message: string;
  id?: string;
}) {
  const tone = alertTone[variant];
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 ${tone.border} ${tone.bg}`}
    >
      <span className={`mt-1.5 size-1.75 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      <div className="min-w-0">
        <p className={`text-[15px] font-medium ${tone.title}`}>{title}</p>
        <p className={`mt-0.5 text-[13px] ${tone.msg}`}>{message}</p>
      </div>
    </div>
  );
}

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
  sectionTitle = "Contactos de negocio",
}: ClienteFormModalProps) {
  const titleId = useId();
  const descId = useId();
  const errorId = useId();

  const [formData, setFormData] = useState<Record<string, unknown>>(emptyFormData(fixedTipo));
  const [activeTab, setActiveTab] = useState<ClienteFormTab>("general");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState("");

  const canClientesCreate = permissions?.clientes?.create === true;
  const canClientesEdit = permissions?.clientes?.edit === true;

  const viewSingular =
    fixedTipo === "EMPRESA"
      ? "empresa"
      : fixedTipo === "PERSONA_FISICA"
        ? "persona física"
        : fixedTipo === "PROVEEDOR"
          ? "proveedor"
          : "contacto";

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
    const isEditing = !!editingCliente;

    setSaving(true);
    try {
      const response = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildClientePayload(formData, fixedTipo, isEditing)),
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

      try {
        await upsertClienteContactoFromForm(saved.id, formData);
      } catch (contactError) {
        setModalError(
          contactError instanceof Error
            ? contactError.message
            : "El cliente se guardó, pero no se pudo guardar el contacto."
        );
        return;
      }

      if (!isEditing) {
        await seedPrincipalDireccion(saved.id, formData);
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
        className={modalShellClass}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" style={{ fontFamily: "Geist, Outfit, system-ui, sans-serif" }}>
          <header className={modalHeaderClass}>
            <div className="flex min-w-0 items-start gap-3.5">
              <span className={modalHeaderIconClass}>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
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
                <p className={modalEyebrowClass}>{sectionTitle}</p>
                <h3 id={titleId} className={`mt-1 ${modalTitleClass}`}>
                  {editingCliente ? `Editar ${viewSingular}` : `Nuevo ${viewSingular}`}
                </h3>
                <p id={descId} className={modalSubtitleClass}>
                  Captura y revisa los datos antes de guardar.
                </p>
              </div>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
            aria-busy={saving}
            noValidate
          >
            <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FAFAFA] p-4 dark:bg-[#0d1420] sm:p-6">
              {modalError ? (
                <InlineAlert
                  id={errorId}
                  variant={isValidationWarning ? "warning" : "error"}
                  title={isValidationWarning ? "Faltan campos" : "Error"}
                  message={modalError}
                />
              ) : null}

              {mapError ? (
                <InlineAlert variant="error" title="Error de mapa" message={mapError} />
              ) : null}

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
                <button type="button" onClick={handleClose} disabled={saving} className={secondaryBtnClass}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  aria-describedby={modalError ? errorId : undefined}
                  className={primaryBtnClass}
                >
                  <svg
                    className="size-4.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
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
