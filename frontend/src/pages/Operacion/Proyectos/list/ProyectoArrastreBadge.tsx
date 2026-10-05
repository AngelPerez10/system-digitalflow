import { OrdenArrastreBadge } from "../../OrdenesTrabajo/OrdenServicio/list/OrdenArrastreBadge";
import { isProyectoArrastre, proyectoRowFecha } from "../shared/proyectoListUtils";
import type { ProyectoRow } from "../shared/proyectoTypes";

/**
 * Proyecto de un mes anterior que sigue abierto (en proceso / pausado) y se
 * arrastra al mes actual. Misma insignia «Retraso · jul 2026» que Órdenes.
 */
export function ProyectoArrastreBadge({ row, arrastreMonth }: { row: ProyectoRow; arrastreMonth?: string }) {
  if (!arrastreMonth || !isProyectoArrastre(row, arrastreMonth)) return null;
  return <OrdenArrastreBadge orden={{ fecha_inicio: proyectoRowFecha(row) }} selectedMonth={arrastreMonth} noun="proyecto" />;
}
