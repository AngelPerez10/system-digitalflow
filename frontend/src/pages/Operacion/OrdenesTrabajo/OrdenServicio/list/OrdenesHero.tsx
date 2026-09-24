import { ClipboardList } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { MonthSwitcher } from "../../../Proyectos/list/ProyectosHero";

type Props = {
  title: string;
  eyebrow: string;
  description: string;
  selectedMonth: string;
  onShiftMonth: (delta: number) => void;
};

/** Banda marina (tablet y escritorio) con el mismo diseño que Proyectos: título y mes del listado. */
export function OrdenesHero({ title, eyebrow, description, selectedMonth, onShiftMonth }: Props) {
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
            <ClipboardList className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{eyebrow}</p>
            <h1 className="mt-1 text-[32px] font-bold leading-[1.15] tracking-[-1.1px]">{title}</h1>
            <p className="mt-1.5 max-w-[60ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <MonthSwitcher selectedMonth={selectedMonth} onShiftMonth={onShiftMonth} />
        </div>
      </div>
    </header>
  );
}
