import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import BarChartOne from "../../components/charts/bar/BarChartOne";
import PageMeta from "../../components/common/PageMeta";

export default function BarChart() {
  return (
    <div>
      <PageMeta
        title="Gráficos de Barras | Sistema Grupo Intrax GPS"
        description="Página de gráficos de barras para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Gráficos de Barras" />
      <div className="space-y-6">
        <ComponentCard title="Gráfico de Barras 1">
          <BarChartOne />
        </ComponentCard>
      </div>
    </div>
  );
}
