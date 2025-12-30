import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";

export default function BasicTables() {
  return (
    <>
      <PageMeta
        title="Tablas Básicas | Sistema Grupo Intrax GPS"
        description="Página de tablas básicas para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Tablas Básicas" />
      <div className="space-y-6">
        <ComponentCard title="Tabla Básica 1">
          <BasicTableOne />
        </ComponentCard>
      </div>
    </>
  );
}
