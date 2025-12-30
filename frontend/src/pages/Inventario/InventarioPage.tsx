import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function Inventario() {
  return (
    <>
      <PageMeta
        title="Inventario | Sistema Grupo Intrax GPS"
        description="Gestión de inventario para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Inventario" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Inventario
        </h3>
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Aquí podrás gestionar todo el inventario del sistema.
          </p>
          {/* Aquí puedes agregar tu contenido de inventario */}
        </div>
      </div>
    </>
  );
}
