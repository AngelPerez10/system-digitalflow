import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, CirclePause, FolderKanban, LoaderCircle } from "lucide-react";
import type { ProyectoStats } from "../shared/proyectoTypes";

type Props = {
  stats: ProyectoStats;
};

type StatTone = {
  icon: string;
  bar: string;
};

const NEUTRAL: StatTone = {
  icon: "bg-[rgba(23,35,91,0.07)] text-[#17235B] dark:bg-white/[0.07] dark:text-[#D6DEEA]",
  bar: "bg-[#17235B] dark:bg-[#D6DEEA]",
};
const BLUE: StatTone = {
  icon: "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]",
  bar: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
};
const AMBER: StatTone = {
  icon: "bg-[#FFF8EB] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#E6A23C]",
  bar: "bg-[#D08A1E] dark:bg-[#E6A23C]",
};
const GREEN: StatTone = {
  icon: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]",
  bar: "bg-[#0E8A5F] dark:bg-[#34D399]",
};

function StatCard({
  index,
  label,
  value,
  total,
  tone,
  icon,
}: {
  index: number;
  label: string;
  value: number;
  /** Si se pasa, se dibuja la proporción respecto al total del mes. */
  total?: number;
  tone: StatTone;
  icon: ReactNode;
}) {
  const share = total == null ? null : total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div
      className="cot-rise group relative overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[#D3D3D8] hover:shadow-[0_8px_24px_-16px_rgba(9,9,11,0.25)] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661] sm:p-5"
      style={{ "--cot-i": index + 1 } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">{label}</p>
          <p
            key={value}
            className="cot-flash mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]"
          >
            {value.toLocaleString("es-MX")}
          </p>
        </div>
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none ${tone.icon}`}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden>
          <div
            className={`cot-bar h-full w-full rounded-full ${tone.bar}`}
            style={{ transform: `scaleX(${share ?? (value > 0 ? 1 : 0)})` }}
          />
        </div>
        <span className="w-9 text-right text-[11.5px] font-medium tabular-nums text-[#A1A1AA] dark:text-[#64748B]">
          {share != null ? `${Math.round(share * 100)}%` : ""}
        </span>
      </div>
    </div>
  );
}

/** Resumen del mes: cifra grande, icono por estado y proporción respecto al total. */
export function ProyectosPageStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Resumen de proyectos del mes">
      <StatCard index={0} label="Total del mes" value={stats.total} tone={NEUTRAL} icon={<FolderKanban className="size-[18px]" />} />
      <StatCard
        index={1}
        label="En proceso"
        value={stats.enProceso}
        total={stats.total}
        tone={BLUE}
        icon={<LoaderCircle className="size-[18px]" />}
      />
      <StatCard
        index={2}
        label="Pausados"
        value={stats.pausados}
        total={stats.total}
        tone={AMBER}
        icon={<CirclePause className="size-[18px]" />}
      />
      <StatCard
        index={3}
        label="Cerrados"
        value={stats.cerrados}
        total={stats.total}
        tone={GREEN}
        icon={<CircleCheck className="size-[18px]" />}
      />
    </div>
  );
}
