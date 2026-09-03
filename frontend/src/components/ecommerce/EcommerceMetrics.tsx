import { BoxIconLine, FileIcon } from "../../icons";
import type { useDashboardStats } from "./useDashboardStats";

type Props = Pick<ReturnType<typeof useDashboardStats>, "loading" | "mesActual">;

/* Mismo lenguaje que Órdenes de servicio: tarjeta blanca, línea de 1 px
   (#e7ded0), tinta cálida (#09090B), acento azul (#1B5CFF) y dorado
   (#E6A23C). En oscuro, la familia slate del contenedor. */

const cardClass =
  "rounded-[16px] border border-[#e7ded0] bg-white p-5 shadow-[0_6px_20px_-14px_rgba(9,9,11,0.16)] transition-colors hover:border-[#1B5CFF]/35 dark:border-[#273244] dark:bg-[#111827] md:p-6";

export default function EcommerceMetrics({ loading, mesActual }: Props) {
  const cotizaciones = loading ? "—" : mesActual.cotizacionesMes.toLocaleString("es-MX");
  const ordenes = loading ? "—" : mesActual.ordenesMes.toLocaleString("es-MX");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <article className={cardClass}>
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
          <FileIcon className="size-6" />
        </div>
        <div className="mt-5">
          <span className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">Cotizaciones del mes</span>
          <p className="mt-0.5 text-[11px] capitalize text-[#A1A1AA] dark:text-[#8EA0B8]">{mesActual.monthLabel}</p>
          <h4 className="mt-2 text-[28px] font-bold tabular-nums leading-none text-[#09090B] dark:text-[#F8FAFC]">{cotizaciones}</h4>
        </div>
      </article>

      <article className={cardClass}>
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
          <BoxIconLine className="size-6" />
        </div>
        <div className="mt-5">
          <span className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">Órdenes del mes</span>
          <p className="mt-0.5 text-[11px] capitalize text-[#A1A1AA] dark:text-[#8EA0B8]">{mesActual.monthLabel}</p>
          <h4 className="mt-2 text-[28px] font-bold tabular-nums leading-none text-[#09090B] dark:text-[#F8FAFC]">{ordenes}</h4>
        </div>
      </article>
    </div>
  );
}
