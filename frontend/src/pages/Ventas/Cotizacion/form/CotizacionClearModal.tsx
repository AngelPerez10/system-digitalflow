import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import {
  dangerActionBtnClass as dangerBtnClass,
  secondaryActionBtnClass as secondaryBtnClass,
} from "../shared/cotizacionFormStyles";

type CotizacionClearModalProps = {
  open: boolean;
  onClose: () => void;
  /** Vacía todo el formulario (resetAll) y cierra. */
  onConfirm: () => void;
};

/**
 * Confirmación de "Limpiar formulario". Aislado: solo recibe `open` y dos
 * callbacks, no lee estado del formulario.
 */
export function CotizacionClearModal({ open, onClose, onConfirm }: CotizacionClearModalProps) {
  const titleId = useId();
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      className="w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] mx-4 sm:mx-auto"
      ariaLabelledBy={titleId}
    >
      <div className="bg-white p-6 dark:bg-[#111827]">
        <div className="mb-5 flex items-start gap-3.5">
          <span
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]"
            aria-hidden="true"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h3
              id={titleId}
              className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]"
            >
              ¿Limpiar formulario?
            </h3>
            <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
              Se eliminarán todos los datos capturados. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryBtnClass}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={dangerBtnClass}
          >
            Sí, limpiar
          </button>
        </div>
      </div>
    </Modal>
  );
}
