import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import {
  buildCotizacionesYearSeries,
  buildMesActualMetrics,
  buildOrdenesCompletadasYearSeries,
  currentYearMonth,
  normalizeApiList,
} from "./dashboardStats";

export function useDashboardStats() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [ordenes, setOrdenes] = useState<Record<string, unknown>[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState(() => currentYearMonth().key);

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
      setOrdenes([]);
      setCotizaciones([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [ordenesRes, cotizacionesRes] = await Promise.all([
          fetchApi("/api/ordenes/"),
          fetchApi("/api/cotizaciones/"),
        ]);

        if (cancelled) return;

        const ordenesList = ordenesRes.ok
          ? normalizeApiList(await ordenesRes.json().catch(() => []))
          : [];
        const cotizacionesList = cotizacionesRes.ok
          ? normalizeApiList(await cotizacionesRes.json().catch(() => []))
          : [];

        setOrdenes(ordenesList);
        setCotizaciones(cotizacionesList);
      } catch {
        if (!cancelled) {
          setOrdenes([]);
          setCotizaciones([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAdmin, monthKey]);

  const cotizacionesYears = useMemo(
    () => buildCotizacionesYearSeries(cotizaciones),
    [cotizaciones]
  );

  const ordenesCompletadasMeses = useMemo(
    () => buildOrdenesCompletadasYearSeries(ordenes),
    [ordenes]
  );

  const mesActual = useMemo(
    () => buildMesActualMetrics({ ordenes, cotizaciones }),
    [ordenes, cotizaciones, monthKey]
  );

  return {
    loading,
    cotizacionesYears,
    ordenesCompletadasMeses,
    mesActual,
  };
}
