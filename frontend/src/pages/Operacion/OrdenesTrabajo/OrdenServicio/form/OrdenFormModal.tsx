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
  erpModalShellClass,
  erpModalTabClass,
} from "../../ordenTrabajoStyles";
import type { OrdenFormTab } from "./useOrdenFormModalState";

export const ORDEN_FORM_TAB_IDS = {
  cliente: "orden-form-tab-cliente",
  orden: "orden-form-tab-orden",
  equipos: "orden-form-tab-equipos",
} as const;

export const ORDEN_FORM_PANEL_IDS = {
  cliente: "orden-form-panel-cliente",
  orden: "orden-form-panel-orden",
  equipos: "orden-form-panel-equipos",
} as const;

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
  triggerSaveFromFooter: () => void;
  canOrdenesEdit?: boolean;
  canOrdenesCreate?: boolean;
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
  triggerSaveFromFooter,
  canOrdenesEdit = true,
  canOrdenesCreate = true,
  children,
}: OrdenFormModalProps) {
  const goToEquiposTab = (fromFooter?: boolean) => {
    const apply = () => {
      setActiveTab("equipos");
      activeTabRef.current = "equipos";
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    };
    if (fromFooter) window.setTimeout(apply, 0);
    else apply();
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: OrdenFormTab) => {
    const idx = TAB_ORDER.indexOf(current);
    if (idx < 0) return;

    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (idx + 1) % TAB_ORDER.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = TAB_ORDER.length - 1;
    } else {
      return;
    }

    const next = TAB_ORDER[nextIdx];
    setActiveTab(next);
    requestAnimationFrame(() => {
      document.getElementById(ORDEN_FORM_TAB_IDS[next])?.focus();
    });
  };

  const savePrimary =
    activeTab === "cliente" ? (
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
      <OrdenModalPrimaryButton type="button" disabled={isSaving} onClick={triggerSaveFromFooter}>
        {isSaving ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isSaving ? "Guardando…" : editingOrden ? "Actualizar" : "Guardar"}
      </OrdenModalPrimaryButton>
    );

  return (
    <Modal
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
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Edición limitada: solo puedes actualizar problemática, estado, tiempos y fotos en órdenes de otros técnicos.
          </div>
        )}
        <form
          ref={formScrollRef}
          onSubmit={onSubmit}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.defaultPrevented) return;
            const t = e.target as HTMLElement;
            if (t.tagName === "TEXTAREA") return;
            if (activeTabRef.current !== "cliente") return;
            e.preventDefault();
            goToOrdenTab();
          }}
        >
          <div className={erpModalFormScrollClass}>
            {modalAlert.show && (
              <div className="mb-4" role="alert">
                <Alert
                  variant={modalAlert.variant}
                  title={modalAlert.title}
                  message={modalAlert.message}
                  showLink={false}
                />
              </div>
            )}

            <div className="flex items-center gap-2" role="tablist" aria-label="Secciones del formulario">
              <button
                type="button"
                id={ORDEN_FORM_TAB_IDS.cliente}
                role="tab"
                tabIndex={activeTab === "cliente" ? 0 : -1}
                aria-selected={activeTab === "cliente"}
                aria-controls={ORDEN_FORM_PANEL_IDS.cliente}
                onClick={() => setActiveTab("cliente")}
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
                onClick={() => setActiveTab("orden")}
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
                onClick={() => setActiveTab("equipos")}
                onKeyDown={(e) => handleTabKeyDown(e, "equipos")}
                className={erpModalTabClass(activeTab === "equipos")}
              >
                Equipos
              </button>
            </div>

            {children}
          </div>
        </form>
        <div className={erpModalFooterClass}>
          <OrdenModalFooterActions onCancel={onClose} primary={savePrimary} />
        </div>
      </div>
    </Modal>
  );
}
