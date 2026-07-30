import type { ProyectoStats } from "./proyectoTypes";
import { erpStatCardClass } from "../OrdenesTrabajo/ordenTrabajoStyles";

type Props = {
  stats: ProyectoStats;
};

const statLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]";

const statValueClass =
  "mt-0.5 text-lg font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-xl";

export function ProyectosPageStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={statLabelClass}>Total proyectos</p>
            <p className={statValueClass}>{stats.total}</p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={statLabelClass}>En proceso</p>
            <p className={statValueClass}>{stats.enProceso}</p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M10 9v6m4-6v6M5 5h14v14H5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={statLabelClass}>Pausados</p>
            <p className={statValueClass}>{stats.pausados}</p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={statLabelClass}>Cerrados</p>
            <p className={statValueClass}>{stats.cerrados}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
