import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "@/pages/AuthPages/SignIn";
import NotFound from "@/pages/OtherPage/NotFound";
import UserProfiles from "@/pages/UserProfiles";
import Videos from "@/pages/UiElements/Videos";
import Images from "@/pages/UiElements/Images";
import Alerts from "@/pages/UiElements/Alerts";
import Badges from "@/pages/UiElements/Badges";
import Avatars from "@/pages/UiElements/Avatars";
import Buttons from "@/pages/UiElements/Buttons";
import LineChart from "@/pages/Charts/LineChart";
import BarChart from "@/pages/Charts/BarChart";
import Calendar from "@/pages/Calendar";
import BasicTables from "@/pages/Tables/BasicTables";
import FormElements from "@/pages/Forms/FormElements";
import Blank from "@/pages/Blank";
import AppLayout from "@/layout/AppLayout";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import Home from "@/pages/Dashboard/Home";
import RequireAuth from "@/components/auth/RequireAuth";
import Ordenes from "@/pages/Ordenes/OrdenesPage";
import OrdenPdfPage from "@/pages/Ordenes/OrdenPdfPage";
import OrdenesTecnico from "@/pages/Ordenes/OrdenesTecnicoPage";
import Clientes from "@/pages/Clientes/ClientesPage";
import Inventario from "@/pages/Inventario/InventarioPage";

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

            {/* Dashboard Pages */}
            <Route path="/ordenes" element={<Ordenes />} />
            <Route path="/ordenes/:id/pdf" element={<OrdenPdfPage />} />
            <Route path="/ordenes-tecnico" element={<OrdenesTecnico />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/inventario" element={<Inventario />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
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
