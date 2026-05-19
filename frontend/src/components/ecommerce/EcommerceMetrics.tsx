import { BoxIconLine, FileIcon } from "../../icons";
import type { useDashboardStats } from "./useDashboardStats";

type Props = Pick<ReturnType<typeof useDashboardStats>, "loading" | "mesActual">;

export default function EcommerceMetrics({ loading, mesActual }: Props) {
  const cotizaciones = loading ? "-" : mesActual.cotizacionesMes.toLocaleString("es-MX");
  const ordenes = loading ? "-" : mesActual.ordenesMes.toLocaleString("es-MX");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
          <FileIcon className="size-6 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Cotizaciones del mes</span>
          <p className="mt-0.5 text-xs capitalize text-gray-400 dark:text-gray-500">{mesActual.monthLabel}</p>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{cotizaciones}</h4>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Órdenes del mes</span>
          <p className="mt-0.5 text-xs capitalize text-gray-400 dark:text-gray-500">{mesActual.monthLabel}</p>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{ordenes}</h4>
        </div>
      </div>
    </div>
  );
}
