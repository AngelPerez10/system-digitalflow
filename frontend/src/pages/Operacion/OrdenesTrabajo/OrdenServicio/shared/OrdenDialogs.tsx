/**
 * Modales de Órdenes de servicio sobre el kit común (`@/components/ui/modal-kit`).
 *
 * Mismas props que los de `../../OrdenTrabajoModals` para poder cambiarlos sólo
 * con el import; aquéllos siguen intactos porque también los usan Proyectos,
 * Pólizas, Levantamiento y Reportes de mantenimiento.
 */
import { useId, useState, type ReactNode } from "react";
import { FileText, ImageOff, Trash2 } from "lucide-react";
import {
  AppModal,
  AppModalBody,
  AppModalContext,
  AppModalFooter,
  AppModalHeader,
  AppSpinner,
} from "@/components/ui/modal-kit/ModalKit";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";

/* --------------------------------------------------------------------------
   Eliminar orden
   -------------------------------------------------------------------------- */

type OrdenDeleteDialogProps = {
  open: boolean;
  clienteLabel: string;
  onCancel: () => void;
  /** La página cierra el diálogo si el borrado sale bien; si falla lo deja abierto. */
  onConfirm: () => void | Promise<unknown>;
};

export function OrdenDeleteDialog({ open, clienteLabel, onCancel, onConfirm }: OrdenDeleteDialogProps) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal open={open} onClose={onCancel} busy={busy} labelledBy={titleId} describedBy={descId}>
      <AppModalHeader
        icon={<Trash2 className="size-5" strokeWidth={1.9} />}
        tone="danger"
        title="¿Eliminar esta orden?"
        titleId={titleId}
        description="Se borrará de forma permanente con sus fotos, firma y equipos. Esto no se puede deshacer."
        descriptionId={descId}
      />
      <AppModalBody>
        <AppModalContext rows={[{ label: "Cliente", value: clienteLabel || "—", strong: true }]} />
      </AppModalBody>
      <AppModalFooter>
        <button type="button" onClick={onCancel} disabled={busy} className={appModalBtn.secondary}>
          Cancelar
        </button>
        <button type="button" onClick={() => void handleConfirm()} disabled={busy} className={appModalBtn.danger}>
          {busy ? <AppSpinner /> : <Trash2 className="size-4" aria-hidden />}
          {busy ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </AppModalFooter>
    </AppModal>
  );
}

/* --------------------------------------------------------------------------
   Detalle de solo lectura (problemática, servicios, comentario…)
   -------------------------------------------------------------------------- */

type OrdenDetailModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function OrdenDetailModal({ open, onClose, title, subtitle, icon, children }: OrdenDetailModalProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <AppModal open={open} onClose={onClose} size="md" labelledBy={titleId} describedBy={descId} dismissOnBackdrop>
      <AppModalHeader
        icon={icon ?? <FileText className="size-5" />}
        tone="info"
        title={title}
        titleId={titleId}
        description={subtitle}
        descriptionId={descId}
        onClose={onClose}
        divided
      />
      <div className="custom-scrollbar max-h-[60vh] overflow-y-auto px-6 py-5 text-[14px] leading-relaxed text-[#27272A] dark:text-[#E5E7EB] [&_pre]:whitespace-pre-wrap [&_pre]:font-sans [&_pre]:text-[14px] [&_pre]:leading-relaxed [&_svg]:shrink-0">
        {children}
      </div>
      <AppModalFooter>
        <button type="button" onClick={onClose} className={appModalBtn.secondary}>
          Cerrar
        </button>
      </AppModalFooter>
    </AppModal>
  );
}

/* --------------------------------------------------------------------------
   Eliminar foto
   -------------------------------------------------------------------------- */

type OrdenPhotoDeleteDialogProps = {
  open: boolean;
  /** Lo controla la pestaña: mientras es true no se puede cerrar. */
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OrdenPhotoDeleteDialog({ open, deleting, onCancel, onConfirm }: OrdenPhotoDeleteDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <AppModal open={open} onClose={onCancel} busy={deleting} labelledBy={titleId} describedBy={descId}>
      <AppModalHeader
        icon={<ImageOff className="size-5" strokeWidth={1.9} />}
        tone="danger"
        title={deleting ? "Eliminando la foto…" : "¿Eliminar esta foto?"}
        titleId={titleId}
        description={
          deleting ? "Espera un momento; puede tardar unos segundos." : "Se quitará de la orden. Esto no se puede deshacer."
        }
        descriptionId={descId}
      />
      <AppModalFooter>
        <button type="button" onClick={onCancel} disabled={deleting} className={appModalBtn.secondary}>
          Cancelar
        </button>
        <button type="button" onClick={onConfirm} disabled={deleting} className={appModalBtn.danger}>
          {deleting ? <AppSpinner /> : <Trash2 className="size-4" aria-hidden />}
          {deleting ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </AppModalFooter>
    </AppModal>
  );
}
