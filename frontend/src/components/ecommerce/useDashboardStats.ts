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

export type ProyectoActivo = {
  id: number;
  folio: string;
  cliente: string;
  tecnico: string;
  avance: number;
  status: string;
  actualizado: string | null;
};

export type DashboardExtra = {
  cotizacionesStatus: Record<string, { count: number; monto: number }>;
  montoAutorizadoMeses: number[];
  ordenesStatus: Record<string, number>;
  proyectos: {
    porStatus: Record<string, number>;
    creadosMeses: number[];
    avancePromedio: number;
    liquidados: number;
    activos: ProyectoActivo[];
  };
};

const emptyYear = () => Array.from({ length: 12 }, () => 0);

const emptyExtra = (): DashboardExtra => ({
  cotizacionesStatus: {},
  montoAutorizadoMeses: emptyYear(),
  ordenesStatus: {},
  proyectos: { porStatus: {}, creadosMeses: emptyYear(), avancePromedio: 0, liquidados: 0, activos: [] },
});

function numArray12(v: unknown): number[] {
  const arr = Array.isArray(v) ? v.map((n) => Number(n) || 0) : [];
  return arr.length === 12 ? arr : emptyYear();
}

function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object") {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) out[k] = Number(n) || 0;
  }
  return out;
}

function parseExtra(data: Record<string, unknown>): DashboardExtra {
  const cotStatus: DashboardExtra["cotizacionesStatus"] = {};
  const rawCot = data.cotizaciones_status;
  if (rawCot && typeof rawCot === "object") {
    for (const [k, v] of Object.entries(rawCot as Record<string, { count?: unknown; monto?: unknown }>)) {
      cotStatus[k] = { count: Number(v?.count) || 0, monto: Number(v?.monto) || 0 };
    }
  }
  const p = (data.proyectos as Record<string, unknown> | undefined) || {};
  const activos = Array.isArray(p.activos)
    ? (p.activos as Record<string, unknown>[]).map((a) => ({
        id: Number(a.id) || 0,
        folio: String(a.folio ?? ""),
        cliente: String(a.cliente ?? ""),
        tecnico: String(a.tecnico ?? ""),
        avance: Math.max(0, Math.min(100, Number(a.avance) || 0)),
        status: String(a.status ?? ""),
        actualizado: typeof a.actualizado === "string" ? a.actualizado : null,
      }))
    : [];
  return {
    cotizacionesStatus: cotStatus,
    montoAutorizadoMeses: numArray12(data.cotizaciones_monto_autorizado_meses),
    ordenesStatus: numRecord(data.ordenes_status),
    proyectos: {
      porStatus: numRecord(p.por_status),
      creadosMeses: numArray12(p.creados_meses),
      avancePromedio: Number(p.avance_promedio) || 0,
      liquidados: Number(p.liquidados) || 0,
      activos,
    },
  };
}

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
  const [extra, setExtra] = useState<DashboardExtra>(emptyExtra);

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
        setExtra(parseExtra(data as Record<string, unknown>));
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
    extra,
  };
}
