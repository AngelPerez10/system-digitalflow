import { erpStatCardClass } from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";

type ReportesStats = {
  total: number;
  conSecciones: number;
  totalFotos: number;
  esteMes: number;
};

type Props = {
  stats: ReportesStats;
};

const labelClass =
  "text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#8EA0B8] sm:text-[10px]";
const valueClass =
  "mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg";

/** Tarjetas de resumen — mismo formato visual que Órdenes / Proyectos / Pólizas. */
export function ReportesPageStats({ stats }: Props) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      chip: "border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF]",
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
      chip: "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Fotos",
      value: stats.totalFotos,
      chip: "border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
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
      chip: "border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path
            d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ] as const;

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
      role="group"
      aria-label="Resumen de reportes"
    >
      {items.map((item) => (
        <div key={item.label} className={erpStatCardClass}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 ${item.chip}`}
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className={labelClass}>{item.label}</p>
              <p className={valueClass}>{item.value.toLocaleString("es-MX")}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
