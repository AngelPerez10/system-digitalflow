import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import SendPdfDialog from "@/components/ui/modal-kit/SendPdfDialog";

export type CotizacionEnviarPdfTarget = {
  id: number;
  idx?: number;
  cliente?: string;
  status?: string;
};

export type CotizacionEnvioRegistrado = {
  enviado_por_username?: string;
  enviado_por_full_name?: string;
  enviado_en?: string;
  enviado_comentario?: string;
};

type Props = {
  open: boolean;
  cotizacion: CotizacionEnviarPdfTarget | null;
  initialCorreo?: string;
  onClose: () => void;
  onSent?: (correo: string, envio?: CotizacionEnvioRegistrado) => void;
  onError?: (message: string) => void;
};

export default function CotizacionEnviarPdfModal({
  open,
  cotizacion,
  initialCorreo = "",
  onClose,
  onSent,
  onError,
}: Props) {
  const folio = formatDocumentFolio(
    FOLIO_SERIE.cotizacion,
    cotizacion?.idx != null && Number(cotizacion.idx) > 0 ? cotizacion.idx : cotizacion?.id
  );
  const statusLabel = String(cotizacion?.status || "").trim().toUpperCase();
  const id = cotizacion?.id ?? null;

  return (
    <SendPdfDialog
      open={open}
      onClose={onClose}
      recordId={id}
      suggestedEmailUrl={`/api/cotizaciones/${id}/correo-sugerido/`}
      sendUrl={`/api/cotizaciones/${id}/enviar-pdf/`}
      eyebrow={
        statusLabel === "AUTORIZADA"
          ? "Cotización autorizada"
          : statusLabel === "PENDIENTE"
            ? "Cotización pendiente"
            : "Cotización"
      }
      fileName={folio && folio !== "—" ? `Cotizacion_${folio}.pdf` : "Cotizacion.pdf"}
      recipientLabel={String(cotizacion?.cliente || "").trim() || "Sin cliente"}
      initialCorreo={initialCorreo}
      onSent={(correo, data) => onSent?.(correo, data as CotizacionEnvioRegistrado | undefined)}
      onError={onError}
    />
  );
}
