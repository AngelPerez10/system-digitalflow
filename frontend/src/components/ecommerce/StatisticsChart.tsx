import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useNavigate } from "react-router-dom";
import type { useDashboardStats } from "./useDashboardStats";

type Props = Pick<ReturnType<typeof useDashboardStats>, "loading" | "cotizacionesYears">;

export default function StatisticsChart({ loading, cotizacionesYears }: Props) {
  const navigate = useNavigate();
  const currentYear = cotizacionesYears.year;
  const previousYear = cotizacionesYears.previousYear;
  const currentYearData = cotizacionesYears.current;
  const previousYearData = cotizacionesYears.previous;
  const options: ApexOptions = {
    legend: { show: false, position: "top", horizontalAlign: "left" },
    colors: ["#1B5CFF", "#5db8a6"],
    chart: {
      fontFamily: "Geist, Outfit, ui-sans-serif, system-ui, sans-serif",
      height: 310,
      type: "line",
      toolbar: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      borderColor: "#e7ded0",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      x: { format: "dd MMM yyyy" },
    },
    xaxis: {
      type: "category",
      categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: { style: { fontSize: "12px", colors: "#6E6E77" } },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6E6E77"],
        },
      },
      title: {
        text: "",
        style: { fontSize: "0px" },
      },
    },
  };

  const series = [
    {
      name: `Cotizaciones ${currentYear}`,
      data: currentYearData,
    },
    {
      name: `Cotizaciones ${previousYear}`,
      data: previousYearData,
    },
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/cotizacion")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/cotizacion");
        }
      }}
      className="rounded-[16px] border border-[#e7ded0] bg-white px-5 pb-5 pt-5 shadow-[0_6px_20px_-14px_rgba(9,9,11,0.16)] transition-colors hover:border-[#1B5CFF]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/40 sm:px-6 sm:pt-6"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 18 10 12l4 4 6-8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              Comparativo de cotizaciones
            </h3>
            <p className="mt-0.5 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Comparación mensual contra el año anterior
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-[#6E6E77] sm:justify-end dark:text-[#8EA0B8]">
          {loading ? "Cargando…" : `${currentYear} vs ${previousYear}`}
        </div>
      </div>

      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="min-w-[1000px] xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}
