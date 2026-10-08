import { useMemo } from "react";
import { Link } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { btn, btnSm } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import { MESES_CORTOS, formatEntero, sumHasta } from "./dashboardMath";
import { baseChartOptions, chartPalette } from "./chartTheme";
import { Reveal } from "./Reveal";
import { ChartSkeleton, panelCard } from "./ui";
import { MODULO, serieColor } from "./palette";
import { useReducedMotion } from "./useCountUp";

type Props = {
  loading: boolean;
  year: number;
  serie: number[];
  mesIdx: number;
  index: number;
};

/** Órdenes resueltas por mes; el mes en curso se resalta en azul de acción. */
export function OrdenesCompletadasCard({ loading, year, serie, mesIdx, index }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();

  const total = sumHasta(serie, mesIdx);
  const promedio = mesIdx >= 0 ? total / (mesIdx + 1) : 0;
  const mejorIdx = serie.slice(0, mesIdx + 1).reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);

  const options = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    const p = chartPalette(dark);
    return {
      ...base,
      chart: { ...base.chart, type: "bar", id: "ordenes-completadas" },
      colors: MESES_CORTOS.map((_, i) => (i === mesIdx ? serieColor("ordenes", dark).main : serieColor("ordenes", dark).soft)),
      plotOptions: {
        bar: { distributed: true, columnWidth: "52%", borderRadius: 6, borderRadiusApplication: "end" },
      },
      states: { hover: { filter: { type: "none" } }, active: { filter: { type: "none" } } },
      annotations: promedio
        ? {
            yaxis: [
              {
                y: promedio,
                borderColor: p.secondary,
                strokeDashArray: 4,
                label: {
                  text: `Promedio ${formatEntero(promedio)}`,
                  position: "right",
                  textAnchor: "end",
                  offsetX: -6,
                  borderWidth: 0,
                  style: {
                    background: "transparent",
                    color: dark ? "#B7C1D1" : "#52525B",
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: "Geist, Outfit, system-ui, sans-serif",
                  },
                },
              },
            ],
          }
        : {},
      xaxis: { ...base.xaxis, categories: [...MESES_CORTOS] },
      tooltip: {
        ...base.tooltip,
        y: { formatter: (v: number) => `${formatEntero(v)} órdenes`, title: { formatter: () => "" } },
      },
    };
  }, [dark, reduced, mesIdx, promedio]);

  const series = useMemo(() => [{ name: "Órdenes resueltas", data: serie }], [serie]);

  return (
    <Reveal index={index} className={`flex min-w-0 flex-col self-start p-5 sm:p-6 ${panelCard}`} aria-labelledby="ordenes-completadas-title">
      {(inView) => (
        <>
          <div className="flex items-start gap-3">
            <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${MODULO.ordenes.icon}`} aria-hidden>
              <BarChart3 className="size-4.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h2 id="ordenes-completadas-title" className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                Órdenes resueltas por mes
              </h2>
              <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Año {year}. El mes en curso va resaltado.</p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-[#F0F0F2] bg-[#F0F0F2] dark:border-[#1F2A3C] dark:bg-[#1F2A3C]">
            {[
              { label: "En el año", value: formatEntero(total) },
              { label: "Promedio", value: `${formatEntero(promedio)}/mes` },
              { label: "Mejor mes", value: total ? MESES_CORTOS[mejorIdx] : "—" },
            ].map((d) => (
              <div key={d.label} className="min-w-0 bg-[#FAFAFA] px-3 py-2.5 dark:bg-[#0F172A]">
                <dt className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">{d.label}</dt>
                <dd className="mt-0.5 truncate text-[16px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                  {loading ? <span className="inline-block h-5 w-10 animate-pulse rounded bg-[#F4F4F5] align-middle dark:bg-white/6" /> : d.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 h-57.5">
            {loading ? (
              <ChartSkeleton height={230} />
            ) : inView ? (
              <div className="-mx-2">
                <Chart options={options} series={series} type="bar" height={230} />
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex justify-end">
            <Link to="/ordenes" className={`${btn.ghost} ${btnSm}`}>
              Ver órdenes
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </>
      )}
    </Reveal>
  );
}
