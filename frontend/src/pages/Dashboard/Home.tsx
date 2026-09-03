import { useAuth } from "../../context/AuthContext";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import { useDashboardStats } from "../../components/ecommerce/useDashboardStats";
import PageMeta from "../../components/common/PageMeta";
import TechnicianDashboard from "./TechnicianDashboard";

function capitalizar(texto: string) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

export default function Home() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const dashboard = useDashboardStats();

  const ahora = new Date();
  const hora = ahora.getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const nombre = capitalizar(
    (user?.first_name || "").trim() || (user?.username || "").trim()
  );
  const fechaLarga = capitalizar(
    ahora.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#1B5CFF] border-t-transparent" />
        <span className="sr-only">Cargando panel…</span>
      </div>
    );
  }

  if (!isAdmin) {
    return <TechnicianDashboard />;
  }

  return (
    <>
      <PageMeta
        title="Panel de Control | Sistema Grupo Intrax GPS"
        description="Panel principal del sistema de administración Grupo Intrax GPS"
      />
      <div className="mb-5 [font-family:'Geist','Outfit',system-ui,sans-serif] sm:mb-6">
        <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-7">
          <div
            className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex min-w-0 items-start gap-4">
            <span
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]"
              aria-hidden
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="3" width="8" height="8" rx="1.6" />
                <rect x="13" y="3" width="8" height="5" rx="1.6" />
                <rect x="13" y="10" width="8" height="11" rx="1.6" />
                <rect x="3" y="13" width="8" height="8" rx="1.6" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                Panel de control · {fechaLarga}
              </p>
              <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                {saludo}{nombre ? `, ${nombre}` : ""}
              </h1>
              <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                Este es el resumen de cotizaciones, órdenes de trabajo y actividad reciente del sistema.
              </p>
            </div>
          </div>
        </header>
      </div>
      <div className="grid grid-cols-12 gap-4 [font-family:'Geist','Outfit',system-ui,sans-serif] md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics loading={dashboard.loading} mesActual={dashboard.mesActual} />

          <MonthlySalesChart
            loading={dashboard.loading}
            ordenesCompletadasMeses={dashboard.ordenesCompletadasMeses}
          />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart loading={dashboard.loading} cotizacionesYears={dashboard.cotizacionesYears} />
        </div>
      </div>
    </>
  );
}
