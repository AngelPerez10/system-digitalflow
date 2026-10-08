import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDashboardStats } from "../../components/ecommerce/useDashboardStats";
import PageMeta from "../../components/common/PageMeta";
import { sansStyle } from "../Operacion/Proyectos/shared/proyectoTokens";
import TechnicianDashboard from "./TechnicianDashboard";
import { ActividadReciente } from "./home/ActividadReciente";
import { CotizacionesEstadoCard } from "./home/CotizacionesEstadoCard";
import { CotizacionesTrendCard } from "./home/CotizacionesTrendCard";
import { DashboardHero, type HeroEstado } from "./home/DashboardHero";
import { KpiCards, type Kpi } from "./home/KpiCards";
import { MontoAutorizadoCard } from "./home/MontoAutorizadoCard";
import { OrdenesCompletadasCard } from "./home/OrdenesCompletadasCard";
import { OrdenesEstadoCard } from "./home/OrdenesEstadoCard";
import { ProyectosCard } from "./home/ProyectosCard";
import { MESES_CORTOS, formatEntero, formatMoneda, porcentaje, sumHasta, variacion } from "./home/dashboardMath";

function capitalizar(texto: string) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

const container = "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-12 pt-6 sm:space-y-6 sm:px-5 md:px-6 lg:px-8 xl:px-10";
const row = "grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]";

function HomeSkeleton() {
  return (
    <div className={container} role="status" aria-live="polite">
      <div className="h-42 animate-pulse rounded-4xl border border-[#E7E7EA] bg-[#F4F4F5] dark:border-[#273244] dark:bg-white/5" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-42 animate-pulse rounded-4xl bg-[#F4F4F5] dark:bg-white/5" />
        ))}
      </div>
      <span className="sr-only">Cargando panel…</span>
    </div>
  );
}

