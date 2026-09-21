import { useId, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import {
  cotViewModalClass,
  cotViewModalFooterClass,
  cotViewModalHeaderClass,
  cotViewModalPanelClass,
  secondaryActionBtnClass,
} from "./cotizacionFormStyles";

const modalTitleClass =
  "text-base font-semibold leading-[1.3] tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[1.125rem]";

const docIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type CotizacionViewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export default function CotizacionViewModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
}: CotizacionViewModalProps) {
  const titleId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      className={cotViewModalClass}
      ariaLabelledBy={titleId}
    >
      <div className={cotViewModalPanelClass}>
        <div className={cotViewModalHeaderClass}>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(27,92,255,0.1)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.15)] dark:text-[#4B7CFF]">
            {icon ?? docIcon}
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className={modalTitleClass}>{title}</h3>
            {subtitle ? <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">{subtitle}</p> : null}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm text-[#09090B] custom-scrollbar dark:text-[#e5e7eb]">
          {children}
        </div>
        <div className={cotViewModalFooterClass}>
          <button type="button" onClick={onClose} className={`${secondaryActionBtnClass} !w-auto`}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
