import SendPdfDialog from "@/components/ui/modal-kit/SendPdfDialog";
import { displayOrdenFolio } from "../shared/useOrdenesShared";

export type OrdenEnviarPdfTarget = {
  id: number;
  folio?: string | null;
  idx?: number;
  cliente?: string;
  cliente_id?: number | null;
  status?: string;
};

type Props = {
  open: boolean;
  orden: OrdenEnviarPdfTarget | null;
  /** Correo precargado desde el listado local (cliente / contacto principal). */
  initialCorreo?: string;
  onClose: () => void;
  onSent?: (correo: string) => void;
  onError?: (message: string) => void;
};

export default function OrdenEnviarPdfModal({ open, orden, initialCorreo = "", onClose, onSent, onError }: Props) {
  const folio = displayOrdenFolio(orden || {});
  const id = orden?.id ?? null;
  const status = String(orden?.status || "").trim().toLowerCase();

  return (
    <SendPdfDialog
      open={open}
      onClose={onClose}
      recordId={id}
      suggestedEmailUrl={`/api/ordenes/${id}/correo-sugerido/`}
      sendUrl={`/api/ordenes/${id}/enviar-pdf/`}
      eyebrow={
        status === "resuelto"
          ? "Orden de servicio resuelta"
          : status === "pendiente"
            ? "Orden de servicio pendiente"
            : "Orden de servicio"
      }
      fileName={
        folio && folio !== "—"
          ? `Orden_${folio}.pdf`
          : id != null
            ? `Ordenes_Servicio_${id}.pdf`
            : "Orden_Servicio.pdf"
      }
      recipientLabel={String(orden?.cliente || "").trim() || "Sin cliente"}
      initialCorreo={initialCorreo}
      onSent={(correo) => onSent?.(correo)}
      onError={onError}
    />
  );
}
