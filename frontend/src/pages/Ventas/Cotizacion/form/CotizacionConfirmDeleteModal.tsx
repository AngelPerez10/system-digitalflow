import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { AppConfirmDialog } from "@/components/ui/modal-kit/ModalKit";

export type CotizacionConfirmDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  title: string;
  description: ReactNode;
  /** Contexto opcional debajo del texto (qué se elimina). */
  detail?: ReactNode;
  confirmLabel?: string;
};

/**
 * Confirmación genérica de borrado (partida, categoría o cotización).
 * Presentacional: el padre decide qué borrar al confirmar.
 */
export function CotizacionConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  detail,
  confirmLabel = "Sí, eliminar",
}: CotizacionConfirmDeleteModalProps) {
  return (
    <AppConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      tone="danger"
      icon={<Trash2 className="size-5" strokeWidth={1.9} />}
      title={title}
      description={description}
      detail={detail}
      confirmLabel={confirmLabel}
      busyLabel="Eliminando…"
    />
  );
}
