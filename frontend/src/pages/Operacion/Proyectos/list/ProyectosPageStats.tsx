import type { ReactNode } from "react";
import { CircleCheck, CirclePause, FolderKanban, LoaderCircle } from "lucide-react";
import { erpStatCardClass } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { ProyectoStats } from "../shared/proyectoTypes";

type Props = {
  stats: ProyectoStats;
};

const ICON_NEUTRAL =
  "border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF]";
const ICON_BLUE =
  "border-sky-200/70 bg-sky-50/90 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300";
const ICON_ORANGE =
  "border-orange-200/80 bg-orange-50/90 text-orange-900 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-200";
const ICON_GREEN =
  "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300";

/** Misma tarjeta que `OrdenesPageStats` (Órdenes de trabajo). */
function StatCard({ label, value, iconClass, icon }: { label: string; value: number; iconClass: string; icon: ReactNode }) {
  return (
    <div className={`${erpStatCardClass} min-w-0`}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 ${iconClass}`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#6E6E77] sm:text-[10px]">
            {label}
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
            {value.toLocaleString("es-MX")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProyectosPageStats({ stats }: Props) {
  const iconSize = "h-4 w-4 sm:h-5 sm:w-5";
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4" role="group" aria-label="Resumen de proyectos del mes">
      <StatCard label="Proyectos del mes" value={stats.total} iconClass={ICON_NEUTRAL} icon={<FolderKanban className={iconSize} strokeWidth={1.8} />} />
      <StatCard label="En proceso" value={stats.enProceso} iconClass={ICON_BLUE} icon={<LoaderCircle className={iconSize} strokeWidth={1.8} />} />
      <StatCard label="Pausados" value={stats.pausados} iconClass={ICON_ORANGE} icon={<CirclePause className={iconSize} strokeWidth={1.8} />} />
      <StatCard label="Cerrados" value={stats.cerrados} iconClass={ICON_GREEN} icon={<CircleCheck className={iconSize} strokeWidth={1.8} />} />
    </div>
  );
}
