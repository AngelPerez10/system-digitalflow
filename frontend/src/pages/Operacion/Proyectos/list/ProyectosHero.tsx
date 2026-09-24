import { ChevronLeft, ChevronRight, FolderKanban } from "lucide-react";
import { focusRing } from "../shared/proyectoTokens";
import { formatYearMonthLabel } from "../shared/proyectoListUtils";

type Props = {
  /** Vista del técnico: «Mis proyectos». */
  tecnicoView: boolean;
  userFirstName: string;
  selectedMonth: string;
  onShiftMonth: (delta: number) => void;
};

const monthBtn = `cot-press inline-flex size-9 items-center justify-center rounded-[9px] text-white/70 hover:bg-white/10 hover:text-white ${focusRing}`;

export function MonthSwitcher({
  selectedMonth,
  onShiftMonth,
  tone = "navy",
}: {
  selectedMonth: string;
  onShiftMonth: (delta: number) => void;
  tone?: "navy" | "light";
}) {
  const light = tone === "light";
  const btnClass = light
    ? `cot-press inline-flex size-11 items-center justify-center rounded-[10px] text-[#52525B] hover:bg-white hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] ${focusRing}`
    : monthBtn;
  return (
    <div
      className={`flex items-center justify-between gap-1 rounded-[12px] p-1 ${
        light ? "border border-[#E4E4E7] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]" : "bg-white/[0.08]"
      }`}
      role="group"
      aria-label="Mes del listado"
    >
      <button type="button" className={btnClass} onClick={() => onShiftMonth(-1)} aria-label="Mes anterior">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <span
        key={selectedMonth}
        className={`cot-fade min-w-[9.5rem] flex-1 text-center text-[14px] font-medium capitalize ${
          light ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-white/90"
        }`}
        aria-live="polite"
      >
        {formatYearMonthLabel(selectedMonth)}
      </span>
      <button type="button" className={btnClass} onClick={() => onShiftMonth(1)} aria-label="Mes siguiente">
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Banda marina (tablet y escritorio): título y mes del listado. */
export function ProyectosHero({ tecnicoView, userFirstName, selectedMonth, onShiftMonth }: Props) {
  return (
    <header className="cot-sheen relative hidden overflow-hidden rounded-[24px] bg-[#17235B] text-white dark:bg-[#1B2A63] sm:block">
      <div
        className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 px-8 py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]"
            aria-hidden
          >
            <FolderKanban className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              {tecnicoView && userFirstName ? `Hola, ${userFirstName}` : "Operación"}
            </p>
            <h1 className="mt-1 text-[32px] font-bold leading-[1.15] tracking-[-1.1px]">
              {tecnicoView ? "Mis proyectos" : "Proyectos"}
            </h1>
            <p className="mt-1.5 max-w-[60ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
              {tecnicoView
                ? "Registra tu llegada, la bitácora del día, el avance y la evidencia de cada proyecto asignado."
                : "Vincula cotizaciones, asigna al equipo de campo y da seguimiento a entrega e instalación de equipos."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <MonthSwitcher selectedMonth={selectedMonth} onShiftMonth={onShiftMonth} />
        </div>
      </div>
    </header>
  );
}
