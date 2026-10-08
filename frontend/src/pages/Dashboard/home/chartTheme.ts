import type { ApexOptions } from "apexcharts";

/** Colores de ejes, rejilla y tooltip de ApexCharts para cada tema. */
export function chartPalette(dark: boolean) {
  return {
    axis: dark ? "#8EA0B8" : "#71717A",
    grid: dark ? "#1F2A3C" : "#F0F0F2",
    secondary: dark ? "#64748B" : "#A1A1AA",
    gold: "#E6A23C",
  };
}

/** Opciones comunes: tipografía, sin barra de herramientas, animación corta. */
export function baseChartOptions(dark: boolean, reducedMotion: boolean): ApexOptions {
  const p = chartPalette(dark);
  return {
    chart: {
      fontFamily: "Geist, Outfit, system-ui, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      parentHeightOffset: 0,
      animations: {
        enabled: !reducedMotion,
        speed: 520,
        animateGradually: { enabled: true, delay: 40 },
        dynamicAnimation: { enabled: !reducedMotion, speed: 360 },
      },
    },
    theme: { mode: dark ? "dark" : "light" },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      borderColor: p.grid,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8, top: 0, bottom: 0 },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: { style: { colors: p.axis, fontSize: "12px" } },
      crosshairs: { stroke: { color: p.secondary, width: 1, dashArray: 3 } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: { colors: [p.axis], fontSize: "12px" },
        formatter: (v: number) => Math.round(v).toLocaleString("es-MX"),
      },
    },
    tooltip: { theme: dark ? "dark" : "light", style: { fontFamily: "Geist, Outfit, system-ui, sans-serif" } },
  };
}
