import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { ArrowRight, LineChart } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { btn, btnSm, focusRing } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import { MESES_CORTOS, acumulada, formatEntero, formatVariacion, sumHasta, variacion } from "./dashboardMath";
import { baseChartOptions, chartPalette } from "./chartTheme";
import { Reveal } from "./Reveal";
import { ChartSkeleton, panelCard } from "./ui";
import { MODULO, segmentoActivo, segmentoInactivo, serieColor } from "./palette";
import { useReducedMotion } from "./useCountUp";

type Vista = "mensual" | "acumulado";

const VISTAS: { key: Vista; label: string }[] = [
  { key: "mensual", label: "Mensual" },
  { key: "acumulado", label: "Acumulado" },
];

type Props = {
  loading: boolean;
  year: number;
  previousYear: number;
  current: number[];
  previous: number[];
  mesIdx: number;
  index: number;
};

/** Comparativo de cotizaciones del año contra el anterior, mensual o acumulado. */
export function CotizacionesTrendCard({ loading, year, previousYear, current, previous, mesIdx, index }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();
  const [vista, setVista] = useState<Vista>("mensual");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const totalActual = sumHasta(current, mesIdx);
  const totalAnterior = sumHasta(previous, mesIdx);
  const pct = variacion(totalActual, totalAnterior);

  const series = useMemo(() => {
    // El año en curso se corta en el mes actual: los meses futuros no son «cero».
    const recorte = (serie: number[]) => serie.map((v, i) => (i <= mesIdx ? v : null));
    const actual = vista === "acumulado" ? acumulada(current) : current;
    const anterior = vista === "acumulado" ? acumulada(previous) : previous;
    return [
      { name: String(year), data: recorte(actual) },
      { name: String(previousYear), data: anterior },
    ];
  }, [vista, current, previous, year, previousYear, mesIdx]);

  const options = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    const p = chartPalette(dark);
    return {
      ...base,
      chart: { ...base.chart, type: "area", id: "cotizaciones-trend" },
      colors: [serieColor("ventas", dark).main, p.secondary],
      stroke: { curve: "smooth", width: [2.5, 2], dashArray: [0, 5] },
      fill: {
        type: ["gradient", "solid"],
        opacity: [1, 0],
        gradient: { shadeIntensity: 0, opacityFrom: dark ? 0.28 : 0.2, opacityTo: 0, stops: [0, 95] },
      },
      markers: { size: 0, strokeColors: dark ? "#111827" : "#FFFFFF", strokeWidth: 2, hover: { size: 5 } },
      xaxis: { ...base.xaxis, categories: [...MESES_CORTOS] },
      tooltip: {
        ...base.tooltip,
        shared: true,
        y: { formatter: (v: number | null) => (v == null ? "—" : `${formatEntero(v)} cotizaciones`) },
      },
    };
  }, [dark, reduced]);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + VISTAS.length) % VISTAS.length;
    setVista(VISTAS[next].key);
    tabRefs.current[next]?.focus();
  };

  return (
    <Reveal index={index} className={`flex min-w-0 flex-col p-5 sm:p-6 ${panelCard}`} aria-labelledby="cotizaciones-trend-title">
      {(inView) => (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${MODULO.ventas.icon}`} aria-hidden>
                <LineChart className="size-[18px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h2 id="cotizaciones-trend-title" className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                  Comparativo de cotizaciones
                </h2>
                <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                  {year} contra {previousYear}, de enero a {MESES_CORTOS[mesIdx].toLowerCase()}.
                </p>
              </div>
            </div>

            <div role="tablist" aria-label="Vista de la gráfica" className="inline-flex shrink-0 self-start rounded-[12px] bg-[#F4F4F5] p-1 dark:bg-[#0F172A]">
              {VISTAS.map((v, i) => {
                const active = vista === v.key;
                return (
                  <button
                    key={v.key}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setVista(v.key)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`cot-press min-h-9 rounded-[9px] px-3.5 text-[13px] font-semibold ${focusRing} ${
                      active
                        ? segmentoActivo
                        : segmentoInactivo
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Acumulado {year}</p>
              {loading ? (
                <span className="mt-1 block h-9 w-24 animate-pulse rounded-lg bg-[#F4F4F5] dark:bg-white/[0.06]" />
              ) : (
                <p key={totalActual} className="cot-flash mt-1 text-[34px] font-semibold leading-none tracking-[-1px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]" aria-live="polite">
                  {formatEntero(totalActual)}
                </p>
              )}
            </div>
            {!loading && pct != null && (
              <p className="pb-1 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                <span className={`font-semibold tabular-nums ${pct >= 0 ? "text-[#04724D] dark:text-[#22A06B]" : "text-[#B42323] dark:text-[#F87171]"}`}>
                  {formatVariacion(pct)}
                </span>{" "}
                contra {formatEntero(totalAnterior)} en el mismo periodo de {previousYear}
              </p>
            )}
            <ul className="ml-auto flex items-center gap-4 pb-1 text-[12px] text-[#52525B] dark:text-[#B7C1D1]" aria-label="Leyenda">
              <li className="flex items-center gap-1.5">
                <span className={`h-[3px] w-4 rounded-full ${MODULO.ventas.bar}`} aria-hidden />
                {year}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#A1A1AA] dark:border-[#64748B]" aria-hidden />
                {previousYear}
              </li>
            </ul>
          </div>

          <div className="relative mt-3 min-h-[280px] flex-1">
            {loading ? (
              <ChartSkeleton height={280} />
            ) : inView ? (
              <div key={vista} className="cot-fade -mx-2">
                <Chart options={options} series={series} type="area" height={280} />
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex justify-end">
            <Link to="/cotizacion" className={`${btn.ghost} ${btnSm}`}>
              Ver cotizaciones
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </>
      )}
    </Reveal>
  );
}
