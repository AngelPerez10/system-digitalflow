import SendPdfDialog from "@/components/ui/modal-kit/SendPdfDialog";
import { displayProyectoFolio, estadoProyectoLabel } from "../shared/proyectoFormUtils";
import type { ProyectoEstado } from "../shared/proyectoTypes";

export type ProyectoEnviarPdfTarget = {
  id: number;
  folio?: string | null;
  cliente?: string;
  estado?: ProyectoEstado | string;
};

type Props = {
  open: boolean;
  proyecto: ProyectoEnviarPdfTarget | null;
  initialCorreo?: string;
  onClose: () => void;
  onSent?: (correo: string) => void;
  onError?: (message: string) => void;
};

/** «Enviar PDF por correo» con el diálogo compartido de la app. */
export default function ProyectoEnviarPdfModal({ open, proyecto, initialCorreo = "", onClose, onSent, onError }: Props) {
  const id = proyecto?.id ?? null;
  const folio = displayProyectoFolio(proyecto?.folio);
  const estado = String(proyecto?.estado || "").trim() as ProyectoEstado;

  return (
    <SendPdfDialog
      open={open}
      onClose={onClose}
      recordId={id}
      suggestedEmailUrl={`/api/proyectos/${id}/correo-sugerido/`}
      sendUrl={`/api/proyectos/${id}/enviar-pdf/`}
      eyebrow={`Proyecto · ${estadoProyectoLabel(estado || "en_proceso")}`}
      fileName={
        folio && folio !== "—" ? `Proyecto_${folio}.pdf` : id != null ? `Proyecto_${id}.pdf` : "Proyecto.pdf"
      }
      recipientLabel={String(proyecto?.cliente || "").trim() || "Sin cliente"}
      initialCorreo={initialCorreo}
      onSent={(correo) => onSent?.(correo)}
      onError={onError}
    />
  );
}
