import { useAuth } from "../../context/AuthContext";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import { useDashboardStats } from "../../components/ecommerce/useDashboardStats";
import PageMeta from "../../components/common/PageMeta";
import TechnicianDashboard from "./TechnicianDashboard";

export default function Home() {
  const { isAdmin, loading: authLoading } = useAuth();
  const dashboard = useDashboardStats();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
        <div className="text-gray-500 dark:text-gray-400">Cargando panel...</div>
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
      <h1 className="sr-only">Panel de Control</h1>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
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
