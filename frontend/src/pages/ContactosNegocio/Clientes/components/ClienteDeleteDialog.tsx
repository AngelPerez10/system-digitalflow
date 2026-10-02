/**
 * Confirmación para eliminar un contacto. Sin botón de cerrar: el foco
 * inicial cae en «Cancelar» (la acción segura) y `Modal` lo devuelve al botón
 * de origen. Mientras se elimina no se puede cerrar.
 */
import { useId, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { erpDangerBtnClass, erpSansStyle, erpSecondaryBtnClass } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { Cliente } from "@/types/cliente";
import { mutedText, strongText } from "../shared/clientesTokens";

export function ClienteDeleteDialog({
  open,
  cliente,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** Se conserva al cerrar para que el texto no desaparezca durante la salida. */
  cliente: Cliente | null;
  onCancel: () => void;
  /** Devuelve un mensaje de error o `null` si se eliminó. */
  onConfirm: (cliente: Cliente) => Promise<string | null>;
}) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setError(null);
  }

  const confirm = async () => {
    if (!cliente || busy) return;
    setBusy(true);
    setError(null);
    try {
      setError(await onConfirm(cliente));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={onCancel}
      showCloseButton={false}
      closeOnBackdropClick={!busy}
      closeOnEscape={!busy}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]"
    >
      <div className="p-6" style={erpSansStyle}>
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]" aria-hidden>
            <Trash2 className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className={`text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] ${strongText}`}>
              ¿Eliminar este contacto?
            </h2>
            <p id={descId} className={`mt-1.5 text-[14px] leading-[21px] ${mutedText}`}>
              Se eliminará <span className={`font-semibold ${strongText}`}>{cliente?.nombre ?? "el contacto"}</span> junto con sus
              contactos, direcciones y documento. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="cot-pop mt-4 rounded-[12px] border border-[#F6CFCF] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={erpSecondaryBtnClass}>
            Cancelar
          </button>
          <button type="button" onClick={confirm} disabled={busy} aria-busy={busy} className={erpDangerBtnClass}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
            {busy ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
