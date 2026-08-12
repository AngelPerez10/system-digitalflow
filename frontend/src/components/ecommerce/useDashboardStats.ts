import { useEffect, useState } from "react";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { currentYearMonth } from "./dashboardStats";

type MesActualMetrics = {
  cotizacionesMes: number;
  ordenesMes: number;
  monthLabel: string;
};

type CotizacionesYears = {
  year: number;
  previousYear: number;
  current: number[];
  previous: number[];
};

const emptyYear = () => Array.from({ length: 12 }, () => 0);

const emptyMesActual = (): MesActualMetrics => ({
  cotizacionesMes: 0,
  ordenesMes: 0,
  monthLabel: new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
});

export function useDashboardStats() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState(() => currentYearMonth().key);
  const [mesActual, setMesActual] = useState<MesActualMetrics>(emptyMesActual);
  const [cotizacionesYears, setCotizacionesYears] = useState<CotizacionesYears>(() => {
    const year = new Date().getFullYear();
    return { year, previousYear: year - 1, current: emptyYear(), previous: emptyYear() };
  });
  const [ordenesCompletadasMeses, setOrdenesCompletadasMeses] = useState<number[]>(emptyYear);

  useEffect(() => {
    const tick = () => {
      const next = currentYearMonth().key;
      setMonthKey((prev) => (prev !== next ? next : prev));
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setMesActual(emptyMesActual());
      setCotizacionesYears(() => {
        const year = new Date().getFullYear();
        return { year, previousYear: year - 1, current: emptyYear(), previous: emptyYear() };
      });
      setOrdenesCompletadasMeses(emptyYear());
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchApi("/api/dashboard/stats/");
        if (cancelled) return;
        if (!res.ok) {
          setMesActual(emptyMesActual());
          setCotizacionesYears(() => {
            const year = new Date().getFullYear();
            return { year, previousYear: year - 1, current: emptyYear(), previous: emptyYear() };
          });
          setOrdenesCompletadasMeses(emptyYear());
          return;
        }
        const data = await res.json().catch(() => null);
        if (cancelled || !data || typeof data !== "object") return;

        const mes = (data as { mes_actual?: Record<string, unknown> }).mes_actual || {};
        setMesActual({
          cotizacionesMes: Number(mes.cotizaciones_mes) || 0,
          ordenesMes: Number(mes.ordenes_mes) || 0,
          monthLabel:
            typeof mes.month_label === "string" && mes.month_label
              ? mes.month_label
              : emptyMesActual().monthLabel,
        });

        const years = (data as { cotizaciones_years?: Record<string, unknown> }).cotizaciones_years || {};
        const year = Number(years.year) || new Date().getFullYear();
        const current = Array.isArray(years.current) ? years.current.map((n) => Number(n) || 0) : emptyYear();
        const previous = Array.isArray(years.previous) ? years.previous.map((n) => Number(n) || 0) : emptyYear();
        setCotizacionesYears({
          year,
          previousYear: Number(years.previous_year) || year - 1,
          current: current.length === 12 ? current : emptyYear(),
          previous: previous.length === 12 ? previous : emptyYear(),
        });

        const ordenes = (data as { ordenes_completadas_meses?: unknown }).ordenes_completadas_meses;
        const ordenesArr = Array.isArray(ordenes) ? ordenes.map((n) => Number(n) || 0) : emptyYear();
        setOrdenesCompletadasMeses(ordenesArr.length === 12 ? ordenesArr : emptyYear());
      } catch {
        if (!cancelled) {
          setMesActual(emptyMesActual());
          setCotizacionesYears(() => {
            const year = new Date().getFullYear();
            return { year, previousYear: year - 1, current: emptyYear(), previous: emptyYear() };
          });
          setOrdenesCompletadasMeses(emptyYear());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAdmin, monthKey]);

  return {
    loading,
    cotizacionesYears,
    ordenesCompletadasMeses,
    mesActual,
  };
}
