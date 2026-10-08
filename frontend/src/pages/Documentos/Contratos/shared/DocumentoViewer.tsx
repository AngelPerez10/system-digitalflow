import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { objectUrlsForPdfViewer } from "@/utils/pdfViewerPreview";

type Props = {
  blob: Blob | null;
  title: string;
  className?: string;
};

/**
 * Muestra el contrato en un iframe. Si el servidor no tiene motor de PDF
 * devuelve HTML: se aísla con `sandbox` (sin scripts ni navegación); al PDF no
 * se le pone sandbox porque el visor de Chrome no funciona dentro de uno.
 */
export default function DocumentoViewer({ blob, title, className }: Props) {
  const esPdf = blob?.type === "application/pdf";
  const [urls, setUrls] = useState<{ previewUrl: string; downloadUrl: string } | null>(null);

  // La URL se crea y se revoca en el mismo efecto: con useMemo, el doble montaje
  // de StrictMode revocaba la URL que el iframe seguía usando.
  useEffect(() => {
    if (!blob) {
      setUrls(null);
      return;
    }
    const next =
      blob.type === "application/pdf"
        ? objectUrlsForPdfViewer(blob)
        : (() => {
            const url = URL.createObjectURL(blob);
            return { previewUrl: url, downloadUrl: url };
          })();
    setUrls(next);
    return () => URL.revokeObjectURL(next.downloadUrl);
  }, [blob]);

  if (!urls) return null;
  return (
    <iframe
      title={title}
      src={urls.previewUrl}
      className={cn("h-full w-full border-0 bg-white", className)}
      {...(esPdf ? {} : { sandbox: "" })}
      referrerPolicy="no-referrer"
    />
  );
}

