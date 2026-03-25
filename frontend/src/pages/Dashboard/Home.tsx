import { lazy, Suspense } from "react";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import PageMeta from "../../components/common/PageMeta";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import TechnicianDashboard from "./TechnicianDashboard";

/** Chunk aparte: @react-jvectormap usa eval y no debe bloquear el bundle principal en producción */
const DemographicCard = lazy(() => import("../../components/ecommerce/DemographicCard"));

export default function Home() {
  const role = (
    localStorage.getItem("role") ||
    sessionStorage.getItem("role") ||
    ""
  ).toLowerCase();
  const isAdmin = role === "admin";

  if (!isAdmin) {
    return <TechnicianDashboard />;
  }

  return (
    <>
      <PageMeta
        title="Panel de Control | Sistema Grupo Intrax GPS"
        description="Panel principal del sistema de administración Grupo Intrax GPS"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50" />
              }
            >
              <DemographicCard />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </>
  );
}
