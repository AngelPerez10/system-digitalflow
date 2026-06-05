import type { OrdenStats } from "./ordenesPageTypes";
import { erpStatCardClass } from "../ordenTrabajoStyles";

type Props = {
  stats: OrdenStats;
  showEstrella?: boolean;
};

export function OrdenesPageStats({ stats, showEstrella = true }: Props) {
  const gridClass = showEstrella
    ? "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4"
    : "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3";

  return (
    <div className={gridClass}>
      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M6 6h12" />
              <path d="M6 12h12" />
              <path d="M6 18h12" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Órdenes del mes</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.monthTotal}</p>
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
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Completadas</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.monthCompleted}</p>
          </div>
        </div>
      </div>

      <div className={erpStatCardClass}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-200/80 bg-orange-50/90 text-orange-900 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-200 sm:h-10 sm:w-10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Pendientes</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.monthPending}</p>
          </div>
        </div>
      </div>

      {showEstrella ? (
        <div className={erpStatCardClass}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Cliente estrella</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white">{stats.estrella}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Servicios: {stats.estrellaServices}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
