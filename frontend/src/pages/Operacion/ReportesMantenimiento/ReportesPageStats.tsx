type ReportesStats = {
  total: number;
  conSecciones: number;
  totalFotos: number;
  esteMes: number;
};

type Props = {
  stats: ReportesStats;
};

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

/** Tarjetas de resumen — mismo formato visual que Proyectos / Órdenes. */
export function ReportesPageStats({ stats }: Props) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      tone: "text-[#ea580c] dark:text-[#fb923c]",
      border: "border-[#e7ded0] bg-white/90 dark:border-[#334155] dark:bg-[#0f172a]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path
            d="M4 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13 3v5h5M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Con secciones",
      value: stats.conSecciones,
      tone: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Fotos",
      value: stats.totalFotos,
      tone: "text-amber-800 dark:text-amber-200",
      border: "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/[0.08]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10.5" r="1.5" />
          <path d="M21 15l-4.5-4.5L9 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Este mes",
      value: stats.esteMes,
      tone: "text-sky-800 dark:text-sky-300",
      border: "border-sky-200/80 bg-sky-50/80 dark:border-sky-500/25 dark:bg-sky-500/[0.08]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
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
