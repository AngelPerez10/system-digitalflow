import { useId } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { polDangerBtnClass, polSansStyle, polSecondaryBtnClass } from "../shared/polizaStyles";
import type { PolizaRow } from "../list/polizaListTypes";

type Props = {
  row: PolizaRow | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function PolizaDeleteModal({ row, deleting, onCancel, onConfirm }: Props) {
  const titleId = useId();
  const descId = useId();
  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={() => !deleting && onCancel()}
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="w-[min(92vw,26rem)] overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]!"
    >
      <div className="p-6 text-center" style={polSansStyle}>
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
          {deleting ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <Trash2 className="size-6" aria-hidden />}
        </span>
        <h2 id={titleId} className="mt-4 text-[17px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
          ¿Eliminar {row?.folio || "esta póliza"}?
        </h2>
        <p id={descId} className="mt-2 text-[14px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
          {row?.cliente ? <>Se borrará la póliza de «{row.cliente}» y sus visitas. </> : null}
          Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onCancel} disabled={deleting} className={polSecondaryBtnClass}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting} aria-busy={deleting || undefined} className={polDangerBtnClass}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
