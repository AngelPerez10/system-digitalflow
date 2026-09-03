import { Modal } from "@/components/ui/modal";

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
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <Modal
      isOpen={open}
      onClose={() => {}}
      showCloseButton={false}
      ariaLabel="Exportando documento"
      className="max-w-md mx-4 sm:mx-auto"
    >
      <div className="p-7 sm:p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="relative flex items-center justify-center w-[76px] h-[76px] rounded-2xl border border-[#E7E7EA]/80 dark:border-white/10 bg-[#FAFAFA] dark:bg-[#111827]/80">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#0f172a] border border-[#EDEDED] dark:border-[#273244] dark:border-white/5">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1B5CFF] dark:border-t-[#4B7CFF] animate-spin" />
                <div className="relative flex items-center justify-center">
                  {isExcel ? (
                    <svg className="h-8 w-8 text-emerald-700 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M8.5 13h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M8.5 16.5H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M8.5 10H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8 text-[#1B5CFF] dark:text-[#4B7CFF]"
                      viewBox="0 0 512 512"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105z" />
                      <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
                      <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
                      <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-base font-semibold tracking-tight text-[#09090B] dark:text-[#f8fafc] sm:text-lg">
            {isExcel ? "Generando Excel" : "Generando PDF"}
          </h3>
          <p className="mt-1.5 text-xs text-[#6E6E77] dark:text-[#8ea0b8] sm:text-sm">
            Esto puede tardar unos segundos. No cierres esta ventana.
          </p>

          <div className="mt-6 w-full">
            <div className="flex items-center justify-between text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
              <span>Progreso</span>
              <span className="tabular-nums font-medium">{Math.min(99, Math.round(pct))}%</span>
            </div>
            <div className="mt-2 w-full rounded-full h-2 overflow-hidden bg-[#EDEDED] dark:bg-[#0f172a]/80 border border-[#E7E7EA]/60 dark:border-white/[0.06]">
              <div
                className="h-full bg-[#1B5CFF] dark:bg-[#1B5CFF] transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
              {isExcel ? "Preparando archivo XLSX…" : "Generando archivo de cotización…"}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
