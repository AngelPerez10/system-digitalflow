import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import {
  invDangerBtnClass,
  invModalSmallShellClass,
  invSecondaryBtnClass,
} from "../shared/inventarioStyles";
import type { InventarioItem } from "../shared/inventarioTypes";
import { TrashIcon } from "./inventarioIcons";

type InventarioDeleteModalProps = {
  item: InventarioItem | null;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (item: InventarioItem) => void;
};

export default function InventarioDeleteModal({
  item,
  deleting,
  error,
  onClose,
  onConfirm,
}: InventarioDeleteModalProps) {
  const titleId = useId();

  return (
    <Modal
      isOpen={item != null}
      onClose={onClose}
      closeOnBackdropClick={false}
      ariaLabelledBy={titleId}
      className={invModalSmallShellClass}
    >
      <div className="bg-white p-6 dark:bg-[#111827]">
        <div className="mb-5 flex items-start gap-3.5">
          <span
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]"
            aria-hidden="true"
          >
            <TrashIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]"
            >
              ¿Eliminar del inventario?
            </h2>
            <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {item ? (
          <>
            <p className="text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
              Se eliminará{" "}
              <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                {item.nombre || "el ítem"}
              </span>{" "}
              con código <span className="font-mono">{item.codigo_barras}</span>.
            </p>
            <p className="mt-3 rounded-[12px] bg-[#FEF2F2] px-3 py-2 text-[13px] leading-relaxed text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              También se borran sus {item.cantidad > 0 ? "existencias y " : ""}movimientos
              registrados.
            </p>
          </>
        ) : null}

        {error ? (
          <p className="mt-3 text-[13px] text-[#C22B2B] dark:text-[#F87171]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            className={`${invSecondaryBtnClass} sm:flex-1`}
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${invDangerBtnClass} sm:flex-1`}
            onClick={() => item && onConfirm(item)}
            disabled={deleting || !item}
            aria-busy={deleting}
          >
            <TrashIcon className="h-4 w-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
