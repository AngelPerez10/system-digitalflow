import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { PieChart } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { DashboardExtra } from "@/components/ecommerce/useDashboardStats";
import { baseChartOptions } from "./chartTheme";
import { formatEntero, formatMoneda, porcentaje } from "./dashboardMath";
import { Reveal } from "./Reveal";
import { CardHeader, LegendRow, panelCard } from "./ui";
import { useReducedMotion } from "./useCountUp";

const ESTADOS = [
  { key: "AUTORIZADA", label: "Autorizadas", light: "#0E8A5F", dark: "#34D399" },
  { key: "PENDIENTE", label: "Pendientes", light: "#D08A1E", dark: "#E6A23C" },
  { key: "CANCELADA", label: "Canceladas", light: "#C22B2B", dark: "#F87171" },
] as const;

type Props = { loading: boolean; year: number; status: DashboardExtra["cotizacionesStatus"]; index: number };

/** Embudo de cotizaciones del año: cuántas se autorizan, siguen abiertas o se cancelan. */
export function CotizacionesEstadoCard({ loading, year, status, index }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();

  const counts = ESTADOS.map((e) => status[e.key]?.count ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const tasa = porcentaje(counts[0], total);
  const colors = ESTADOS.map((e) => (dark ? e.dark : e.light));

  const options = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    return {
      chart: { ...base.chart, type: "donut" },
      theme: base.theme,
      colors,
      labels: ESTADOS.map((e) => e.label),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 3, colors: [dark ? "#111827" : "#FFFFFF"] },
      states: { hover: { filter: { type: "none" } } },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "74%",
            labels: {
              show: true,
              name: { show: true, offsetY: 22, color: dark ? "#8EA0B8" : "#71717A", fontSize: "12px" },
              value: {
                show: true,
                offsetY: -12,
                fontSize: "30px",
                fontWeight: 600,
                color: dark ? "#F8FAFC" : "#09090B",
                formatter: (v: string) => formatEntero(Number(v)),
              },
              total: {
                show: true,
                showAlways: true,
                label: "autorización",
                color: dark ? "#8EA0B8" : "#71717A",
                fontSize: "12px",
                formatter: () => `${Math.round(tasa)}%`,
              },
            },
          },
        },
      },
      tooltip: { ...base.tooltip, y: { formatter: (v: number) => `${formatEntero(v)} cotizaciones` } },
    };
  }, [dark, reduced, tasa, colors]);

  return (
    <Reveal index={index} className={`flex min-w-0 flex-col p-5 sm:p-6 ${panelCard}`} aria-labelledby="cot-estado-title">
      {(inView) => (
        <>
          <CardHeader id="cot-estado-title" icon={<PieChart />} tone="ventas" title="Cotizaciones por estado" subtitle={`Emitidas en ${year}`} />
          <div className="mt-2 flex flex-1 items-center justify-center" style={{ minHeight: 230 }}>
            {loading ? (
              <span className="size-[190px] animate-pulse rounded-full border-[18px] border-[#F4F4F5] dark:border-white/[0.06]" aria-hidden />
            ) : !inView ? null : total === 0 ? (
              <p className="text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Sin cotizaciones este año.</p>
            ) : (
              <div className="w-full max-w-[260px]">
                <Chart options={options} series={counts} type="donut" height={240} />
              </div>
            )}
          </div>
          <ul className="mt-2 divide-y divide-[#F0F0F2] border-t border-[#F0F0F2] pt-1 dark:divide-[#1F2A3C] dark:border-[#1F2A3C]">
            {ESTADOS.map((e, i) => (
              <LegendRow
                key={e.key}
                color={colors[i]}
                label={loading ? e.label : `${e.label} · ${formatMoneda(status[e.key]?.monto ?? 0)}`}
                value={loading ? "—" : formatEntero(counts[i])}
                pct={porcentaje(counts[i], total)}
              />
            ))}
          </ul>
        </>
      )}
    </Reveal>
  );
}
