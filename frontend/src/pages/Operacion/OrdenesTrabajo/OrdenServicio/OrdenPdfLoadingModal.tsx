import { useEffect, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { sectionLabelOrangeClass } from "../ordenTrabajoStyles";

type OrdenPdfLoadingModalProps = {
  open: boolean;
  /** true = descarga directa (orden resuelta); false = generación + vista previa */
  downloading?: boolean;
};

export function OrdenPdfLoadingModal({ open, downloading = false }: OrdenPdfLoadingModalProps) {
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
  const title = downloading ? "Descargando PDF" : "Generando PDF";
  const hint = downloading
    ? "Se descargará el archivo al terminar. No cierre esta ventana."
    : "Puede incluir fotos y firmas. No cierre esta ventana.";
  const footerHint = downloading ? "Preparando descarga…" : "Preparando archivo…";

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
            <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#111a2b]/90">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#e2d9ca] bg-[#fffdfa] dark:border-[#334155] dark:bg-[#0f172a]">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#ff801f] dark:border-t-[#ffa057]"
                  aria-hidden
                />
                <svg className="relative h-7 w-7 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <p className={sectionLabelOrangeClass}>Documento</p>
          <h2 id={titleId} className="mt-1 text-base font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-lg">{title}</h2>
          <p className="mt-1.5 max-w-xs text-xs text-[#78716c] dark:text-[#8ea0b8] sm:text-sm">{hint}</p>
          <div className="mt-6 w-full">
            <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#8ea0b8]">
              <span>Progreso</span>
              <span className="font-medium tabular-nums">{pct}%</span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[#e2d9ca] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={downloading ? "Progreso de descarga del PDF" : "Progreso de generación del PDF"}
            >
              <div
                className="h-full bg-[#ff801f] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">{footerHint}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
