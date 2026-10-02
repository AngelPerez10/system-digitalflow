/**
 * Alta / edición de un cliente (Contactos, Órdenes de servicio…).
 *
 * Este componente solo orquesta: estado del formulario y pasos. El guardado
 * vive en `useClienteSave`; la presentación en `ClienteFormHeader`,
 * `ClienteFormSteps`, `fields/` y `ClienteFormFooter`.
 *
 * - No se cierra con un clic fuera; con X, Escape o Cancelar avisa si hay
 *   cambios sin guardar. Ctrl/⌘+S guarda.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Modal } from "@/components/ui/modal";
import "@/components/ui/modal-kit/motion.css";
import "./clienteForm.css";
import type { Cliente } from "@/types/cliente";
import { emptyFormData, formDataFromCliente, type ClienteFormData } from "../domain/clienteFormData";
import { mapsUrlForCoords } from "../domain/clienteLinks";
import { CLIENTE_STEP_ORDER, clienteStepState } from "../domain/clienteSteps";
import { TIPO_OPTIONS, type ClienteFormTab, type ClienteTipo } from "../domain/clienteTipos";
import { useClienteDuplicates } from "../hooks/useClienteDuplicates";
import { ClienteMapPickerModal } from "../map/ClienteMapPickerModal";
import type { LatLng } from "../map/leaflet";
import { Notice } from "../ui/FormUi";
import { formFont } from "../ui/tokens";
import { ClienteDuplicatesNotice } from "./ClienteDuplicatesNotice";
import { SINGULAR } from "./clienteFormCopy";
import { ClienteFormFooter } from "./ClienteFormFooter";
import { ClienteFormHeader } from "./ClienteFormHeader";
import { ClienteStepChips, ClienteStepRail } from "./ClienteFormSteps";
import { CLIENTE_STEPS } from "./clienteStepMeta";
import { ClienteSimplifiedFormFields } from "./fields/ClienteSimplifiedFormFields";
import { useClienteSave, type ClienteSaveMeta } from "./useClienteSave";

export type { ClienteSaveMeta };

// Mismo cascarón que el modal de Proyectos: alto fijo (cambiar de paso no hace saltar el modal).
const modalShellClass =
  "flex h-[min(94dvh,52rem)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] !bg-white p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:!bg-[#111827] sm:h-[min(92dvh,52rem)] sm:w-[min(96vw,66rem)] sm:max-w-none sm:rounded-[22px]";

const MAP_CONTAINER_ID = "cliente-form-modal-leaflet-map";

const snapshot = (data: ClienteFormData) => JSON.stringify(data);

export interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cliente: Cliente, meta?: ClienteSaveMeta) => void;
  editingCliente?: Cliente | null;
  permissions?: {
    clientes?: {
      create?: boolean;
      edit?: boolean;
    };
  };
  fixedTipo?: ClienteTipo;
  sectionTitle?: string;
  /**
   * Si se define, al crear se avisa de posibles duplicados y se ofrece abrir el
   * registro existente en edición. Sin esto no se hace ninguna consulta extra.
   */
  onEditExisting?: (cliente: Cliente) => void;
}

