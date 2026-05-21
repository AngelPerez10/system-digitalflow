import type { MouseEventHandler, ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { erpSubheadingClass } from "@/layout/erpPageStyles";
import {
  claudeBodyClass,
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpModalHeaderAccentClass,
  erpModalHeaderClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpViewModalClass,
  erpViewModalFooterClass,
  erpViewModalHeaderClass,
  erpViewModalPanelClass,
  sectionLabelOrangeClass,
} from "./ordenTrabajoStyles";

const docIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const trashIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M3 6h18" strokeLinecap="round" />
    <path d="M8 6V4h8v2" strokeLinecap="round" />
    <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" strokeLinecap="round" />
  </svg>
);

const warnIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

type OrdenFormModalHeaderProps = {
  editing: boolean;
  title: string;
  subtitle?: string;
  contextLabel?: string;
};

export function OrdenFormModalHeader({ editing, title, subtitle, contextLabel = "Operación · Órdenes" }: OrdenFormModalHeaderProps) {
  return (
    <header className={erpModalHeaderClass}>
      <div className={erpModalHeaderAccentClass} aria-hidden />
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">{docIcon}</div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className={sectionLabelOrangeClass}>{contextLabel}</p>
            {editing ? (
              <span className="rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                Edición
              </span>
            ) : (
              <span className="rounded-md border border-[#e7ded0] bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#78716c] dark:border-[#334155] dark:bg-[#111827] dark:text-[#8ea0b8]">
                Nueva
              </span>
            )}
          </div>
          <h2 className={`mt-1.5 ${erpSubheadingClass}`}>{title}</h2>
          {subtitle ? <p className={`mt-1.5 max-w-md text-sm ${claudeBodyClass}`}>{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}

type OrdenDeleteModalProps = {
  open: boolean;
  clienteLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OrdenDeleteModal({ open, clienteLabel, onCancel, onConfirm }: OrdenDeleteModalProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} closeOnBackdropClick={false} className={erpDeleteModalClass}>
      <div className={erpDeleteModalPanelClass}>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {warnIcon}
          </span>
          <div>
            <h3 className={erpSubheadingClass}>¿Eliminar orden?</h3>
            <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <p className={`mb-6 text-sm ${claudeBodyClass}`}>
          ¿Estás seguro de que deseas eliminar la orden para <span className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">{clienteLabel}</span>?
        </p>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button type="button" onClick={onCancel} className={`${erpSecondaryBtnClass} sm:flex-1`}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className={`${erpDangerBtnClass} sm:flex-1`}>
            {trashIcon}
            Eliminar
          </button>
        </div>
      </div>
    </Modal>
  );
}

type OrdenViewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function OrdenViewModal({ open, onClose, title, subtitle, icon, children }: OrdenViewModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose} closeOnBackdropClick={false} className={erpViewModalClass}>
      <div className={erpViewModalPanelClass}>
        <div className={erpViewModalHeaderClass}>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ea580c] dark:bg-[#ff801f]/15 dark:text-[#fb923c]">
            {icon ?? docIcon}
          </span>
          <div className="min-w-0">
            <h3 className={erpSubheadingClass}>{title}</h3>
            {subtitle ? <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">{subtitle}</p> : null}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm text-[#1c1917] custom-scrollbar dark:text-[#e5e7eb]">{children}</div>
        <div className={erpViewModalFooterClass}>
          <button type="button" onClick={onClose} className={erpSecondaryBtnClass}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

type OrdenPhotoDeleteModalProps = {
  open: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OrdenPhotoDeleteModal({ open, deleting, onCancel, onConfirm }: OrdenPhotoDeleteModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!deleting) onCancel();
      }}
      closeOnBackdropClick={false}
      showCloseButton={!deleting}
      className={`${erpDeleteModalClass} z-[100000]`}
    >
      <div className={erpDeleteModalPanelClass}>
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {deleting ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-red-200 border-t-red-600 dark:border-red-900 dark:border-t-red-400" aria-hidden />
            ) : (
              warnIcon
            )}
          </span>
          <h3 className={erpSubheadingClass}>{deleting ? "Eliminando imagen…" : "Confirmar eliminación"}</h3>
          <p className={`mt-2 text-sm ${claudeBodyClass}`}>
            {deleting ? "Por favor espera; esto puede tardar unos segundos." : "Esta acción no se puede deshacer. ¿Eliminar la imagen seleccionada?"}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
          <button type="button" disabled={deleting} onClick={onCancel} className={`${erpSecondaryBtnClass} sm:min-w-[7rem]`}>
            Cancelar
          </button>
          <button type="button" disabled={deleting} onClick={onConfirm} className={`${erpDangerBtnClass} sm:min-w-[7rem]`}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function OrdenModalFooterActions({
  onCancel,
  cancelLabel = "Cancelar",
  primary,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  primary: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
      <button type="button" onClick={onCancel} className={erpSecondaryBtnClass}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
        </svg>
        {cancelLabel}
      </button>
      {primary}
    </div>
  );
}

export function OrdenModalPrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${erpPrimaryBtnClass} w-full sm:w-auto`}>
      {children}
    </button>
  );
}
