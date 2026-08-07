import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { erpSecondaryBtnClass, erpSubheadingClass } from "@/layout/erpPageStyles";
import {
  claudeBodyClass,
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
} from "../../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import type { InventarioItem } from "../shared/inventarioTypes";
import { TrashIcon, WarnIcon } from "./inventarioIcons";

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
      className={erpDeleteModalClass}
    >
      <div className={erpDeleteModalPanelClass}>
        <div className="mb-4 flex items-center gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
            aria-hidden="true"
          >
            <WarnIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className={erpSubheadingClass}>
              ¿Eliminar del inventario?
            </h2>
            <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {item ? (
          <>
            <p className={`text-sm ${claudeBodyClass}`}>
              Se eliminará{" "}
              <span className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                {item.nombre || "el ítem"}
              </span>{" "}
              con código <span className="font-mono">{item.codigo_barras}</span>.
            </p>
            <p className="mt-3 rounded-xl bg-[#fef5f5] px-3 py-2 text-xs leading-relaxed text-[#b91c1c] dark:bg-[#7f1d1d]/20 dark:text-[#fca5a5]">
              También se borran sus {item.cantidad > 0 ? "existencias y " : ""}movimientos
              registrados.
            </p>
          </>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            className={`${erpSecondaryBtnClass} sm:flex-1`}
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${erpDangerBtnClass} sm:flex-1`}
            onClick={() => item && onConfirm(item)}
            disabled={deleting || !item}
          >
            <TrashIcon className="h-4 w-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
