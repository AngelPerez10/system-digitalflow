import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { useDashboardStats } from "./useDashboardStats";

type Props = Pick<ReturnType<typeof useDashboardStats>, "loading" | "ordenesCompletadasMeses">;

const dropdownItemClass =
  "flex w-full rounded-lg px-3 py-2 text-left text-sm font-normal text-[#6E6E77] transition-colors hover:bg-[#f5f0e8] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC]";

export default function MonthlySalesChart({ loading, ordenesCompletadasMeses }: Props) {
  const navigate = useNavigate();
  const seriesData = ordenesCompletadasMeses;
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const options: ApexOptions = {
    colors: ["#1B5CFF"],
    chart: {
      fontFamily: "Geist, Outfit, ui-sans-serif, system-ui, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#6E6E77", fontSize: "12px" } },
    },
    legend: { show: false },
    yaxis: {
      title: { text: undefined },
      labels: { style: { colors: "#6E6E77", fontSize: "12px" } },
    },
    grid: {
      borderColor: "#e7ded0",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.2,
        gradientToColors: ["#4B7CFF"],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.9,
        stops: [0, 100],
      },
    },
    tooltip: {
      x: { show: false },
      y: { formatter: (val: number) => `${val} órdenes` },
    },
  };
  const series = [{ name: "Órdenes", data: seriesData }];
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
      className="overflow-hidden rounded-[16px] border border-[#e7ded0] bg-white px-5 pt-5 shadow-[0_6px_20px_-14px_rgba(9,9,11,0.16)] transition-colors hover:border-[#1B5CFF]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/40 sm:px-6 sm:pt-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19V5M4 19h16M8 15v-4M13 15V8M18 15v-6" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              Órdenes de trabajo por mes
            </h3>
            <p className="mt-0.5 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
              {loading ? "Cargando órdenes…" : `Año ${currentYear}`}
            </p>
          </div>
        </div>
        <div className="relative inline-block">
          <button
            type="button"
            aria-label="Opciones"
            className="dropdown-toggle rounded-lg p-1 text-[#8b8578] transition-colors hover:bg-[#f2ece1] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC]"
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown();
            }}
          >
            <MoreDotIcon className="size-5" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-44 rounded-xl border border-[#e7ded0] bg-white p-1.5 shadow-[0_18px_45px_-20px_rgba(28,25,23,0.35)] dark:border-[#273244] dark:bg-[#111827]"
          >
            <DropdownItem
              onItemClick={() => {
                closeDropdown();
                navigate("/ordenes");
              }}
              baseClassName=""
              className={dropdownItemClass}
            >
              Ver detalle
            </DropdownItem>
            <DropdownItem onItemClick={closeDropdown} baseClassName="" className={dropdownItemClass}>
              Cerrar
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="custom-scrollbar mt-3 max-w-full overflow-x-auto">
        <div className="-ml-5 min-w-[650px] pl-2 xl:min-w-full">
          <Chart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
    </div>
  );
}
