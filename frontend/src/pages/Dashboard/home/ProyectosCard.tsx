import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { ArrowRight, FolderKanban } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { DashboardExtra } from "@/components/ecommerce/useDashboardStats";
import { EstadoPill } from "@/pages/Operacion/Proyectos/shared/ProyectoUi";
import { ESTADO_TONE, btn, btnSm, focusRing, folioText, toneForEstado } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import type { ProyectoEstado } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import { baseChartOptions } from "./chartTheme";
import { MESES_CORTOS, formatEntero, porcentaje, sumHasta } from "./dashboardMath";
import { Reveal } from "./Reveal";
import { CardHeader, ChartSkeleton, LegendRow, eyebrowClass, panelCard } from "./ui";
import { MODULO, serieColor } from "./palette";
import { useReducedMotion } from "./useCountUp";

/** Mismo orden y tonos que la barra segmentada de Proyectos. */
const ESTADOS: { key: ProyectoEstado; light: string; dark: string }[] = [
  { key: "en_proceso", light: "#1B5CFF", dark: "#7EA0FF" },
  { key: "pausado", light: "#D08A1E", dark: "#E6A23C" },
  { key: "saldo_pendiente", light: "#A21CAF", dark: "#E879F9" },
  { key: "cerrado", light: "#0E8A5F", dark: "#34D399" },
  { key: "cancelado", light: "#C22B2B", dark: "#F87171" },
];

