import type { KeyboardEvent, MutableRefObject, ReactNode, RefObject } from "react";

import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";

import {
  OrdenFormModalHeader,
  OrdenModalFooterActions,
  OrdenModalPrimaryButton,
} from "../../OrdenTrabajoModals";
import {
  erpModalBodyClass,
  erpModalFooterClass,
  erpModalFormScrollClass,
  erpModalSecondaryBtnClass,
  erpModalShellClass,
  erpModalTabClass,
} from "../../ordenTrabajoStyles";
import type { OrdenFormTab } from "./useOrdenFormModalState";

export const ORDEN_FORM_TAB_IDS = {
  cliente: "orden-form-tab-cliente",
  orden: "orden-form-tab-orden",
  equipos: "orden-form-tab-equipos",
  calificacion: "orden-form-tab-calificacion",
} as const;

export const ORDEN_FORM_PANEL_IDS = {
  cliente: "orden-form-panel-cliente",
  orden: "orden-form-panel-orden",
  equipos: "orden-form-panel-equipos",
  calificacion: "orden-form-panel-calificacion",
} as const;

/** Pestañas del asistente paso a paso (progreso "Paso X de N", botón Siguiente). */
const TAB_ORDER: OrdenFormTab[] = ["cliente", "orden", "equipos"];

export type OrdenFormModalAlert = {
  show: boolean;
  variant: "error" | "warning" | "success" | "info";
  title: string;
  message: string;
};

export type OrdenFormModalProps = {
  variant: "admin" | "tecnico";
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape: boolean;
  editingOrden: { id?: number } | null;
  tipoOrdenLabel: string;
  isLimitedEdit: boolean;
  formScrollRef: RefObject<HTMLFormElement | null>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  activeTabRef: MutableRefObject<OrdenFormTab>;
  goToOrdenTab: (fromFooter?: boolean) => void;
  activeTab: OrdenFormTab;
  setActiveTab: (tab: OrdenFormTab) => void;
  modalAlert: OrdenFormModalAlert;
  isSaving: boolean;
  uploadingPhotos?: boolean;
  /** Al editar: el cuerpo muestra un esqueleto mientras se carga el detalle completo. */
  bodyLoading?: boolean;
  triggerSaveFromFooter: () => void;
  canOrdenesEdit?: boolean;
  canOrdenesCreate?: boolean;
  /** Pestaña extra (solo admin) con la calificación y comentario del cliente. */
  showCalificacionTab?: boolean;
  children: ReactNode;
};

