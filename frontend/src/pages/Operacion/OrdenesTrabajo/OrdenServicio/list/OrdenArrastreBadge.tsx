import { CalendarClock } from "lucide-react";
import { isOrdenArrastre, labelMesOrden, labelMesOrdenCorto } from "../shared/ordenesPageUtils";

type OrdenArrastreBadgeProps = {
  orden: { fecha_inicio?: string | null; fecha_creacion?: string | null };
  selectedMonth: string;
  className?: string;
  /**
   * `compact` — «Retraso · jul» (fila de tabla junto al folio).
   * `inline` — «Retraso · jul 2026» (tarjetas con más ancho).
   */
  layout?: "compact" | "inline";
};

/**
 * Orden de un mes anterior que sigue abierta (retraso / arrastre al mes visible).
 * Tono ámbar + ícono CalendarClock: no depende solo del color.
 */
export function OrdenArrastreBadge({
  orden,
  selectedMonth,
  className = "",
  layout = "compact",
}: OrdenArrastreBadgeProps) {
  if (!isOrdenArrastre(orden, selectedMonth)) return null;
  const mesLabel = labelMesOrden(orden);
  const mesCorto = labelMesOrdenCorto(orden);
  const full = `Retraso: orden de ${mesLabel} que sigue abierta; se arrastra al mes actual`;
  const mes = layout === "inline" ? mesCorto : mesCorto.split(" ")[0];

  return (
    <span
      className={`inline-flex h-5 max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-[#FFF8EB] pl-1 pr-1.5 text-[10.5px] font-semibold text-[#8A5D0F] ring-1 ring-inset ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.35)] ${className}`}
      title={full}
      aria-label={full}
    >
      <CalendarClock className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="tracking-tight">Retraso</span>
      <span className="text-[#C9A227]/90 dark:text-[#F2C27A]/70" aria-hidden>
        ·
      </span>
      <span className="tabular-nums capitalize">{mes}</span>
    </span>
  );
}
