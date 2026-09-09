import { isOrdenArrastre, labelMesOrden, labelMesOrdenCorto } from "../shared/ordenesPageUtils";

type OrdenArrastreBadgeProps = {
  orden: { fecha_inicio?: string | null; fecha_creacion?: string | null };
  selectedMonth: string;
  className?: string;
  /**
   * `stack` — dos líneas (cabecera angosta de tabla).
   * `inline` — una línea (cards móviles con más ancho).
   */
  layout?: "stack" | "inline";
};

/** Marca visual (texto + color; no solo color) para órdenes arrastradas al mes actual. */
export function OrdenArrastreBadge({
  orden,
  selectedMonth,
  className = "",
  layout = "stack",
}: OrdenArrastreBadgeProps) {
  if (!isOrdenArrastre(orden, selectedMonth)) return null;
  const mesLabel = labelMesOrden(orden);
  const mesCorto = labelMesOrdenCorto(orden);
  const full = `Orden de ${mesLabel}, arrastrada al mes actual`;

  if (layout === "inline") {
    return (
      <span
        className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-md border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
        title={full}
        aria-label={full}
      >
        Arrastre · {mesCorto}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex w-full min-w-0 max-w-full flex-col items-start gap-0 rounded-md border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
      title={full}
      aria-label={full}
    >
      <span className="whitespace-nowrap">Arrastre</span>
      <span className="max-w-full truncate font-normal tabular-nums">{mesCorto}</span>
    </span>
  );
}
