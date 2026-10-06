import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { TrashBinIcon } from "@/icons";
import { erpDeleteModalClass, erpDeleteModalPanelClass } from "../../OrdenesTrabajo/ordenTrabajoStyles";
import { erpDangerBtnClass, erpSecondaryBtnClass } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { ReporteMantenimiento } from "../reporteTypes";
import { folioDe } from "./reporteListUtils";

type Props = {
  row: ReporteMantenimiento | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirmación para eliminar un reporte (no se cierra mientras se elimina). */
export function ReporteDeleteModal({ row, deleting, onCancel, onConfirm }: Props) {
  const titleId = useId();
  const folio = row ? folioDe(row) : "";
  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={() => {
        if (!deleting) onCancel();
      }}
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
      showCloseButton={!deleting}
      ariaLabelledBy={titleId}
      className={`${erpDeleteModalClass} z-[100000]`}
    >
      <div className={erpDeleteModalPanelClass}>
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/20" aria-hidden>
            {deleting ? (
              <span className="size-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600 dark:border-rose-900 dark:border-t-rose-400" />
            ) : (
              <TrashBinIcon className="size-6" />
            )}
          </span>
          <h3 id={titleId} className="text-base font-semibold text-[#09090B] dark:text-[#F8FAFC]">
            Eliminar reporte
          </h3>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#52525B] dark:text-[#94a3b8]">
            {deleting ? (
              "Por favor espera; esto puede tardar unos segundos."
            ) : (
              <>
                ¿Eliminar <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{folio || "este reporte"}</span>
                {row?.orden_cliente ? <> de «{row.orden_cliente}»?</> : "?"} Esta acción no se puede deshacer.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
          <button type="button" className={`${erpSecondaryBtnClass} sm:min-w-[8rem]`} disabled={deleting} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={`${erpDangerBtnClass} sm:min-w-[8rem]`} disabled={deleting} aria-busy={deleting || undefined} onClick={onConfirm}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
