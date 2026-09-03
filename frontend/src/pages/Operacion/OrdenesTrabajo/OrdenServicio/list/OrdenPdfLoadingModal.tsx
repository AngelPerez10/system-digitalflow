import { useEffect, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { erpModalEyebrowClass } from "../../ordenTrabajoStyles";

type OrdenPdfLoadingModalProps = {
  open: boolean;
  /** true = descarga directa (orden resuelta); false = generación + vista previa */
  downloading?: boolean;
  title?: string;
  hint?: string;
  footerHint?: string;
};

export function OrdenPdfLoadingModal({
  open,
  downloading = false,
  title: titleProp,
  hint: hintProp,
  footerHint: footerHintProp,
}: OrdenPdfLoadingModalProps) {
  const [loadingProgress, setLoadingProgress] = useState(8);

  useEffect(() => {
    if (!open) {
      setLoadingProgress(8);
      return;
    }

    setLoadingProgress(8);
    const interval = window.setInterval(() => {
      setLoadingProgress((p) => {
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return () => setLoadingProgress(100);
  }, [open]);

  const titleId = useId();
  const pct = Math.min(open ? 99 : 100, Math.max(0, Math.round(loadingProgress)));
  const title = titleProp ?? (downloading ? "Descargando PDF" : "Generando PDF");
  const hint =
    hintProp ??
    (downloading
      ? "Se descargará el archivo al terminar. No cierre esta ventana."
      : "Puede incluir fotos y firmas. No cierre esta ventana.");
  const footerHint = footerHintProp ?? (downloading ? "Preparando descarga…" : "Preparando archivo…");

  return (
    <Modal
      isOpen={open}
      onClose={() => {}}
      showCloseButton={false}
      className="mx-4 max-w-md sm:mx-auto z-[100001]"
      ariaLabelledBy={titleId}
    >
      <div className="p-7 sm:p-8" aria-busy="true" aria-live="polite">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827]/90">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#E7E7EA] bg-[#FFFFFF] dark:border-[#273244] dark:bg-[#0f172a]">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#1B5CFF] dark:border-t-[#4B7CFF]"
                  aria-hidden
                />
                <svg className="relative h-7 w-7 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <p className={erpModalEyebrowClass}>Documento</p>
          <h2 id={titleId} className="mt-1 text-base font-semibold tracking-tight text-[#09090B] dark:text-[#f8fafc] sm:text-lg">{title}</h2>
          <p className="mt-1.5 max-w-xs text-xs text-[#6E6E77] dark:text-[#8ea0b8] sm:text-sm">{hint}</p>
          <div className="mt-6 w-full">
            <div className="flex items-center justify-between text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
              <span>Progreso</span>
              <span className="font-medium tabular-nums">{pct}%</span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={downloading ? "Progreso de descarga del PDF" : "Progreso de generación del PDF"}
            >
              <div
                className="h-full bg-[#1B5CFF] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">{footerHint}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
