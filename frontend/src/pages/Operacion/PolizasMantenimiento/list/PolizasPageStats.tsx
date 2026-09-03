import type { PolizaStats } from "./polizaListTypes";
import { erpStatCardClass } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";

type Props = {
  stats: PolizaStats;
};

export function PolizasPageStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4" role="group" aria-label="Resumen de pólizas">
      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF] sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#6E6E77] sm:text-[10px]">Total</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
              {stats.total.toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#6E6E77] sm:text-[10px]">Vigentes</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
              {stats.vigentes.toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#6E6E77] sm:text-[10px]">Próxima visita</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
              {stats.proximaVisita.toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200/70 bg-rose-50/90 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#6E6E77] sm:text-[10px]">Vencidas</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
              {stats.vencidas.toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
