type Props = {
  active: boolean;
  phaseLabel: string;
  /** Fase 0 = PDF, 1 = correo (para la barra visual). */
  phaseIndex: 0 | 1;
};

/**
 * Overlay de progreso al enviar PDF por correo.
 * Intrax: naranja #ff801f + panel crema; respeta prefers-reduced-motion.
 */
export default function EnviarPdfSendingOverlay({
  active,
  phaseLabel,
  phaseIndex,
}: Props) {
  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#fffdfa]/92 px-6 backdrop-blur-[2px] dark:bg-[#0b1220]/92"
      role="status"
      aria-live="assertive"
      aria-busy="true"
      aria-atomic="true"
    >
      <div className="w-full max-w-[16rem] space-y-4 text-center">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full border-2 border-[#ff801f]/25 motion-safe:animate-ping"
            aria-hidden="true"
          />
          <span
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff801f] text-black shadow-[0_8px_24px_-6px_rgba(255,128,31,0.55)]"
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5 motion-safe:animate-[spin_1.1s_linear_infinite]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
            >
              <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c]">
            Enviando
          </p>
          <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            {phaseLabel}
          </p>
          <p className="text-xs text-[#78716c] dark:text-[#94a3b8]">
            No cierres esta ventana; suele tomar unos segundos.
          </p>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#e7ded0] dark:bg-[#334155]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff801f] to-[#ffa057] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: phaseIndex === 0 ? "48%" : "88%" }}
          />
        </div>

        <ol className="flex justify-center gap-4 text-[10px] font-semibold uppercase tracking-wide text-[#a8a29e] dark:text-[#64748b]">
          <li
            className={
              phaseIndex === 0
                ? "text-[#ea580c] dark:text-[#fb923c]"
                : "text-emerald-700 dark:text-emerald-400"
            }
          >
            1 · PDF
          </li>
          <li
            className={
              phaseIndex === 1
                ? "text-[#ea580c] dark:text-[#fb923c]"
                : phaseIndex === 0
                  ? ""
                  : "text-emerald-700 dark:text-emerald-400"
            }
          >
            2 · Correo
          </li>
        </ol>
      </div>
    </div>
  );
}

export const ENVIAR_PDF_PHASE_PDF = "Generando el PDF…";
export const ENVIAR_PDF_PHASE_MAIL = "Enviando el correo…";
