import {
  getProyectoStatusSectionStyles,
  type ProyectoStatusSectionKey,
} from "../shared/proyectoStatusSections";

function ProyectoStatusSectionIcon({ statusKey }: { statusKey: ProyectoStatusSectionKey }) {
  if (statusKey === "CERRADO") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (statusKey === "PAUSADO") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M10 8v8M14 8v8" strokeLinecap="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (statusKey === "EN_PROCESO") {
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
  statusKey: ProyectoStatusSectionKey;
  label: string;
  count: number;
  headingId: string;
  as?: "div" | "h2";
};

/** Encabezado de sección del listado (barra + ícono + título + conteo). */
export function ProyectoStatusSectionHeader({
  statusKey,
  label,
  count,
  headingId,
  as = "div",
}: Props) {
  const tone = getProyectoStatusSectionStyles(statusKey);
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
          <ProyectoStatusSectionIcon statusKey={statusKey} />
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
        aria-label={`${count} proyectos`}
      >
        {count}
      </span>
    </div>
  );
}
