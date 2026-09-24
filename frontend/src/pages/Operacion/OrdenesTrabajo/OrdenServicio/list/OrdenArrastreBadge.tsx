import { History } from "lucide-react";
import { isOrdenArrastre, labelMesOrden, labelMesOrdenCorto } from "../shared/ordenesPageUtils";

type OrdenArrastreBadgeProps = {
  orden: { fecha_inicio?: string | null; fecha_creacion?: string | null };
  selectedMonth: string;
  className?: string;
  /**
   * `compact` — solo «Desde ago» (fila de tabla junto al folio).
   * `inline` — «Arrastrada · desde ago 2026» (tarjetas con más ancho).
   */
  layout?: "compact" | "inline";
};

/**
 * Orden de un mes anterior que sigue abierta y se arrastra al mes visible.
 * Ícono de historial + texto (no depende solo del color).
 */
export function OrdenArrastreBadge({ orden, selectedMonth, className = "", layout = "compact" }: OrdenArrastreBadgeProps) {
  if (!isOrdenArrastre(orden, selectedMonth)) return null;
  const mesLabel = labelMesOrden(orden);
  const mesCorto = labelMesOrdenCorto(orden);
  const full = `Orden de ${mesLabel} que sigue abierta; se arrastra al mes actual`;
  const mes = layout === "inline" ? mesCorto : mesCorto.split(" ")[0];

  return (
    <span
      className={`inline-flex h-[18px] max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#FAFAFA] pl-1 pr-1.5 text-[10.5px] font-semibold text-[#3F3F46] ring-1 ring-inset ring-[#E4E4E7] dark:bg-white/[0.04] dark:text-[#D6DEEA] dark:ring-[#273244] ${className}`}
      title={full}
      aria-label={full}
    >
      <History className="size-3 shrink-0 text-[#C27A12] dark:text-[#E6A23C]" aria-hidden />
      {layout === "inline" ? <span>Arrastrada ·</span> : null}
      <span className="tabular-nums">desde {mes}</span>
    </span>
  );
}
