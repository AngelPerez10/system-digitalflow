import { isOrdenArrastre, labelMesOrden } from "../shared/ordenesPageUtils";

type OrdenArrastreBadgeProps = {
  orden: { fecha_inicio?: string | null; fecha_creacion?: string | null };
  selectedMonth: string;
  className?: string;
};

/** Marca visual (texto + color; no solo color) para órdenes arrastradas al mes actual. */
export function OrdenArrastreBadge({
  orden,
  selectedMonth,
  className = "",
}: OrdenArrastreBadgeProps) {
  if (!isOrdenArrastre(orden, selectedMonth)) return null;
  const mesLabel = labelMesOrden(orden);
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-md border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
      title={`Orden de ${mesLabel}, arrastrada al mes actual`}
    >
      Arrastre · {mesLabel}
    </span>
  );
}
