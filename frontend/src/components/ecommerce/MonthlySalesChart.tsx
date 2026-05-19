import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { useDashboardStats } from "./useDashboardStats";

type Props = Pick<ReturnType<typeof useDashboardStats>, "loading" | "ordenesCompletadasMeses">;

export default function MonthlySalesChart({ loading, ordenesCompletadasMeses }: Props) {
  const navigate = useNavigate();
  const seriesData = ordenesCompletadasMeses;
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const options: ApexOptions = {
    colors: ["#ea580c"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
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
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },

    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  };
  const series = [
    {
      name: "Ordenes",
      data: seriesData,
    },
  ];
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/ordenes")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/ordenes");
        }
      }}
      className="overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/95 px-5 pt-5 shadow-[0_20px_40px_-34px_rgba(28,25,23,0.28)] transition-colors hover:bg-[#fff7ed] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:hover:bg-[#132033] sm:px-6 sm:pt-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1c1917] dark:text-[#f8fafc]">
          Ordenes de trabajo por mes
        </h3>
        <div className="relative inline-block">
          <button
            className="dropdown-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown();
            }}
          >
            <MoreDotIcon className="size-6 text-[#9a8b7b] hover:text-[#1c1917] dark:text-[#8ea0b8] dark:hover:text-[#f8fafc]" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={() => {
                closeDropdown();
                navigate("/cotizacion");
              }}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Ver detalle
            </DropdownItem>
            <DropdownItem
              onItemClick={() => {
                closeDropdown();
              }}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Cerrar
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
      <p className="mb-2 text-xs text-[#7a6b5b] dark:text-[#8ea0b8]">
        {loading ? "Cargando ordenes..." : `Año ${currentYear}`}
      </p>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
    </div>
  );
}
