import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

export default function StatisticsChart() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const previousYear = currentYear - 1;
  const [currentYearData, setCurrentYearData] = useState<number[]>(Array(12).fill(0));
  const [previousYearData, setPreviousYearData] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(false);
  const options: ApexOptions = {
    legend: {
      show: false, // Hide legend
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#ea580c", "#38bdf8"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line", // Set the chart type to 'line'
      toolbar: {
        show: false, // Hide chart toolbar
      },
    },
    stroke: {
      curve: "straight", // Define the line style (straight, smooth, or step)
      width: [2, 2], // Line width for each dataset
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0, // Size of the marker points
      strokeColors: "#fff", // Marker border color
      strokeWidth: 2,
      hover: {
        size: 6, // Marker size on hover
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false, // Hide grid lines on x-axis
        },
      },
      yaxis: {
        lines: {
          show: true, // Show grid lines on y-axis
        },
      },
    },
    dataLabels: {
      enabled: false, // Disable data labels
    },
    tooltip: {
      enabled: true, // Enable tooltip
      x: {
        format: "dd MMM yyyy", // Format for x-axis tooltip
      },
    },
    xaxis: {
      type: "category", // Category-based x-axis
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: {
        show: false, // Hide x-axis border
      },
      axisTicks: {
        show: false, // Hide x-axis ticks
      },
      tooltip: {
        enabled: false, // Disable tooltip for x-axis points
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px", // Adjust font size for y-axis labels
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "", // Remove y-axis title
        style: {
          fontSize: "0px",
        },
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl("/api/cotizaciones/"), {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        const curr = Array(12).fill(0);
        const prev = Array(12).fill(0);
        for (const item of list) {
          const raw = item?.fecha || item?.created_at || item?.fecha_creacion;
          if (!raw) continue;
          const d = new Date(String(raw));
          if (Number.isNaN(d.getTime())) continue;
          if (d.getFullYear() === currentYear) curr[d.getMonth()] += 1;
          if (d.getFullYear() === previousYear) prev[d.getMonth()] += 1;
        }
        setCurrentYearData(curr);
        setPreviousYearData(prev);
      } catch {
        setCurrentYearData(Array(12).fill(0));
        setPreviousYearData(Array(12).fill(0));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentYear, previousYear]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/cotizacion")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/ordenes");
        }
      }}
      className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/95 px-5 pb-5 pt-5 shadow-[0_20px_40px_-34px_rgba(28,25,23,0.28)] transition-colors hover:bg-[#fff7ed] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:hover:bg-[#132033] sm:px-6 sm:pt-6"
    >
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            Comparativo de cotizaciones
          </h3>
          <p className="mt-1 text-theme-sm text-[#7a6b5b] dark:text-[#8ea0b8]">
            Comparacion mensual contra el año anterior
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end text-xs text-[#7a6b5b] dark:text-[#8ea0b8]">
          {loading ? "Cargando..." : `${currentYear} vs ${previousYear}`}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}
