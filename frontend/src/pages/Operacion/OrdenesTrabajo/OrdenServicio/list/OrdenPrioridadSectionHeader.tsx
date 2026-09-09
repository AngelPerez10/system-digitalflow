import {
  getOrdenPrioridadSectionStyles,
  type OrdenPrioridadSectionKey,
} from "../shared/ordenPrioridadSections";

function OrdenPrioridadIcon({ statusKey }: { statusKey: OrdenPrioridadSectionKey }) {
  if (statusKey === "ALTA") {
    // Llama: urgencia.
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path
          d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C9 10 10 11 10.5 12c.4-2 1.5-3.6 1.5-9Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (statusKey === "MEDIA") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 9h14M5 15h14" strokeLinecap="round" />
      </svg>
    );
  }
  if (statusKey === "BAJA") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  statusKey: OrdenPrioridadSectionKey;
  label: string;
  count: number;
  headingId: string;
  as?: "div" | "h2";
};

/** Encabezado de sección del listado admin agrupado por prioridad de bolsa. */
export function OrdenPrioridadSectionHeader({
  statusKey,
  label,
  count,
  headingId,
  as = "div",
}: Props) {
  const tone = getOrdenPrioridadSectionStyles(statusKey);
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
          <OrdenPrioridadIcon statusKey={statusKey} />
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
        aria-label={`${count} órdenes`}
      >
        {count}
      </span>
    </div>
  );
}
