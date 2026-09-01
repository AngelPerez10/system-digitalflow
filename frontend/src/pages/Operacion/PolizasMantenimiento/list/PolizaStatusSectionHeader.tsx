import type { PolizaEstado } from "./polizaListTypes";
import { POLIZA_ESTADO_ICON } from "./polizaEstadoIcons";
import { getPolizaStatusSectionStyles } from "./polizaStatusSections";

type Props = {
  estado: PolizaEstado;
  label: string;
  count: number;
  headingId: string;
  as?: "div" | "h2";
};

/** Encabezado de sección del listado (barra + ícono + título + conteo). Mismo patrón que Órdenes de Trabajo. */
export function PolizaStatusSectionHeader({ estado, label, count, headingId, as = "div" }: Props) {
  const tone = getPolizaStatusSectionStyles(estado);
  const TitleTag = as;

  return (
    <div
      className={`relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 ${tone.shell}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`} aria-hidden />
      <div className="flex min-w-0 items-center gap-2.5 pl-1.5 sm:gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.06] bg-white/80 dark:border-white/10 dark:bg-black/20 ${tone.icon}`}
        >
          {POLIZA_ESTADO_ICON[estado]}
        </span>
        <TitleTag
          id={headingId}
          className={`min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${tone.label}`}
        >
          {label}
        </TitleTag>
      </div>
      <span
        className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold tabular-nums ${tone.badge}`}
        aria-label={`${count} pólizas`}
      >
        {count}
      </span>
    </div>
  );
}
