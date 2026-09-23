import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { AppProgressDialog } from "@/components/ui/modal-kit/ModalKit";

type OrdenPdfLoadingModalProps = {
  open: boolean;
  /** true = descarga directa (orden resuelta); false = generación + vista previa */
  downloading?: boolean;
  title?: string;
  hint?: string;
  /** Se conserva por compatibilidad; los pasos ya describen el avance. */
  footerHint?: string;
};

/**
 * Progreso al generar / descargar el PDF de una orden. El avance es simulado
 * (el servidor no reporta porcentaje) y se detiene en 95 % hasta terminar.
 */
export function OrdenPdfLoadingModal({
  open,
  downloading = false,
  title: titleProp,
  hint: hintProp,
}: OrdenPdfLoadingModalProps) {
  const [loadingProgress, setLoadingProgress] = useState(8);

  useEffect(() => {
    if (!open) {
      setLoadingProgress(8);
      return;
    }
    setLoadingProgress(8);
    const interval = window.setInterval(() => {
      setLoadingProgress((p) => Math.min(95, p + (p < 55 ? 10 : p < 80 ? 6 : 3)));
    }, 650);
    return () => window.clearInterval(interval);
  }, [open]);

  return (
    <AppProgressDialog
      open={open}
      icon={downloading ? <Download /> : <FileText />}
      title={titleProp ?? (downloading ? "Descargando PDF" : "Generando PDF")}
      description={
        hintProp ??
        (downloading
          ? "El archivo se descargará al terminar."
          : "Incluye fotos y firmas, por eso puede tardar unos segundos.")
      }
      progress={loadingProgress}
      steps={
        downloading
          ? ["Reuniendo los datos", "Generando el documento", "Preparando la descarga"]
          : ["Reuniendo los datos", "Generando el documento", "Preparando la vista previa"]
      }
    />
  );
}
