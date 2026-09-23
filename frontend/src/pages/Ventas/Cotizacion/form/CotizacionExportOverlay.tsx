import { FileSpreadsheet, FileText } from "lucide-react";
import { AppProgressDialog } from "@/components/ui/modal-kit/ModalKit";

type CotizacionExportOverlayProps = {
  /** Se muestra mientras `previewLoading || excelLoading`. */
  open: boolean;
  /** true = Excel, false = PDF. Cambia icono y textos. */
  isExcel: boolean;
  /** 0-100. */
  progress: number;
};

/**
 * Overlay de progreso para exportación (PDF / Excel).
 *
 * Puramente presentacional: no toca el estado del formulario, solo refleja
 * `previewLoading` / `excelLoading` y la barra de progreso simulada.
 */
export function CotizacionExportOverlay({ open, isExcel, progress }: CotizacionExportOverlayProps) {
  return (
    <AppProgressDialog
      open={open}
      tone={isExcel ? "success" : "info"}
      icon={isExcel ? <FileSpreadsheet className="size-5" /> : <FileText className="size-5" />}
      title={isExcel ? "Generando Excel" : "Generando PDF"}
      description="Tarda unos segundos. No cierres esta ventana."
      progress={progress}
      stepLabel={
        isExcel
          ? "Armando el archivo XLSX…"
          : progress < 40
            ? "Guardando la cotización…"
            : "Preparando el documento…"
      }
    />
  );
}
