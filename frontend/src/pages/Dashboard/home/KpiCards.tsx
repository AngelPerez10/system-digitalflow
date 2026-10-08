import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CircleDollarSign, ClipboardList, FileText, FolderKanban, TrendingUp } from "lucide-react";
import { focusRing } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import { formatEntero, formatMoneda, formatVariacion } from "./dashboardMath";
import { MODULO, type Modulo } from "./palette";
import { useCountUp } from "./useCountUp";

export type Kpi = {
  key: string;
  label: string;
  value: number;
  /** Texto bajo la cifra (periodo, contexto). */
  hint: string;
  to: string;
  icon: "cotizacion" | "orden" | "acumulado" | "completadas" | "proyecto" | "monto";
  format?: "entero" | "moneda";
  /** Color del módulo: ícono, mini gráfica y barra. */
  modulo: Modulo;
  /** Variación porcentual contra el periodo de comparación. */
  delta?: { pct: number | null; contra: string };
  /** Serie para la mini gráfica. */
  spark?: number[];
  /** Nota neutra al pie (cuando no hay comparación justa). */
  note?: string;
  /** Avance 0–1 para la barra (cuando no hay serie). */
  progress?: { ratio: number; label: string; /** `exito` usa el verde de «resuelto». */ tone?: "exito" };
};

const ICONS: Record<Kpi["icon"], ReactNode> = {
  cotizacion: <FileText className="size-[18px]" strokeWidth={1.8} />,
  orden: <ClipboardList className="size-[18px]" strokeWidth={1.8} />,
  acumulado: <TrendingUp className="size-[18px]" strokeWidth={1.8} />,
  completadas: <CheckCircle2 className="size-[18px]" strokeWidth={1.8} />,
  proyecto: <FolderKanban className="size-[18px]" strokeWidth={1.8} />,
  monto: <CircleDollarSign className="size-[18px]" strokeWidth={1.8} />,
};

function DeltaPill({ pct, contra }: { pct: number | null; contra: string }) {
  if (pct == null) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#F4F4F5] px-2 text-[12px] font-medium text-[#52525B] ring-1 ring-[#E4E4E7] dark:bg-white/[0.06] dark:text-[#B7C1D1] dark:ring-[#273244]">
        Sin base {contra}
      </span>
    );
  }
  const up = pct > 0;
  const flat = Math.abs(pct) < 0.05;
  const tone = flat
    ? "bg-[#F4F4F5] text-[#52525B] ring-[#E4E4E7] dark:bg-white/[0.06] dark:text-[#B7C1D1] dark:ring-[#273244]"
    : up
      ? "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#4ADE80] dark:ring-[#1E5A42]"
      : "bg-[#FEF2F2] text-[#B42323] ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
      <span className={`inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full px-2 font-semibold tabular-nums ring-1 ${tone}`}>
        {!flat && <Icon className="size-3.5" aria-hidden />}
        {formatVariacion(pct)}
      </span>
      <span className="truncate">{contra}</span>
    </span>
  );
}

/** Mini gráfica de área; el trazo se «dibuja» al entrar (`cot-draw`). */
function Sparkline({ data, index, colorClass }: { data: number[]; index: number; colorClass: string }) {
  const gradId = useId();
  const w = 120;
  const h = 40;
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - 3 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-10 w-[120px] shrink-0 overflow-visible ${colorClass}`} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} className="cot-fade" />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="cot-draw"
        style={{ "--cot-i": index } as CSSProperties}
      />
      <circle cx={lx} cy={ly} r={3} fill="currentColor" className="cot-tick" />
    </svg>
  );
}

function KpiCard({ kpi, index, loading }: { kpi: Kpi; index: number; loading: boolean }) {
  const shown = useCountUp(loading ? 0 : kpi.value);
  const icon = ICONS[kpi.icon];
  const tono = MODULO[kpi.modulo];
  const exito = kpi.progress?.tone === "exito";
  const fmt = (n: number) => (kpi.format === "moneda" ? formatMoneda(n) : formatEntero(n));
  return (
    <Link
      to={kpi.to}
      className={`cot-rise cot-lift group relative flex min-w-0 flex-col rounded-[20px] border border-[#E7E7EA] bg-white p-4 hover:border-[#DCDCE0] hover:shadow-[0_6px_20px_-12px_rgba(9,9,11,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#334056] sm:p-5 ${focusRing}`}
      style={{ "--cot-i": index + 3 } as CSSProperties}
    >
      <div className="flex items-center gap-3">
        <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${tono.icon}`} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">{kpi.label}</span>
        <ArrowRight
          className="size-4 shrink-0 -translate-x-1 text-[#A1A1AA] opacity-0 transition-[transform,opacity] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 dark:text-[#64748B]"
          aria-hidden
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <span className="block h-9 w-20 animate-pulse rounded-lg bg-[#F4F4F5] dark:bg-white/[0.06]" />
          ) : (
            <p className="text-[34px] font-semibold leading-none tracking-[-1px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
              <span aria-hidden>{fmt(shown)}</span>
              <span className="sr-only">{fmt(kpi.value)}</span>
            </p>
          )}
          <p className="mt-1.5 truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{kpi.hint}</p>
        </div>
        {!loading && kpi.spark && <Sparkline data={kpi.spark} index={index} colorClass={tono.text} />}
      </div>

      <div className="mt-4 border-t border-[#F0F0F2] pt-3 dark:border-[#1F2A3C]">
        {loading ? (
          <span className="block h-6 w-32 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]" />
        ) : kpi.delta ? (
          <DeltaPill pct={kpi.delta.pct} contra={kpi.delta.contra} />
        ) : kpi.progress ? (
          <div>
            <div className="flex items-center justify-between text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
              <span className="truncate">{kpi.progress.label}</span>
              <span
                className={`font-semibold tabular-nums ${
                  exito ? "text-[#04724D] dark:text-[#22A06B]" : tono.text
                }`}
              >
                {Math.round(kpi.progress.ratio * 100)}%
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(kpi.progress.ratio * 100)}
              aria-label={kpi.progress.label}
            >
              <div
                className={`cot-bar h-full w-full rounded-full ${exito ? "bg-[#0E8A5F] dark:bg-[#34D399]" : tono.bar}`}
                style={{ transform: `scaleX(${shown && kpi.value ? kpi.progress.ratio * (shown / kpi.value) : 0})` }}
              />
            </div>
          </div>
        ) : kpi.note ? (
          <p className="flex min-h-6 items-center text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{kpi.note}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function KpiCards({ kpis, loading }: { kpis: Kpi[]; loading: boolean }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="Indicadores principales">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.key} kpi={kpi} index={i} loading={loading} />
      ))}
    </section>
  );
}
