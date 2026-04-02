import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "@/pages/AuthPages/SignIn";
import NotFound from "@/pages/OtherPage/NotFound";
import GestionUsuario from "@/pages/ContactosNegocio/Usuarios/GestionUsuario";
import ProfilePage from "@/pages/Perfil/ProfilePage";
import Images from "@/pages/UiElements/Images";
import LineChart from "@/pages/Charts/LineChart";
import BarChart from "@/pages/Charts/BarChart";
import Calendar from "@/pages/MiEscritorio/Calendar";
import TareasPage from "@/pages/MiEscritorio/TareasPage";
import AppLayout from "@/layout/AppLayout";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import Home from "@/pages/Dashboard/Home";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireAdmin from "@/components/auth/RequireAdmin";
import RequireUsuariosView from "@/components/auth/RequireUsuariosView";
import RequireCotizacionPermission from "@/components/auth/RequireCotizacionPermission";
import RequireClientePermission from "@/components/auth/RequireClientePermission";
import Ordenes from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage";
import OrdenPdfPage from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenPdfPage";
import OrdenesTecnico from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesTecnicoPage";
import LevantamientoPage from "@/pages/Operacion/OrdenesTrabajo/OrdenLevantamiento/LevantamientoPage";
import Clientes from "@/pages/ContactosNegocio/Clientes/ClientesPage";
import EmpresaPage from "@/pages/ContactosNegocio/Clientes/EmpresaPage";
import PersonasPage from "@/pages/ContactosNegocio/Clientes/PersonasPage";
import ProveedoresPage from "@/pages/ContactosNegocio/Clientes/ProveedoresPage";
import Productos from "@/pages/ProductosYServicios/ProductosPage";
import Servicios from "@/pages/ProductosYServicios/ServiciosPage";
import CorreoPage from "@/pages/MiEscritorio/CorreoPage";
import TareasTecnicoPage from "@/pages/MiEscritorio/TareasTecnicoPage";
import CotizacionesPage from "@/pages/Cotizacion/CotizacionesPage";
import NuevaCotizacionPage from "@/pages/Cotizacion/NuevaCotizacionPage";
import CotizacionPdfPage from "@/pages/Cotizacion/CotizacionPdfPage";
import IaPage from "@/pages/IA/iaPage";
import ReportesPage from "@/pages/Operacion/Reportes/ReportesPage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Auth Layout - Pública */}
          <Route path="/signin" element={<SignIn />} />

          {/* Dashboard Layout - Protegido */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index path="/" element={<Home />} />
            <Route path="/operador/dashboard" element={<Home />} />

            {/* Dashboard Pages */}
            <Route path="/ordenes" element={<RequireAdmin><Ordenes /></RequireAdmin>} />
            <Route path="/ordenes/:id/pdf" element={<OrdenPdfPage />} />
            <Route path="/ordenes-tecnico" element={<OrdenesTecnico />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/levantamiento" element={<RequireAdmin><LevantamientoPage /></RequireAdmin>} />
            <Route path="/clientes" element={<RequireClientePermission required="view"><Clientes /></RequireClientePermission>} />
            <Route path="/empresas" element={<RequireClientePermission required="view"><EmpresaPage /></RequireClientePermission>} />
            <Route path="/personas" element={<RequireClientePermission required="view"><PersonasPage /></RequireClientePermission>} />
            <Route path="/proveedores" element={<RequireClientePermission required="view"><ProveedoresPage /></RequireClientePermission>} />
            <Route path="/productos" element={<RequireAdmin><Productos /></RequireAdmin>} />
            <Route path="/servicios" element={<RequireAdmin><Servicios /></RequireAdmin>} />
            <Route path="/cotizacion" element={<RequireCotizacionPermission required="view"><CotizacionesPage /></RequireCotizacionPermission>} />
            <Route path="/cotizacion/nueva" element={<RequireCotizacionPermission required="create"><NuevaCotizacionPage /></RequireCotizacionPermission>} />
            <Route path="/cotizacion/:id/editar" element={<RequireCotizacionPermission required="edit"><NuevaCotizacionPage /></RequireCotizacionPermission>} />
            <Route path="/cotizacion/:id/pdf" element={<CotizacionPdfPage />} />

            {/* IA (Admin only) */}
            <Route path="/ia" element={<RequireAdmin><IaPage /></RequireAdmin>} />

            {/* Correo */}
            <Route path="/correo" element={<RequireAdmin><CorreoPage /></RequireAdmin>} />

            {/* Tareas */}
            <Route path="/tareas" element={<RequireAdmin><TareasPage /></RequireAdmin>} />
            <Route path="/tareas-tecnico" element={<TareasTecnicoPage />} />

            {/* Others Page */}
            <Route path="/profile" element={<ProfilePage />} />
            {/* Gestión de usuarios */}
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
            <Route path="/calendar" element={<Calendar />} />

            {/* Ui Elements */}
            <Route path="/images" element={<Images />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}