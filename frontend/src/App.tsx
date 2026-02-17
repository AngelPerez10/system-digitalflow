import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "@/pages/AuthPages/SignIn";
import NotFound from "@/pages/OtherPage/NotFound";
import UserProfiles from "@/pages/ContactosNegocio/Usuarios/GestionUsuario";
import Videos from "@/pages/UiElements/Videos";
import Images from "@/pages/UiElements/Images";
import Alerts from "@/pages/UiElements/Alerts";
import Badges from "@/pages/UiElements/Badges";
import Avatars from "@/pages/UiElements/Avatars";
import Buttons from "@/pages/UiElements/Buttons";
import LineChart from "@/pages/Charts/LineChart";
import BarChart from "@/pages/Charts/BarChart";
import Calendar from "@/pages/MiEscritorio/Calendar";
import TareasPage from "@/pages/MiEscritorio/TareasPage";
import BasicTables from "@/pages/Tables/BasicTables";
import FormElements from "@/pages/Forms/FormElements";
import Blank from "@/pages/Blank";
import AppLayout from "@/layout/AppLayout";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import Home from "@/pages/Dashboard/Home";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Ordenes from "@/pages/Ordenes/OrdenesPage";
import OrdenPdfPage from "@/pages/Ordenes/OrdenPdfPage";
import OrdenesTecnico from "@/pages/Ordenes/OrdenesTecnicoPage";
import Clientes from "@/pages/ContactosNegocio/Clientes/ClientesPage";
import EmpresaPage from "@/pages/ContactosNegocio/Clientes/EmpresaPage";
import PersonasPage from "@/pages/ContactosNegocio/Clientes/PersonasPage";
import ProveedoresPage from "@/pages/ContactosNegocio/Clientes/ProveedoresPage";
import Productos from "@/pages/ProductosYServicios/ProductosPage";
import Servicios from "@/pages/ProductosYServicios/ServiciosPage";
import KpiVentasPage from "@/pages/Kpis/KpiVentasPage";
import CorreoPage from "@/pages/MiEscritorio/CorreoPage";
import TareasTecnicoPage from "@/pages/MiEscritorio/TareasTecnicoPage";
import CotizacionesPage from "@/pages/Cotizacion/CotizacionesPage";
import NuevaCotizacionPage from "@/pages/Cotizacion/NuevaCotizacionPage";
import CotizacionPdfPage from "@/pages/Cotizacion/CotizacionPdfPage";

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
            <Route path="/clientes" element={<RequireAdmin><Clientes /></RequireAdmin>} />
            <Route path="/empresas" element={<RequireAdmin><EmpresaPage /></RequireAdmin>} />
            <Route path="/personas" element={<RequireAdmin><PersonasPage /></RequireAdmin>} />
            <Route path="/proveedores" element={<RequireAdmin><ProveedoresPage /></RequireAdmin>} />
            <Route path="/productos" element={<RequireAdmin><Productos /></RequireAdmin>} />
            <Route path="/servicios" element={<RequireAdmin><Servicios /></RequireAdmin>} />
            <Route path="/cotizacion" element={<RequireAdmin><CotizacionesPage /></RequireAdmin>} />
            <Route path="/cotizacion/nueva" element={<RequireAdmin><NuevaCotizacionPage /></RequireAdmin>} />
            <Route path="/cotizacion/:id/editar" element={<RequireAdmin><NuevaCotizacionPage /></RequireAdmin>} />
            <Route path="/cotizacion/:id/pdf" element={<CotizacionPdfPage />} />

            {/* Correo */}
            <Route path="/correo" element={<RequireAdmin><CorreoPage /></RequireAdmin>} />

            {/* Tareas */}
            <Route path="/tareas" element={<RequireAdmin><TareasPage /></RequireAdmin>} />
            <Route path="/tareas-tecnico" element={<TareasTecnicoPage />} />

            {/* Others Page */}
            <Route path="/profile" element={<RequireAdmin><UserProfiles /></RequireAdmin>} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/kpis/ventas" element={<RequireAdmin><KpiVentasPage /></RequireAdmin>} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

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