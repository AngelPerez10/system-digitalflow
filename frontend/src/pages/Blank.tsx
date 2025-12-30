import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

export default function Blank() {
  return (
    <div>
      <PageMeta
        title="Página en Blanco | Sistema Grupo Intrax GPS"
        description="Página en blanco para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Página en Blanco" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Título de la Tarjeta Aquí
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Comienza a agregar contenido en cuadrículas o paneles, también puedes usar diferentes
            combinaciones de cuadrículas. Por favor revisa el panel de control y otras páginas
          </p>
        </div>
      </div>
    </div>
  );
}
