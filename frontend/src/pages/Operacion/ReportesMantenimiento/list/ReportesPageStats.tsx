import { Camera, CheckCheck, FileText, Users } from "lucide-react";
import { erpStatCardClass } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { ResumenReportes } from "./reporteListUtils";

type Props = {
  stats: ResumenReportes;
};

const items = (s: ResumenReportes) =>
  [
    {
      label: "Reportes del mes",
      value: s.total,
      icon: FileText,
      chip: "border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF]",
    },
    {
      label: "Con evidencia",
      value: s.conEvidencia,
      icon: CheckCheck,
      chip: "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      label: "Fotos",
      value: s.totalFotos,
      icon: Camera,
      chip: "border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
    },
    {
      label: "Técnicos",
      value: s.tecnicos,
      icon: Users,
      chip: "border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
    },
  ] as const;

/** Tarjetas de resumen del mes — mismo formato visual que Proyectos / Órdenes. */
export function ReportesPageStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="group" aria-label="Resumen de reportes del mes">
      {items(stats).map(({ label, value, icon: Icono, chip }) => (
        <div key={label} className={erpStatCardClass}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 ${chip}`}>
              <Icono className="size-4 sm:size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] sm:text-[10px]">{label}</p>
              <p key={value} className="cot-flash mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
                {value.toLocaleString("es-MX")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
