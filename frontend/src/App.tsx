import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Eager: necesarios para el primer render (login, layout, guards de permisos).
import SignIn from "@/pages/AuthPages/SignIn";
import AppLayout from "@/layout/AppLayout";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import RouteLoadingFallback from "@/components/common/RouteLoadingFallback";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireAdmin from "@/components/auth/RequireAdmin";
import RequireCuentasAntarixPermission from "@/components/auth/RequireCuentasAntarixPermission";
import RequireUsuariosView from "@/components/auth/RequireUsuariosView";
import RequireCotizacionPermission from "@/components/auth/RequireCotizacionPermission";
import RequireClientePermission from "@/components/auth/RequireClientePermission";
import RequireOrdenesPermission from "@/components/auth/RequireOrdenesPermission";
import RequireProyectosPermission from "@/components/auth/RequireProyectosPermission";
import RequireInventarioPermission from "@/components/auth/RequireInventarioPermission";
import RequireProductosPermission from "@/components/auth/RequireProductosPermission";
import RequireServiciosPermission from "@/components/auth/RequireServiciosPermission";
import RequireReportesPermission from "@/components/auth/RequireReportesPermission";
import RequireTareasPermission from "@/components/auth/RequireTareasPermission";

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
            <Route path="/ordenes" element={<RequireOrdenesPermission required="view"><Ordenes /></RequireOrdenesPermission>} />
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
                <RequireOrdenesPermission required="view">
                  <OrdenPdfPage />
                </RequireOrdenesPermission>
              }
            />
            <Route path="/ordenes-tecnico" element={<RequireOrdenesPermission required="view"><OrdenesTecnico /></RequireOrdenesPermission>} />
            <Route
              path="/reportes"
              element={
                <RequireReportesPermission required="view">
                  <ReportesPage />
                </RequireReportesPermission>
              }
            />
            <Route path="/levantamiento" element={<RequireOrdenesPermission required="view"><LevantamientoPage /></RequireOrdenesPermission>} />
            <Route path="/proyectos" element={<RequireProyectosPermission required="view"><ProyectosPage /></RequireProyectosPermission>} />
            <Route
              path="/proyectos/:id/pdf"
              element={
                <RequireProyectosPermission required="view">
                  <ProyectoPdfPage />
                </RequireProyectosPermission>
              }
            />
            <Route
              path="/polizas-mantenimiento"
              element={
                <RequireAdmin>
                  <PolizasMantenimientoPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/polizas-mantenimiento/pdf"
              element={
                <RequireAdmin>
                  <PolizaPdfPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/reportes-mantenimiento"
              element={
                <RequireAdmin>
                  <ReportesMantenimientoPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/reportes-mantenimiento/nuevo"
              element={
                <RequireAdmin>
                  <ReporteMantenimientoEditorPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/reportes-mantenimiento/:id/pdf"
              element={
                <RequireAdmin>
                  <ReportePdfPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/reportes-mantenimiento/:id"
              element={
                <RequireAdmin>
                  <ReporteMantenimientoEditorPage />
                </RequireAdmin>
              }
            />
            <Route path="/inventario" element={<RequireInventarioPermission required="view"><InventarioPage /></RequireInventarioPermission>} />
            <Route path="/clientes" element={<RequireClientePermission required="view"><Clientes /></RequireClientePermission>} />
            <Route path="/empresas" element={<RequireClientePermission required="view"><EmpresaPage /></RequireClientePermission>} />
            <Route path="/personas" element={<RequireClientePermission required="view"><PersonasPage /></RequireClientePermission>} />
            <Route path="/proveedores" element={<RequireClientePermission required="view"><ProveedoresPage /></RequireClientePermission>} />
            <Route path="/productos" element={<RequireProductosPermission required="view"><Productos /></RequireProductosPermission>} />
            <Route path="/servicios" element={<RequireServiciosPermission required="view"><Servicios /></RequireServiciosPermission>} />
            <Route path="/cotizacion" element={<RequireCotizacionPermission required="view"><CotizacionesPage /></RequireCotizacionPermission>} />
            <Route path="/facturas" element={<RequireCotizacionPermission required="view"><FacturasCfdiPage /></RequireCotizacionPermission>}/>
            <Route path="/cotizacion/nueva" element={<RequireCotizacionPermission required="create"><NuevaCotizacionPage /></RequireCotizacionPermission>} />
            <Route path="/cotizacion/:id/editar" element={<RequireCotizacionPermission required="edit"><NuevaCotizacionPage /></RequireCotizacionPermission>} />
            <Route
              path="/cotizacion/:id/pdf"
              element={
                <RequireCotizacionPermission required="view">
                  <CotizacionPdfPage />
                </RequireCotizacionPermission>
              }
            />

            {/* IA (Admin only) */}
            <Route path="/ia" element={<RequireAdmin><IaPage /></RequireAdmin>} />

            {/* Correo */}
            <Route path="/correo" element={<RequireAdmin><CorreoPage /></RequireAdmin>} />

            {/* Agenda (órdenes en calendario) — mismo permiso con el que la gatea el sidebar */}
            <Route path="/calendar" element={<RequireOrdenesPermission required="view"><Calendar /></RequireOrdenesPermission>} />

            {/* Tareas */}
            <Route path="/tareas" element={<RequireTareasPermission required="view"><TareasPage /></RequireTareasPermission>} />
            <Route path="/tareas-tecnico" element={<RequireTareasPermission required="view"><TareasTecnicoPage /></RequireTareasPermission>} />

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
                  <RequireUsuariosView>
                    <GestionUsuario />
                  </RequireUsuariosView>
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
