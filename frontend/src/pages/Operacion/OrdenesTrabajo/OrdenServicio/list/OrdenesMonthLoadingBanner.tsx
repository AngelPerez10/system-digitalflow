import { parseYearMonth } from "../shared/ordenesPageUtils";

function formatMonthLabel(mes: string): string {
  const ym = parseYearMonth(mes);
  if (!ym) return mes || "este mes";
  return new Date(ym.year, ym.month - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

type Props = {
  selectedMonth: string;
  className?: string;
};

/** Banner visible al cambiar de mes: evita que un vacío se lea como “no hay órdenes”. */
export function OrdenesMonthLoadingBanner({ selectedMonth, className = "" }: Props) {
  const label = formatMonthLabel(selectedMonth);
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-[#ead9b8] bg-[#fbf6ea] px-3.5 py-3 text-sm text-[#78350f] dark:border-amber-500/30 dark:bg-[#1f1a10] dark:text-amber-100 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
        aria-hidden
      />
      <span>
        Cargando órdenes de <span className="font-semibold capitalize">{label}</span>…
        <span className="mt-0.5 block text-xs font-normal text-[#92400e]/90 dark:text-amber-200/80">
          El filtro por mes sigue activo; espera un momento.
        </span>
      </span>
    </div>
  );
}
