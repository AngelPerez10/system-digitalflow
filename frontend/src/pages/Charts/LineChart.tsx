import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import LineChartOne from "../../components/charts/line/LineChartOne";
import PageMeta from "../../components/common/PageMeta";

export default function LineChart() {
  return (
    <>
      <PageMeta
        title="Gráficos de Línea | Sistema Grupo Intrax GPS"
        description="Página de gráficos de línea para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Gráficos de Línea" />
      <div className="space-y-6">
        <ComponentCard title="Gráfico de Línea 1">
          <LineChartOne />
        </ComponentCard>
      </div>
    </>
  );
}
