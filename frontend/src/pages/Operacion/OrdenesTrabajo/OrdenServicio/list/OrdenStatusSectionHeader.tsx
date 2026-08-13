import {
  getOrdenStatusSectionStyles,
  type OrdenStatusSectionKey,
} from "../shared/ordenStatusSections";

function OrdenStatusSectionIcon({ statusKey }: { statusKey: OrdenStatusSectionKey }) {
  if (statusKey === "RESUELTA") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (statusKey === "PENDIENTE") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  statusKey: OrdenStatusSectionKey;
  label: string;
  count: number;
  headingId: string;
  as?: "div" | "h2";
};

/** Encabezado de sección del listado admin (barra + ícono + título + conteo). */
export function OrdenStatusSectionHeader({
  statusKey,
  label,
  count,
  headingId,
  as = "div",
}: Props) {
  const tone = getOrdenStatusSectionStyles(statusKey);
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
          <OrdenStatusSectionIcon statusKey={statusKey} />
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
