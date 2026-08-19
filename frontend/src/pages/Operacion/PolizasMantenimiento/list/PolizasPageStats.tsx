import type { PolizaStats } from "./polizaListTypes";

type Props = {
  stats: PolizaStats;
};

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

export function PolizasPageStats({ stats }: Props) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      tone: "text-[#ea580c] dark:text-[#fb923c]",
      border: "border-[#e7ded0] bg-white/90 dark:border-[#334155] dark:bg-[#0f172a]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Vigentes",
      value: stats.vigentes,
      tone: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Próxima visita",
      value: stats.proximaVisita,
      tone: "text-amber-800 dark:text-amber-200",
      border: "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/[0.08]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Vencidas",
      value: stats.vencidas,
      tone: "text-rose-800 dark:text-rose-300",
      border: "border-rose-200/70 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/[0.08]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 xl:gap-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-4"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${item.border} ${item.tone}`}
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className={sectionLabelClass}>{item.label}</p>
              <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-lg">
                {item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
