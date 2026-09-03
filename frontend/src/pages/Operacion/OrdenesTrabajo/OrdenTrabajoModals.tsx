import { useEffect, useId, type MouseEventHandler, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import {
  claudeBodyClass,
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpModalHeaderClass,
  erpModalPrimaryBtnClass,
  erpModalSecondaryBtnClass,
  erpViewModalClass,
  erpViewModalFooterClass,
  erpViewModalHeaderClass,
  erpViewModalPanelClass,
} from "./ordenTrabajoStyles";

const modalTitleClass =
  "text-base font-semibold leading-[1.3] tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[1.125rem]";

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
  titleId?: string;
};

export function OrdenFormModalHeader({
  editing,
  title,
  subtitle,
  contextLabel = "Operación · Órdenes",
  titleId,
}: OrdenFormModalHeaderProps) {
  return (
    <header className={erpModalHeaderClass}>
      <div className="flex items-start gap-3 sm:gap-3.5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] sm:size-11">
          {docIcon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{contextLabel}</p>
            {editing ? (
              <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">
                Edición
              </span>
            ) : (
              <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                Nueva
              </span>
            )}
          </div>
          <h2
            id={titleId}
            className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.4px] text-white sm:text-[20px] sm:tracking-[-0.5px]"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 max-w-md text-[13px] leading-[19px] text-white/70 sm:line-clamp-none sm:text-[14px] sm:leading-[20px]">
              {subtitle}
            </p>
          ) : null}
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
  const titleId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      closeOnBackdropClick={false}
      className={erpDeleteModalClass}
      ariaLabelledBy={titleId}
    >
      <div className={erpDeleteModalPanelClass}>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {warnIcon}
          </span>
          <div>
            <h3 id={titleId} className={modalTitleClass}>¿Eliminar orden?</h3>
            <p className="text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <p className={`mb-6 text-sm ${claudeBodyClass}`}>
          ¿Estás seguro de que deseas eliminar la orden para <span className="font-semibold text-[#09090B] dark:text-[#f8fafc]">{clienteLabel}</span>?
        </p>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button type="button" onClick={onCancel} className={`${erpModalSecondaryBtnClass} sm:flex-1`}>
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
  const titleId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      className={erpViewModalClass}
      ariaLabelledBy={titleId}
    >
      <div className={erpViewModalPanelClass}>
        <div className={erpViewModalHeaderClass}>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(27,92,255,0.1)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.15)] dark:text-[#4B7CFF]">
            {icon ?? docIcon}
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className={modalTitleClass}>{title}</h3>
            {subtitle ? <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">{subtitle}</p> : null}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm text-[#09090B] custom-scrollbar dark:text-[#e5e7eb]">{children}</div>
        <div className={erpViewModalFooterClass}>
          <button type="button" onClick={onClose} className={erpModalSecondaryBtnClass}>
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

type OrdenPhotoPreviewModalProps = {
  open: boolean;
  url: string | null;
  index?: number;
  total?: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export function OrdenPhotoPreviewModal({
  open,
  url,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: OrdenPhotoPreviewModalProps) {
  const hasNav = Boolean(onPrev && onNext && total != null && total > 1);
  const label =
    index != null && total != null && total > 0
      ? `Foto ${index + 1} de ${total}`
      : "Vista ampliada de la foto";

  useEffect(() => {
    if (!open || !hasNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev?.();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasNav, onPrev, onNext]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick
      showCloseButton={false}
      ariaLabel={label}
      className="z-[100001] flex h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] flex-col overflow-hidden rounded-none border-0 !bg-[#0B0B0F] p-0 shadow-2xl dark:!bg-[#0B0B0F] sm:mx-2 sm:h-auto sm:max-h-[96vh] sm:w-[min(96vw,60rem)] sm:max-w-[min(96vw,60rem)] sm:rounded-[20px] sm:border sm:border-white/10"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-5 sm:py-3">
        <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85 sm:text-xs">
          <svg className="h-3.5 w-3.5 shrink-0 text-[#E6A23C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M21 16l-4.5-4.5L7 21" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{label}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar vista ampliada"
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#faf9f5] backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#1b1b24_0%,#0B0B0F_72%)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-8">
        {url ? (
          <img
            src={url}
            alt={label}
            draggable={false}
            className="max-h-[calc(100dvh-4rem)] w-auto max-w-full select-none rounded-lg object-contain shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/10 sm:max-h-[min(80vh,900px)]"
          />
        ) : null}

        {hasNav && (
          <>
            <button
              type="button"
              onClick={onPrev}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white active:scale-95 sm:left-4"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white active:scale-95 sm:right-4"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {hasNav && total != null && (
        <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-white/10 bg-white/[0.02] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/30"
              }`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

export function OrdenPhotoDeleteModal({ open, deleting, onCancel, onConfirm }: OrdenPhotoDeleteModalProps) {
  const titleId = useId();
  const modalTitle = deleting ? "Eliminando imagen…" : "Confirmar eliminación";

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!deleting) onCancel();
      }}
      closeOnBackdropClick={false}
      showCloseButton={!deleting}
      className={`${erpDeleteModalClass} z-[100000]`}
      ariaLabelledBy={titleId}
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
          <h3 id={titleId} className={modalTitleClass}>{modalTitle}</h3>
          <p className={`mt-2 text-sm ${claudeBodyClass}`}>
            {deleting ? "Por favor espera; esto puede tardar unos segundos." : "Esta acción no se puede deshacer. ¿Eliminar la imagen seleccionada?"}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
          <button type="button" disabled={deleting} onClick={onCancel} className={`${erpModalSecondaryBtnClass} sm:min-w-[7rem]`}>
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
      <button type="button" onClick={onCancel} className={erpModalSecondaryBtnClass}>
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
  form,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  form?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type={type}
      form={form}
      disabled={disabled}
      onClick={onClick}
      className={`${erpModalPrimaryBtnClass} w-full sm:w-auto`}
    >
      {children}
    </button>
  );
}