function haceDias(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} d`;
}

type Props = {
  loading: boolean;
  year: number;
  mesIdx: number;
  proyectos: DashboardExtra["proyectos"];
  index: number;
};

/** Portafolio de proyectos: estado, avance de los que están en curso y altas por mes. */
export function ProyectosCard({ loading, year, mesIdx, proyectos, index }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();

  const counts = ESTADOS.map((e) => proyectos.porStatus[e.key] ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const colors = ESTADOS.map((e) => (dark ? e.dark : e.light));
  const creadosAnio = sumHasta(proyectos.creadosMeses, mesIdx);

  const donut = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    return {
      chart: { ...base.chart, type: "donut" },
      theme: base.theme,
      colors,
      labels: ESTADOS.map((e) => ESTADO_TONE[e.key].label),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 3, colors: [dark ? "#111827" : "#FFFFFF"] },
      states: { hover: { filter: { type: "none" } } },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "76%",
            labels: {
              show: true,
              name: { show: true, offsetY: 20, color: dark ? "#8EA0B8" : "#71717A", fontSize: "12px" },
              value: {
                show: true,
                offsetY: -12,
                fontSize: "28px",
                fontWeight: 600,
                color: dark ? "#F8FAFC" : "#09090B",
                formatter: (v: string) => formatEntero(Number(v)),
              },
              total: { show: true, showAlways: true, label: "proyectos", color: dark ? "#8EA0B8" : "#71717A", fontSize: "12px" },
            },
          },
        },
      },
      tooltip: { ...base.tooltip, y: { formatter: (v: number) => `${formatEntero(v)} proyectos` } },
    };
  }, [dark, reduced, colors]);

  const barras = useMemo<ApexOptions>(() => {
    const base = baseChartOptions(dark, reduced);
    const c = serieColor("proyectos", dark);
    return {
      ...base,
      chart: { ...base.chart, type: "bar", id: "proyectos-creados" },
      colors: [({ dataPointIndex }: { dataPointIndex: number }) => (dataPointIndex === mesIdx ? c.main : c.soft)],
      plotOptions: { bar: { columnWidth: "56%", borderRadius: 4, borderRadiusApplication: "end" } },
      states: { hover: { filter: { type: "none" } }, active: { filter: { type: "none" } } },
      grid: { ...base.grid, padding: { left: 0, right: 0, top: -10, bottom: 0 } },
      xaxis: { ...base.xaxis, categories: MESES_CORTOS.map((m) => m.charAt(0)) },
      yaxis: { ...base.yaxis, tickAmount: 3 },
      tooltip: {
        ...base.tooltip,
        x: { formatter: (_v: number, o?: { dataPointIndex: number }) => MESES_CORTOS[o?.dataPointIndex ?? 0] },
        y: { formatter: (v: number) => `${formatEntero(v)} proyectos`, title: { formatter: () => "" } },
      },
    };
  }, [dark, reduced, mesIdx]);

  const barSeries = useMemo(() => [{ name: "Creados", data: proyectos.creadosMeses }], [proyectos.creadosMeses]);

  return (
    <Reveal index={index} className={`min-w-0 p-5 sm:p-6 ${panelCard}`} aria-labelledby="proyectos-title">
      {(inView) => (
        <>
          <CardHeader
            id="proyectos-title"
            icon={<FolderKanban />}
            tone="proyectos"
            title="Proyectos"
            subtitle="Estado del portafolio y avance de los proyectos que siguen abiertos."
            right={
              <Link to="/proyectos" className={`${btn.ghost} ${btnSm}`}>
                Ver proyectos
                <ArrowRight aria-hidden />
              </Link>
            }
          />

          <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-0 lg:divide-x lg:divide-[#F0F0F2] dark:lg:divide-[#1F2A3C]">
            {/* Estado */}
            <div className="min-w-0 lg:pr-6">
              <p className={eyebrowClass}>Por estado</p>
              <div className="flex items-center justify-center" style={{ minHeight: 210 }}>
                {loading ? (
                  <span className="size-[170px] animate-pulse rounded-full border-[16px] border-[#F4F4F5] dark:border-white/[0.06]" aria-hidden />
                ) : !inView ? null : total === 0 ? (
                  <p className="text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Sin proyectos registrados.</p>
                ) : (
                  <div className="w-full max-w-[220px]">
                    <Chart options={donut} series={counts} type="donut" height={210} />
                  </div>
                )}
              </div>
              <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
                {ESTADOS.map((e, i) => (
                  <LegendRow
                    key={e.key}
                    color={colors[i]}
                    label={ESTADO_TONE[e.key].label}
                    value={formatEntero(counts[i])}
                    pct={porcentaje(counts[i], total)}
                  />
                ))}
              </ul>
            </div>

            {/* En curso */}
            <div className="min-w-0 lg:px-6">
              <div className="flex items-baseline justify-between gap-3">
                <p className={eyebrowClass}>En seguimiento</p>
                <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                  Avance promedio{" "}
                  <span className={`font-semibold tabular-nums ${MODULO.proyectos.text}`}>
                    {Math.round(proyectos.avancePromedio)}%
                  </span>
                </p>
              </div>
              {loading ? (
                <ul className="mt-3 space-y-3" aria-hidden>
                  {Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="h-14 animate-pulse rounded-[12px] bg-[#F4F4F5] dark:bg-white/[0.05]" />
                  ))}
                </ul>
              ) : proyectos.activos.length === 0 ? (
                <p className="mt-6 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">No hay proyectos abiertos.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {proyectos.activos.map((p, i) => (
                    <li key={p.id} className={inView ? "cot-rise" : "opacity-0"} style={{ "--cot-i": i + 2 } as CSSProperties}>
                      <Link
                        to="/proyectos"
                        className={`cot-press group block rounded-[12px] px-2.5 py-2.5 hover:bg-[#FAFAFA] dark:hover:bg-[#0F172A]/60 ${focusRing}`}
                      >
                        <div className="flex items-center gap-2">
                          {p.folio && <span className={folioText}>{p.folio}</span>}
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                            {p.cliente || "Sin cliente"}
                          </span>
                          <EstadoPill estado={p.status} size="sm" className="hidden shrink-0 sm:inline-flex" />
                          <span className="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                            {p.avance}%
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]"
                          role="progressbar"
                          aria-label={`Avance de ${p.cliente || p.folio}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={p.avance}
                        >
                          <div
                            className={`cot-bar h-full w-full rounded-full ${toneForEstado(p.status).bar}`}
                            style={{ transform: `scaleX(${inView ? p.avance / 100 : 0})`, transitionDelay: `${160 + i * 80}ms` }}
                          />
                        </div>
                        <p className="mt-1.5 truncate text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]">
                          {p.tecnico ? `${p.tecnico} · ` : ""}actualizado {haceDias(p.actualizado)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Altas */}
            <div className="min-w-0 lg:pl-6">
              <p className={eyebrowClass}>Nuevos por mes</p>
              <div className="mt-2 flex gap-6">
                <div>
                  <p className="text-[28px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                    {loading ? "—" : formatEntero(creadosAnio)}
                  </p>
                  <p className="mt-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">creados en {year}</p>
                </div>
                <div>
                  <p className="text-[28px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-[#04724D] dark:text-[#22A06B]">
                    {loading ? "—" : formatEntero(proyectos.liquidados)}
                  </p>
                  <p className="mt-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">liquidados</p>
                </div>
              </div>
              <div className="mt-3 min-h-[250px]">
                {loading ? (
                  <ChartSkeleton height={250} />
                ) : inView ? (
                  <div className="-mx-2">
                    <Chart options={barras} series={barSeries} type="bar" height={250} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </Reveal>
  );
}
