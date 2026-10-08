import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { CircleDollarSign } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { baseChartOptions } from "./chartTheme";
import { MESES_CORTOS, formatMoneda, sumHasta } from "./dashboardMath";
import { Reveal } from "./Reveal";
import { CardHeader, ChartSkeleton, eyebrowClass, panelCard } from "./ui";
import { serieColor } from "./palette";
import { useReducedMotion } from "./useCountUp";

type Props = { loading: boolean; year: number; serie: number[]; mesIdx: number; index: number };

/** Monto de cotizaciones autorizadas por mes, con el mes en curso resaltado. */
export function MontoAutorizadoCard({ loading, year, serie, mesIdx, index }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();

  const total = sumHasta(serie, mesIdx);
  const conMonto = serie.slice(0, mesIdx + 1).filter((v) => v > 0).length;
  const promedio = conMonto ? total / conMonto : 0;
  const mejorIdx = serie.slice(0, mesIdx + 1).reduce((b, v, i, arr) => (v > arr[b] ? i : b), 0);

  const options = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    const c = serieColor("monto", dark);
    return {
      ...base,
      chart: { ...base.chart, type: "bar", id: "monto-autorizado" },
      colors: [
        ({ dataPointIndex }: { dataPointIndex: number }) => (dataPointIndex === mesIdx ? c.main : c.soft),
      ],
      plotOptions: { bar: { columnWidth: "48%", borderRadius: 6, borderRadiusApplication: "end" } },
      states: { hover: { filter: { type: "none" } }, active: { filter: { type: "none" } } },
      xaxis: { ...base.xaxis, categories: [...MESES_CORTOS] },
      yaxis: { ...base.yaxis, labels: { ...(base.yaxis as ApexYAxis).labels, formatter: (v: number) => formatMoneda(v) } },
      tooltip: { ...base.tooltip, y: { formatter: (v: number) => formatMoneda(v, false), title: { formatter: () => "Autorizado" } } },
    };
  }, [dark, reduced, mesIdx]);

  const series = useMemo(() => [{ name: "Autorizado", data: serie }], [serie]);

  return (
    <Reveal index={index} className={`flex min-w-0 flex-col p-5 sm:p-6 ${panelCard}`} aria-labelledby="monto-title">
      {(inView) => (
        <>
          <CardHeader
            id="monto-title"
            icon={<CircleDollarSign />}
            tone="monto"
            title="Monto autorizado por mes"
            subtitle={`Total de cotizaciones autorizadas en ${year}.`}
          />
          <dl className="mt-5 grid grid-cols-3 gap-4">
            {[
              { label: "En el año", value: formatMoneda(total) },
              { label: "Promedio mensual", value: formatMoneda(promedio) },
              { label: "Mejor mes", value: total ? MESES_CORTOS[mejorIdx] : "—" },
            ].map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className={`truncate ${eyebrowClass}`}>{d.label}</dt>
                <dd className="mt-1 truncate text-[20px] font-semibold tabular-nums tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                  {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-[#F4F4F5] dark:bg-white/[0.06]" /> : d.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 min-h-[290px] flex-1">
            {loading ? (
              <ChartSkeleton height={290} />
            ) : inView ? (
              <div className="-mx-2">
                <Chart options={options} series={series} type="bar" height={290} />
              </div>
            ) : null}
          </div>
        </>
      )}
    </Reveal>
  );
}
