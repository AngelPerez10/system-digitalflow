/** Enlaces viejos `/reportes-mantenimiento/:id` → editor del reporte en Mantenimiento. */
import { Navigate, useParams } from "react-router-dom";
import { MANTENIMIENTO_PATH, reporteEditPath } from "./shared/mantenimientoRutas";

export default function RedirectReporteMantenimiento() {
  const { id } = useParams();
  const n = Number(id);
  return <Navigate to={Number.isFinite(n) && n > 0 ? reporteEditPath(n) : MANTENIMIENTO_PATH} replace />;
}
