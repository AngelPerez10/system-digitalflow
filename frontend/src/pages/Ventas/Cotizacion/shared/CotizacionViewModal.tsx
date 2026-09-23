import { useId, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { AppModal, AppModalFooter, AppModalHeader } from "@/components/ui/modal-kit/ModalKit";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";

type CotizacionViewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

/** Modal de solo lectura (p. ej. detalle de «Enviada»). */
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
    <AppModal open={open} onClose={onClose} size="md" labelledBy={titleId} dismissOnBackdrop>
      <AppModalHeader
        icon={icon ?? <FileText className="size-5" />}
        tone="info"
        eyebrow={subtitle}
        title={title}
        titleId={titleId}
        onClose={onClose}
      />
      <div className="custom-scrollbar max-h-[60vh] overflow-y-auto px-6 pb-6 text-[14px] text-[#09090B] dark:text-[#E5E7EB]">
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
