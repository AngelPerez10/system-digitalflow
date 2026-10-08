import { useMemo, type CSSProperties } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { ClipboardCheck } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { baseChartOptions } from "./chartTheme";
import { formatEntero, porcentaje } from "./dashboardMath";
import { Reveal } from "./Reveal";
import { CardHeader, panelCard } from "./ui";
import { useReducedMotion } from "./useCountUp";

const ESTADOS = [
  { key: "pendiente", label: "Pendientes", bar: "bg-[#4453A8] dark:bg-[#7A8BE6]" },
  { key: "pausado", label: "Pausadas", bar: "bg-[#D08A1E] dark:bg-[#E6A23C]" },
  { key: "saldo_pendiente", label: "Saldo pendiente", bar: "bg-[#A21CAF] dark:bg-[#E879F9]" },
  { key: "resuelto", label: "Resueltas", bar: "bg-[#0E8A5F] dark:bg-[#34D399]" },
  { key: "cancelada", label: "Canceladas", bar: "bg-[#C22B2B] dark:bg-[#F87171]" },
] as const;

type Props = { loading: boolean; year: number; status: Record<string, number>; index: number };

/** Órdenes del año por estado: anillo con la tasa de resolución y barras por estado. */
export function OrdenesEstadoCard({ loading, year, status, index }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();

  const total = ESTADOS.reduce((acc, e) => acc + (status[e.key] ?? 0), 0);
  const resueltas = status.resuelto ?? 0;
  const tasa = porcentaje(resueltas, total);
  const max = Math.max(1, ...ESTADOS.map((e) => status[e.key] ?? 0));

  const options = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    return {
      chart: { ...base.chart, type: "radialBar", sparkline: { enabled: true } },
      colors: [dark ? "#34D399" : "#0E8A5F"],
      plotOptions: {
        radialBar: {
          hollow: { size: "64%" },
          track: { background: dark ? "#1F2A3C" : "#F0F0F2", strokeWidth: "100%" },
          dataLabels: {
            name: { show: true, offsetY: 20, color: dark ? "#8EA0B8" : "#71717A", fontSize: "11px" },
            value: {
              show: true,
              offsetY: -12,
              fontSize: "24px",
              fontWeight: 600,
              color: dark ? "#F8FAFC" : "#09090B",
              formatter: (v: number) => `${Math.round(v)}%`,
            },
          },
        },
      },
      stroke: { lineCap: "round" },
      labels: ["resueltas"],
    };
  }, [dark, reduced]);

  return (
    <Reveal index={index} className={`flex min-w-0 flex-col p-5 sm:p-6 ${panelCard}`} aria-labelledby="ord-estado-title">
      {(inView) => (
        <>
          <CardHeader id="ord-estado-title" icon={<ClipboardCheck />} tone="ordenes" title="Órdenes por estado" subtitle={`Registradas en ${year}`} />

          <div className="mt-4 flex items-center gap-4">
            <div className="size-[150px] shrink-0">
              {loading ? (
                <span className="block size-full animate-pulse rounded-full border-[14px] border-[#F4F4F5] dark:border-white/[0.06]" aria-hidden />
              ) : inView ? (
                <Chart options={options} series={[Math.round(tasa * 10) / 10]} type="radialBar" height={150} />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[34px] font-semibold leading-none tracking-[-1px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                {loading ? "—" : formatEntero(total)}
              </p>
              <p className="mt-1 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">órdenes en el año</p>
              <p className="mt-2 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                <span className="font-semibold tabular-nums text-[#04724D] dark:text-[#22A06B]">{formatEntero(resueltas)}</span> resueltas
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {ESTADOS.map((e, i) => {
              const n = status[e.key] ?? 0;
              return (
                <li key={e.key}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#52525B] dark:text-[#B7C1D1]">{e.label}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{formatEntero(n)}</span>
                      <span className="ml-2 inline-block w-9 text-right text-[12px] text-[#A1A1AA] dark:text-[#64748B]">
                        {Math.round(porcentaje(n, total))}%
                      </span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]"
                    role="progressbar"
                    aria-label={e.label}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={n}
                  >
                    <div
                      className={`cot-bar h-full w-full rounded-full ${e.bar}`}
                      style={{
                        transform: `scaleX(${inView && !loading ? n / max : 0})`,
                        transitionDelay: `${i * 70}ms`,
                      } as CSSProperties}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Reveal>
  );
}