export function ClienteFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingCliente = null,
  permissions,
  fixedTipo,
  sectionTitle = "Contactos de negocio",
  onEditExisting,
}: ClienteFormModalProps) {
  const titleId = useId();
  const descId = useId();
  const errorId = useId();
  const stepsId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ClienteFormData>(() => emptyFormData(fixedTipo));
  const [initialData, setInitialData] = useState<ClienteFormData>(() => emptyFormData(fixedTipo));
  const [activeTab, setActiveTab] = useState<ClienteFormTab>("general");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [mapError, setMapError] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);

  const isEditing = editingCliente !== null;
  const canSave = isEditing ? permissions?.clientes?.edit === true : permissions?.clientes?.create === true;
  const dirty = snapshot(formData) !== snapshot(initialData);

  /* ---------------- Navegación ---------------- */

  function selectTab(tab: ClienteFormTab) {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  /** Cambia de paso y, si se indica, enfoca el campo (dos cuadros: montar la pestaña y luego enfocar). */
  const goToField = (tab: ClienteFormTab, field?: string) => {
    selectTab(tab);
    if (!field) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()),
    );
  };

  /* ---------------- Guardado ---------------- */

  const save = useClienteSave({
    formData,
    initialData,
    editingCliente,
    fixedTipo,
    canSave,
    dirty,
    goToField,
    onSaved: (cliente, meta) => {
      onClose();
      onSuccess(cliente, meta);
    },
  });

  // Un error general (sin campo) aparece arriba: llevar la vista ahí.
  useEffect(() => {
    if (save.apiError) scrollRef.current?.scrollTo({ top: 0 });
  }, [save.apiError]);

  const duplicates = useClienteDuplicates({
    enabled: isOpen && !isEditing && save.createdId === null && Boolean(onEditExisting),
    nombre: String(formData.nombre ?? "").trim(),
    telefono: String(formData.telefono ?? ""),
  });

  // Cada apertura (o cambio de registro) arranca limpio.
  const { reset: resetSave } = save;
  useEffect(() => {
    if (!isOpen) return;
    const data = editingCliente ? formDataFromCliente(editingCliente, fixedTipo) : emptyFormData(fixedTipo);
    setFormData(data);
    setInitialData(data);
    setActiveTab("general");
    setMapError("");
    setConfirmDiscard(false);
    setSelectedLocation(null);
    resetSave();
  }, [isOpen, editingCliente, fixedTipo, resetSave]);

  /* ---------------- Cerrar ---------------- */

  const close = () => {
    setConfirmDiscard(false);
    // El cliente se creó pero el guardado quedó a medias: la vista debe enterarse.
    const pending = save.takeUnreported();
    onClose();
    if (pending) onSuccess(pending, { contactoPendiente: true });
  };

  /** X, Escape y «Cancelar» pasan por aquí. */
  const requestClose = () => {
    if (save.isSavingNow()) return;
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    close();
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    setConfirmDiscard(false);
    void save.submit();
  };

  /** Ctrl/⌘ + S guarda desde cualquier campo. */
  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleConfirmMap = () => {
    if (selectedLocation) {
      const url = mapsUrlForCoords(selectedLocation);
      setFormData((prev) => ({ ...prev, direccion: url }));
    }
    setShowMapModal(false);
  };

  /* ---------------- Derivados de presentación ---------------- */

  const stepIndex = CLIENTE_STEP_ORDER.indexOf(activeTab);
  const step = CLIENTE_STEPS[stepIndex];
  const stepState = clienteStepState(formData, save.errors, Boolean(editingCliente?.id));
  const doneCount = CLIENTE_STEP_ORDER.filter((t) => stepState[t] === "done").length;
  const completion = Math.round((doneCount / CLIENTE_STEP_ORDER.length) * 100);

  const stepProps = {
    activeTab,
    stepState,
    tabId: (t: ClienteFormTab) => `${stepsId}-tab-${t}`,
    panelId: (t: ClienteFormTab) => `${stepsId}-panel-${t}`,
    disabled: save.saving,
    onSelect: selectTab,
  };

  const singular = SINGULAR[fixedTipo ?? "DEFAULT"];
  const nombre = String(formData.nombre ?? "").trim();
  const tipo = (fixedTipo ?? String(formData.tipo || "EMPRESA")) as ClienteTipo;
  const nothingToSave = isEditing && !dirty;

  return (
    <>
      <Modal
        mobileBottomSheet
        isOpen={isOpen}
        onClose={requestClose}
        showCloseButton={false}
        // Un clic fuera no cierra: un formulario largo no se pierde por accidente.
        closeOnBackdropClick={false}
        closeOnEscape={!save.saving && !showMapModal}
        ariaLabelledBy={titleId}
        ariaDescribedBy={descId}
        className={modalShellClass}
      >
        <ClienteFormHeader
          titleId={titleId}
          descId={descId}
          isEditing={isEditing}
          eyebrow={
            isEditing
              ? `${sectionTitle}${editingCliente?.idx != null ? ` · No. ${editingCliente.idx}` : ""}`
              : `Nuevo ${singular}`
          }
          tipoLabel={TIPO_OPTIONS.find((o) => o.value === tipo)?.label ?? "Contacto"}
          title={nombre || (isEditing ? "Registro sin nombre" : `Nuevo ${singular}`)}
          completion={completion}
          closeDisabled={save.saving}
          onClose={requestClose}
        />

        <div className="flex min-h-0 flex-1" style={formFont}>
          <aside className="hidden w-64 shrink-0 flex-col border-r border-[#F0F0F2] bg-[#FAFAFA] p-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 md:flex">
            <ClienteStepRail {...stepProps} />
            <div className="mt-auto space-y-2">
              <p className="rounded-2xl bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[#6E6E77] ring-1 ring-[#F0F0F2] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#1F2A3C]">
                {isEditing
                  ? "Los contactos y direcciones se guardan al instante desde sus tarjetas."
                  : "Solo el nombre y el teléfono son obligatorios; lo demás puedes completarlo después."}
              </p>
              <p className="px-1 text-[11.5px] text-[#8E8E96] dark:text-[#64748B]">
                <kbd className="rounded border border-[#E4E4E7] bg-white px-1 font-sans text-[11px] dark:border-[#273244] dark:bg-[#111827]">Ctrl</kbd>{" "}
                +{" "}
                <kbd className="rounded border border-[#E4E4E7] bg-white px-1 font-sans text-[11px] dark:border-[#273244] dark:bg-[#111827]">S</kbd>{" "}
                para guardar
              </p>
            </div>
          </aside>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            onKeyDown={onFormKeyDown}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            aria-busy={save.saving}
            aria-keyshortcuts="Control+S Meta+S"
            noValidate
          >
            <div className="shrink-0 border-b border-[#F0F0F2] px-3 py-2.5 dark:border-[#1F2A3C] md:hidden">
              <ClienteStepChips {...stepProps} />
            </div>

            <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#F7F7F8] dark:bg-[#0B1220]">
              {/* Mientras se guarda nada se puede editar (evita cambios que no se enviarían). */}
              <fieldset disabled={save.saving} className={`cf-body m-0 min-w-0 border-0 p-0 ${save.saving ? "opacity-70" : ""}`}>
                <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-5 lg:p-6">
                  {save.apiError ? (
                    <Notice tone="error" title="No se pudo guardar" id={errorId}>
                      {save.apiError}
                    </Notice>
                  ) : null}

                  {mapError ? (
                    <Notice tone="warning" title="Mapa no disponible">
                      {mapError}
                    </Notice>
                  ) : null}

                  {onEditExisting && !isEditing && save.createdId === null ? (
                    <ClienteDuplicatesNotice matches={duplicates} onEditExisting={onEditExisting} />
                  ) : null}

                  <div
                    key={activeTab}
                    id={stepProps.panelId(activeTab)}
                    role="tabpanel"
                    aria-labelledby={stepProps.tabId(activeTab)}
                    className="space-y-4"
                  >
                    <div className="cot-fade hidden items-center gap-3 px-1 pt-1 sm:flex">
                      <span
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1B5CFF] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#7EA0FF] dark:ring-[#273244]"
                        aria-hidden
                      >
                        <step.icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#7EA0FF]">
                          Paso {stepIndex + 1} de {CLIENTE_STEP_ORDER.length}
                        </p>
                        <p className="text-[20px] font-semibold leading-tight tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                          {step.label}
                        </p>
                      </div>
                    </div>

                    <ClienteSimplifiedFormFields
                      formData={formData}
                      setFormData={setFormData}
                      activeTab={activeTab}
                      setActiveTab={selectTab}
                      fixedTipo={fixedTipo}
                      editingCliente={editingCliente}
                      onOpenMap={() => setShowMapModal(true)}
                      errors={save.errors}
                      hideTabs
                    />
                  </div>
                </div>
              </fieldset>
            </div>

            <ClienteFormFooter
              confirmDiscard={confirmDiscard}
              onKeepEditing={() => setConfirmDiscard(false)}
              onDiscard={close}
              phase={save.phase}
              errorCount={save.errorCount}
              dirty={dirty}
              step={{ index: stepIndex, count: CLIENTE_STEP_ORDER.length, label: step.label }}
              onPrev={() => selectTab(CLIENTE_STEP_ORDER[stepIndex - 1])}
              onNext={() => selectTab(CLIENTE_STEP_ORDER[stepIndex + 1])}
              onCancel={requestClose}
              saveDisabled={save.saving || !canSave || nothingToSave}
              nothingToSave={nothingToSave}
              saveLabel={nothingToSave ? "Sin cambios" : isEditing ? "Guardar cambios" : `Crear ${singular}`}
              saveShortLabel={nothingToSave ? "Sin cambios" : isEditing ? "Guardar" : "Crear"}
              errorId={save.apiError ? errorId : undefined}
            />
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
        onMapError={(message) => {
          setMapError(message);
          setShowMapModal(false);
        }}
      />
    </>
  );
}
