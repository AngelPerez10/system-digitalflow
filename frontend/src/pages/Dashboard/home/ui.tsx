import type { ReactNode } from "react";
import { MODULO } from "./palette";

/** Tarjeta del panel: blanca, línea de 1 px, se eleva al pasar el cursor. */
export const panelCard =
  "cot-lift rounded-[20px] border border-[#E7E7EA] bg-white hover:border-[#DCDCE0] hover:shadow-[0_6px_20px_-12px_rgba(9,9,11,0.16)] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#334056] dark:hover:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]";

export const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]";

export const ICON_TONE = {
  ventas: MODULO.ventas.icon,
  monto: MODULO.monto.icon,
  ordenes: MODULO.ordenes.icon,
  proyectos: MODULO.proyectos.icon,
  navy: "bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#D6DEEA]",
} as const;

type HeaderProps = {
  id: string;
  icon: ReactNode;
  tone?: keyof typeof ICON_TONE;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
};

export function CardHeader({ id, icon, tone = "navy", title, subtitle, right }: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-[18px] ${ICON_TONE[tone]}`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0 self-start">{right}</div>}
    </div>
  );
}

/** Esqueleto de gráfica de barras mientras carga. */
export function ChartSkeleton({ height, bars = 12 }: { height: number; bars?: number }) {
  return (
    <div className="flex items-end gap-2 px-2 pb-6" style={{ height }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-[#F4F4F5] dark:bg-white/[0.05]"
          style={{ height: `${28 + ((i * 37) % 58)}%` }}
        />
      ))}
    </div>
  );
}

/** Leyenda con punto, cifra y porcentaje; acompaña a las donas. */
export function LegendRow({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: string;
  pct?: number;
}) {
  return (
    <li className="flex items-center gap-2.5 py-1.5 text-[13px]">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[#52525B] dark:text-[#B7C1D1]">{label}</span>
      <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{value}</span>
      {pct != null && (
        <span className="w-11 text-right text-[12px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{Math.round(pct)}%</span>
      )}
    </li>
  );
}