function AdminDashboard({ nombre }: { nombre: string }) {
  const { loading, mesActual, cotizacionesYears, ordenesCompletadasMeses, extra } = useDashboardStats();

  const ahora = new Date();
  const fechaLarga = capitalizar(ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  const mesIdx = ahora.getMonth();
  const mesNombre = capitalizar(ahora.toLocaleDateString("es-MX", { month: "long" }));
  const horaActualizacion = useMemo(
    () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    // Se recalcula al terminar cada carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading],
  );

  const { current, previous, year, previousYear } = cotizacionesYears;
  const { cotizacionesStatus, montoAutorizadoMeses, ordenesStatus, proyectos } = extra;

  const cotTotalAnio = Object.values(cotizacionesStatus).reduce((a, s) => a + s.count, 0);
  const autorizadas = cotizacionesStatus.AUTORIZADA?.count ?? 0;
  const montoAnio = sumHasta(montoAutorizadoMeses, mesIdx);

  const estado = useMemo<HeroEstado[]>(() => {
    const finDeMes = new Date(ahora.getFullYear(), mesIdx + 1, 0).getDate();
    const restantes = finDeMes - ahora.getDate();
    return [
      { label: "Proyectos activos", value: proyectos.porStatus.en_proceso ?? 0, hint: "en proceso" },
      { label: "Órdenes pendientes", value: ordenesStatus.pendiente ?? 0, hint: "por atender" },
      { label: "Cotizaciones abiertas", value: cotizacionesStatus.PENDIENTE?.count ?? 0, hint: "por autorizar" },
      {
        label: `Cierre de ${mesNombre.toLowerCase()}`,
        value: restantes,
        hint: restantes === 1 ? "día restante" : "días restantes",
        ratio: ahora.getDate() / finDeMes,
      },
    ];
    // `ahora` cambia en cada render; el mes ya está en `mesIdx`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectos.porStatus, ordenesStatus, cotizacionesStatus, mesIdx, mesNombre]);

  const kpis = useMemo<Kpi[]>(() => {
    const resueltasMes = ordenesCompletadasMeses[mesIdx] || 0;
    const mesesConMonto = montoAutorizadoMeses.slice(0, mesIdx + 1).filter((v) => v > 0).length;
    return [
      {
        key: "cot-mes",
        label: "Cotizaciones del mes",
        value: mesActual.cotizacionesMes,
        hint: `${mesNombre} ${year}`,
        to: "/cotizacion",
        icon: "cotizacion",
        modulo: "ventas",
        delta: {
          pct: variacion(mesActual.cotizacionesMes, previous[mesIdx] || 0),
          contra: `vs. ${MESES_CORTOS[mesIdx].toLowerCase()} ${previousYear}`,
        },
        spark: current.slice(0, mesIdx + 1),
      },
      {
        key: "monto-mes",
        label: "Autorizado del mes",
        value: montoAutorizadoMeses[mesIdx] || 0,
        format: "moneda",
        hint: `${mesNombre} ${year}`,
        to: "/cotizacion",
        icon: "monto",
        modulo: "monto",
        note: `Promedio ${formatMoneda(mesesConMonto ? montoAnio / mesesConMonto : 0)} por mes`,
        spark: montoAutorizadoMeses.slice(0, mesIdx + 1),
      },
      {
        key: "ord-mes",
        label: "Órdenes del mes",
        value: mesActual.ordenesMes,
        hint: `Registradas en ${mesNombre.toLowerCase()}`,
        to: "/ordenes",
        icon: "orden",
        modulo: "ordenes",
        progress: {
          ratio: mesActual.ordenesMes ? Math.min(1, resueltasMes / mesActual.ordenesMes) : 0,
          label: `${formatEntero(resueltasMes)} resueltas este mes`,
          tone: "exito",
        },
      },
      {
        key: "proy",
        label: "Proyectos en proceso",
        value: proyectos.porStatus.en_proceso ?? 0,
        hint: `${formatEntero(sumHasta(proyectos.creadosMeses, mesIdx))} creados en ${year}`,
        to: "/proyectos",
        icon: "proyecto",
        modulo: "proyectos",
        progress: { ratio: proyectos.avancePromedio / 100, label: "Avance promedio" },
      },
    ];
  }, [current, previous, year, previousYear, mesActual, ordenesCompletadasMeses, montoAutorizadoMeses, montoAnio, proyectos, mesIdx, mesNombre]);

  return (
    <div className={container} style={sansStyle}>
      <DashboardHero
        nombre={nombre}
        fechaLarga={fechaLarga}
        horaActualizacion={horaActualizacion}
        loading={loading}
        year={year}
        montoAutorizadoAnio={montoAnio}
        autorizadas={autorizadas}
        tasaAutorizacion={porcentaje(autorizadas, cotTotalAnio)}
        estado={estado}
      />

      <KpiCards kpis={kpis} loading={loading} />

      <div className={row}>
        <CotizacionesTrendCard
          loading={loading}
          year={year}
          previousYear={previousYear}
          current={current}
          previous={previous}
          mesIdx={mesIdx}
          index={0}
        />
        <CotizacionesEstadoCard loading={loading} year={year} status={cotizacionesStatus} index={1} />
      </div>

      <div className={row}>
        <MontoAutorizadoCard loading={loading} year={year} serie={montoAutorizadoMeses} mesIdx={mesIdx} index={0} />
        <OrdenesEstadoCard loading={loading} year={year} status={ordenesStatus} index={1} />
      </div>

      <ProyectosCard loading={loading} year={year} mesIdx={mesIdx} proyectos={proyectos} index={0} />

      <div className={row}>
        <OrdenesCompletadasCard loading={loading} year={year} serie={ordenesCompletadasMeses} mesIdx={mesIdx} index={0} />
        <ActividadReciente index={1} />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const nombre = capitalizar((user?.first_name || "").trim() || (user?.username || "").trim());

  return (
    <>
      <PageMeta
        title="Panel de Control | Sistema Grupo Intrax GPS"
        description="Panel principal del sistema de administración Grupo Intrax GPS"
      />
      {authLoading ? <HomeSkeleton /> : isAdmin ? <AdminDashboard nombre={nombre} /> : <TechnicianDashboard />}
    </>
  );
}
