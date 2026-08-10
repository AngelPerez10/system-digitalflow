import { seccionBadgeClass } from "../shared/inventarioStyles";
import { seccionMeta, seccionShortLabel } from "../shared/inventarioSecciones";

type InventarioSeccionBadgeProps = {
  seccion: string | null | undefined;
  /** Muestra “Sin sección” cuando no hay slug (útil en móvil). */
  showEmpty?: boolean;
  className?: string;
  /** Preferir etiqueta corta en layouts densos. */
  compact?: boolean;
};

export default function InventarioSeccionBadge({
  seccion,
  showEmpty = false,
  className = "",
  compact = false,
}: InventarioSeccionBadgeProps) {
  const meta = seccionMeta(seccion);
  if (!meta) {
    if (!showEmpty) return null;
    return (
      <span className={`${seccionBadgeClass("empty")} ${className}`.trim()} title="Sin sección">
        Sin sección
      </span>
    );
  }

  const label = compact ? seccionShortLabel(meta.slug) || meta.label : meta.label;
  return (
    <span className={`${seccionBadgeClass(meta.tono)} ${className}`.trim()} title={meta.label}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
