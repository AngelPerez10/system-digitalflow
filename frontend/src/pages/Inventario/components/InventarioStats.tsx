import type { ReactNode } from "react";
import {
  statCardClass,
  statIconWrapClass,
  statLabelClass,
  statValueClass,
  type StatTono,
} from "../shared/inventarioStyles";
import { AlertIcon, BarcodeIcon, BoxesIcon, HistoryIcon } from "./inventarioIcons";

type InventarioStatsProps = {
  totalItems: number;
  totalUnidades: number;
  sinIdentificar: number;
  movimientosHoy: number;
};

export default function InventarioStats({
  totalItems,
  totalUnidades,
  sinIdentificar,
  movimientosHoy,
}: InventarioStatsProps) {
  const iconClass = "h-5 w-5";
  const stats: { label: string; value: number; tono: StatTono; icon: ReactNode }[] = [
    {
      label: "Códigos distintos",
      value: totalItems,
      tono: "coral",
      icon: <BarcodeIcon className={iconClass} />,
    },
    {
      label: "Unidades en piso",
      value: totalUnidades,
      tono: "emerald",
      icon: <BoxesIcon className={iconClass} />,
    },
    {
      label: "Sin identificar",
      value: sinIdentificar,
      tono: sinIdentificar > 0 ? "amber" : "coral",
      icon: <AlertIcon className={iconClass} />,
    },
    {
      label: "Movimientos hoy",
      value: movimientosHoy,
      tono: "coral",
      icon: <HistoryIcon className={iconClass} />,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, tono, icon }) => (
        <div key={label} className={statCardClass}>
          <span className={statIconWrapClass(tono)} aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0">
            <dd className={statValueClass}>{value.toLocaleString("es-MX")}</dd>
            <dt className={statLabelClass}>{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}
