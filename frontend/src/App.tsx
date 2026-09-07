import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Eager: necesarios para el primer render (login, layout, guards de permisos).
import SignIn from "@/pages/AuthPages/SignIn";
import AppLayout from "@/layout/AppLayout";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import RouteLoadingFallback from "@/components/common/RouteLoadingFallback";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import RequireAuth from "@/components/auth/guards/RequireAuth";
import RequireAdmin from "@/components/auth/guards/RequireAdmin";
import RequireCuentasAntarixPermission from "@/components/auth/guards/RequireCuentasAntarixPermission";
import RequirePermission from "@/components/auth/guards/RequirePermission";

// Lazy: cada página se descarga solo cuando se navega a su ruta (code splitting).
const NotFound = lazy(() => import("@/pages/OtherPage/NotFound"));
const GestionUsuario = lazy(() => import("@/pages/Configuracion/GestionUsuario"));
const AjustesGeneralesPage = lazy(() => import("@/pages/Configuracion/AjustesGeneralesPage"));
const ProfilePage = lazy(() => import("@/pages/Perfil/ProfilePage"));
const Calendar = lazy(() => import("@/pages/MiEscritorio/Calendar"));
const TareasPage = lazy(() => import("@/pages/MiEscritorio/Tareas/TareasPage"));
const Home = lazy(() => import("@/pages/Dashboard/Home"));
const Ordenes = lazy(() => import("@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage"));
const OrdenPdfPage = lazy(() => import("@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenPdfPage"));
const OrdenesTecnico = lazy(() => import("@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesTecnicoPage"));
const LevantamientoPage = lazy(() => import("@/pages/Operacion/OrdenesTrabajo/OrdenLevantamiento/LevantamientoPage"));
const ProyectosPage = lazy(() => import("@/pages/Operacion/Proyectos/ProyectosPage"));
const ProyectoPdfPage = lazy(() => import("@/pages/Operacion/Proyectos/ProyectoPdfPage"));
const PolizasMantenimientoPage = lazy(
  () => import("@/pages/Operacion/PolizasMantenimiento/PolizasMantenimientoPage"),
);
const PolizaPdfPage = lazy(() => import("@/pages/Operacion/PolizasMantenimiento/PolizaPdfPage"));
const ReportesMantenimientoPage = lazy(
  () => import("@/pages/Operacion/ReportesMantenimiento/ReportesMantenimientoPage"),
);
const ReporteMantenimientoEditorPage = lazy(
  () => import("@/pages/Operacion/ReportesMantenimiento/ReporteMantenimientoEditorPage"),
);
const ReportePdfPage = lazy(
  () => import("@/pages/Operacion/ReportesMantenimiento/ReportePdfPage"),
);
const Clientes = lazy(() => import("@/pages/ContactosNegocio/Clientes/ClientesPage"));
const EmpresaPage = lazy(() => import("@/pages/ContactosNegocio/Clientes/EmpresaPage"));
const PersonasPage = lazy(() => import("@/pages/ContactosNegocio/Clientes/PersonasPage"));
const ProveedoresPage = lazy(() => import("@/pages/ContactosNegocio/Clientes/ProveedoresPage"));
const Productos = lazy(() => import("@/pages/ProductosYServicios/ProductosPage"));
const Servicios = lazy(() => import("@/pages/ProductosYServicios/ServiciosPage"));
const CorreoPage = lazy(() => import("@/pages/MiEscritorio/CorreoPage"));
const TareasTecnicoPage = lazy(() => import("@/pages/MiEscritorio/Tareas/TareasTecnicoPage"));
const CotizacionesPage = lazy(() => import("@/pages/Ventas/Cotizacion/CotizacionesPage"));
const FacturasCfdiPage = lazy(() => import("@/pages/Ventas/FacturasCFDI/FacturasCfdiPage"));
const NuevaCotizacionPage = lazy(() => import("@/pages/Ventas/Cotizacion/NuevaCotizacionPage"));
const CotizacionPdfPage = lazy(() => import("@/pages/Ventas/Cotizacion/CotizacionPdfPage"));
const IaPage = lazy(() => import("@/pages/IA/iaPage"));
const ReportesPage = lazy(() => import("@/pages/Operacion/Reportes/ReportesPage"));
const CuentasAntarixPage = lazy(() => import("@/pages/Ventas/Suscripcion/CuentasAntarix/CuentasAntarixPage"));
const InventarioPage = lazy(() => import("@/pages/Inventario/InventarioPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
          {/* Auth Layout - Pública */}
          <Route path="/signin" element={<SignIn />} />

          {/* Dashboard Layout - Protegido */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Home />} />
            <Route path="/operador/dashboard" element={<Home />} />

            {/* Dashboard Pages */}
            <Route path="/ordenes" element={<RequirePermission module="ordenes" required="view"><Ordenes /></RequirePermission>} />
            <Route
              path="/cuentas"
              element={
                <RequireCuentasAntarixPermission required="view">
                  <CuentasAntarixPage />
                </RequireCuentasAntarixPermission>
              }
            />
            <Route
              path="/ordenes/:id/pdf"
              element={
                <RequirePermission module="ordenes" required="view">
                  <OrdenPdfPage />
                </RequirePermission>
              }
            />
            <Route path="/ordenes-tecnico" element={<RequirePermission module="ordenes" required="view"><OrdenesTecnico /></RequirePermission>} />
            <Route
              path="/reportes"
              element={
                <RequirePermission module="reportes" required="view">
                  <ReportesPage />
                </RequirePermission>
              }
            />
            <Route path="/levantamiento" element={<RequirePermission module="ordenes" required="view"><LevantamientoPage /></RequirePermission>} />
            <Route path="/proyectos" element={<RequirePermission module="proyectos" required="view"><ProyectosPage /></RequirePermission>} />
            <Route
              path="/proyectos/:id/pdf"
              element={
                <RequirePermission module="proyectos" required="view">
                  <ProyectoPdfPage />
                </RequirePermission>
              }
            />
            <Route
              path="/polizas-mantenimiento"
              element={
                <RequirePermission module="polizas" required="view">
                  <PolizasMantenimientoPage />
                </RequirePermission>
              }
            />
            <Route
              path="/polizas-mantenimiento/pdf"
              element={
                <RequirePermission module="polizas" required="view">
                  <PolizaPdfPage />
                </RequirePermission>
              }
            />
            <Route
              path="/reportes-mantenimiento"
              element={
                <RequirePermission module="reportes_mantenimiento" required="view">
                  <ReportesMantenimientoPage />
                </RequirePermission>
              }
            />
            <Route
              path="/reportes-mantenimiento/nuevo"
              element={
                <RequirePermission module="reportes_mantenimiento" required="create">
                  <ReporteMantenimientoEditorPage />
                </RequirePermission>
              }
            />
            <Route
              path="/reportes-mantenimiento/:id/pdf"
              element={
                <RequirePermission module="reportes_mantenimiento" required="view">
                  <ReportePdfPage />
                </RequirePermission>
              }
            />
            <Route
              path="/reportes-mantenimiento/:id"
              element={
                <RequirePermission module="reportes_mantenimiento" required="edit">
                  <ReporteMantenimientoEditorPage />
                </RequirePermission>
              }
            />
            <Route path="/inventario" element={<RequirePermission module="inventario" required="view"><InventarioPage /></RequirePermission>} />
            <Route path="/clientes" element={<RequirePermission module="clientes" required="view"><Clientes /></RequirePermission>} />
            <Route path="/empresas" element={<RequirePermission module="clientes" required="view"><EmpresaPage /></RequirePermission>} />
            <Route path="/personas" element={<RequirePermission module="clientes" required="view"><PersonasPage /></RequirePermission>} />
            <Route path="/proveedores" element={<RequirePermission module="clientes" required="view"><ProveedoresPage /></RequirePermission>} />
            <Route path="/productos" element={<RequirePermission module="productos" required="view"><Productos /></RequirePermission>} />
            <Route path="/servicios" element={<RequirePermission module="servicios" required="view"><Servicios /></RequirePermission>} />
            <Route path="/cotizacion" element={<RequirePermission module="cotizaciones" required="view"><CotizacionesPage /></RequirePermission>} />
            <Route path="/facturas" element={<RequirePermission module="cotizaciones" required="view"><FacturasCfdiPage /></RequirePermission>}/>
            <Route path="/cotizacion/nueva" element={<RequirePermission module="cotizaciones" required="create"><NuevaCotizacionPage /></RequirePermission>} />
            <Route path="/cotizacion/:id/editar" element={<RequirePermission module="cotizaciones" required="edit"><NuevaCotizacionPage /></RequirePermission>} />
            <Route
              path="/cotizacion/:id/pdf"
              element={
                <RequirePermission module="cotizaciones" required="view">
                  <CotizacionPdfPage />
                </RequirePermission>
              }
            />

            {/* IA (Admin only) */}
            <Route path="/ia" element={<RequireAdmin><IaPage /></RequireAdmin>} />

            {/* Correo */}
            <Route path="/correo" element={<RequireAdmin><CorreoPage /></RequireAdmin>} />

            {/* Agenda (órdenes en calendario) — mismo permiso con el que la gatea el sidebar */}
            <Route path="/calendar" element={<RequirePermission module="ordenes" required="view"><Calendar /></RequirePermission>} />

            {/* Tareas */}
            <Route path="/tareas" element={<RequirePermission module="tareas" required="view"><TareasPage /></RequirePermission>} />
            <Route path="/tareas-tecnico" element={<RequirePermission module="tareas" required="view"><TareasTecnicoPage /></RequirePermission>} />

            {/* Others Page */}
            <Route path="/profile" element={<ProfilePage />} />
            {/* Gestión de usuarios */}
            <Route
              path="/configuracion"
              element={
                <RequireAdmin>
                  <AjustesGeneralesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/usuarios"
              element={
                <RequireAdmin>
                  <RequirePermission module="usuarios" required="view">
                    <GestionUsuario />
                  </RequirePermission>
                </RequireAdmin>
              }
            />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