export default function OrdenFormModal({
  variant,
  isOpen,
  onClose,
  closeOnEscape,
  editingOrden,
  tipoOrdenLabel,
  isLimitedEdit,
  formScrollRef,
  onSubmit,
  activeTabRef,
  goToOrdenTab,
  activeTab,
  setActiveTab,
  modalAlert,
  isSaving,
  uploadingPhotos = false,
  bodyLoading = false,
  triggerSaveFromFooter,
  canOrdenesEdit = true,
  canOrdenesCreate = true,
  showCalificacionTab = false,
  children,
}: OrdenFormModalProps) {
  const saveBusy = isSaving || uploadingPhotos;
  const isStepperTab = TAB_ORDER.includes(activeTab);
  const stepIndex = Math.max(0, TAB_ORDER.indexOf(activeTab));
  // Orden de foco por teclado: incluye la pestaña de calificación cuando aplica.
  const navTabs: OrdenFormTab[] = showCalificacionTab
    ? [...TAB_ORDER, "calificacion"]
    : TAB_ORDER;

  /** Cambia de pestaña y devuelve el foco al panel para que lectores de pantalla y teclado sigan el flujo. */
  const switchTab = (next: OrdenFormTab, fromFooter?: boolean) => {
    const apply = () => {
      setActiveTab(next);
      activeTabRef.current = next;
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        document.getElementById(ORDEN_FORM_PANEL_IDS[next])?.focus({ preventScroll: true });
      });
    };
    if (fromFooter) window.setTimeout(apply, 0);
    else apply();
  };

  const goToEquiposTab = (fromFooter?: boolean) => switchTab("equipos", fromFooter);
  const goBackTab = () => {
    const prev = TAB_ORDER[stepIndex - 1];
    if (prev) switchTab(prev);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: OrdenFormTab) => {
    const idx = navTabs.indexOf(current);
    if (idx < 0) return;

    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (idx + 1) % navTabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (idx - 1 + navTabs.length) % navTabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = navTabs.length - 1;
    } else {
      return;
    }

    const next = navTabs[nextIdx];
    setActiveTab(next);
    requestAnimationFrame(() => {
      document.getElementById(ORDEN_FORM_TAB_IDS[next])?.focus();
    });
  };

  const backButton =
    stepIndex > 0 ? (
      <button
        type="button"
        onClick={goBackTab}
        disabled={saveBusy}
        className={`${erpModalSecondaryBtnClass} sm:w-auto`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Atrás
      </button>
    ) : null;

  const nextOrSave =
    activeTab === "calificacion" ? null : activeTab === "cliente" ? (
      <OrdenModalPrimaryButton
        type="button"
        disabled={isSaving}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goToOrdenTab(true);
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Siguiente
      </OrdenModalPrimaryButton>
    ) : activeTab === "orden" ? (
      <OrdenModalPrimaryButton
        type="button"
        disabled={isSaving}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goToEquiposTab(true);
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Siguiente
      </OrdenModalPrimaryButton>
    ) : variant === "tecnico" && !(editingOrden ? canOrdenesEdit : canOrdenesCreate) ? null : (
      <OrdenModalPrimaryButton type="button" disabled={saveBusy} onClick={triggerSaveFromFooter}>
        {isSaving || uploadingPhotos ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isSaving ? "Guardando…" : uploadingPhotos ? "Subiendo fotos…" : editingOrden ? "Actualizar" : "Guardar"}
      </OrdenModalPrimaryButton>
    );

  // En móvil, "Atrás" y "Siguiente/Guardar" comparten fila (2 columnas); en desktop
  // `sm:contents` disuelve el wrapper y el pie los alinea a la derecha como antes.
  const savePrimary = backButton ? (
    <div className="grid grid-cols-2 gap-2.5 sm:contents">
      {backButton}
      {nextOrSave}
    </div>
  ) : (
    nextOrSave
  );

  return (
    <Modal
      mobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={false}
      closeOnEscape={closeOnEscape}
      ariaLabel={`${editingOrden ? "Editar" : "Nueva"} orden de ${tipoOrdenLabel}`}
      className={erpModalShellClass}
    >
      <OrdenFormModalHeader
        editing={!!editingOrden}
        title={`${editingOrden ? "Editar" : "Nueva"} orden de ${tipoOrdenLabel}`}
        subtitle="Captura y revisa los datos antes de guardar"
      />
      <div className={erpModalBodyClass}>
        {isLimitedEdit && (
          <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:mx-6 sm:mt-6">
            Edición limitada: solo puedes actualizar problemática, estado, tiempos y fotos en órdenes de otros técnicos.
          </div>
        )}
        <form
          ref={formScrollRef}
          onSubmit={onSubmit}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <div className={erpModalFormScrollClass}>
            {bodyLoading ? (
              <div
                className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-10 text-center"
                role="status"
                aria-live="polite"
              >
                <svg className="h-7 w-7 animate-spin text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                  <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
                </svg>
                <p className="text-sm font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  Cargando la orden…
                </p>
                <p className="max-w-xs text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                  Estamos trayendo firma, fotos y equipos. Puedes cerrar y volver a intentarlo si tarda demasiado.
                </p>
              </div>
            ) : (
            <>
            {modalAlert.show && (
              <div className="mb-4" role="alert">
                <Alert
                  variant={modalAlert.variant}
                  title={modalAlert.title}
                  message={modalAlert.message}
                  showLink={false}
                  placement="inline"
                />
              </div>
            )}

            {isStepperTab && (
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Paso {stepIndex + 1} de {TAB_ORDER.length}
                </p>
                <span
                  className="h-1 w-24 overflow-hidden rounded-full bg-[#E7E7EA] dark:bg-[#273244]"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-[#1B5CFF] transition-[width] duration-300 dark:bg-[#4B7CFF]"
                    style={{ width: `${((stepIndex + 1) / TAB_ORDER.length) * 100}%` }}
                  />
                </span>
              </div>
            )}

            <div
              className="flex items-center gap-2 overflow-x-auto"
              role="tablist"
              aria-label="Secciones del formulario"
              aria-orientation="horizontal"
            >
              <button
                type="button"
                id={ORDEN_FORM_TAB_IDS.cliente}
                role="tab"
                tabIndex={activeTab === "cliente" ? 0 : -1}
                aria-selected={activeTab === "cliente"}
                aria-controls={ORDEN_FORM_PANEL_IDS.cliente}
                onClick={() => switchTab("cliente")}
                onKeyDown={(e) => handleTabKeyDown(e, "cliente")}
                className={erpModalTabClass(activeTab === "cliente")}
              >
                Datos del cliente
              </button>
              <button
                type="button"
                id={ORDEN_FORM_TAB_IDS.orden}
                role="tab"
                tabIndex={activeTab === "orden" ? 0 : -1}
                aria-selected={activeTab === "orden"}
                aria-controls={ORDEN_FORM_PANEL_IDS.orden}
                onClick={() => switchTab("orden")}
                onKeyDown={(e) => handleTabKeyDown(e, "orden")}
                className={erpModalTabClass(activeTab === "orden")}
              >
                Datos de la orden
              </button>
              <button
                type="button"
                id={ORDEN_FORM_TAB_IDS.equipos}
                role="tab"
                tabIndex={activeTab === "equipos" ? 0 : -1}
                aria-selected={activeTab === "equipos"}
                aria-controls={ORDEN_FORM_PANEL_IDS.equipos}
                onClick={() => switchTab("equipos")}
                onKeyDown={(e) => handleTabKeyDown(e, "equipos")}
                className={erpModalTabClass(activeTab === "equipos")}
              >
                Equipos
              </button>
              {showCalificacionTab && (
                <>
                  <span
                    className="mx-1 h-5 w-px shrink-0 self-center bg-[#E7E7EA] dark:bg-[#273244]"
                    aria-hidden
                  />
                  <button
                    type="button"
                    id={ORDEN_FORM_TAB_IDS.calificacion}
                    role="tab"
                    tabIndex={activeTab === "calificacion" ? 0 : -1}
                    aria-selected={activeTab === "calificacion"}
                    aria-controls={ORDEN_FORM_PANEL_IDS.calificacion}
                    onClick={() => switchTab("calificacion")}
                    onKeyDown={(e) => handleTabKeyDown(e, "calificacion")}
                    className={erpModalTabClass(activeTab === "calificacion")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2.5l2.72 5.51 6.08.88-4.4 4.29 1.04 6.06L12 16.98l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.88L12 2.5z" />
                      </svg>
                      Calificación del cliente
                    </span>
                  </button>
                </>
              )}
            </div>

            {children}
            </>
            )}
          </div>
        </form>
        <div className={erpModalFooterClass}>
          <OrdenModalFooterActions onCancel={onClose} primary={bodyLoading ? null : savePrimary} />
        </div>
      </div>
    </Modal>
  );
}
