import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getOrdenesListPath } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/useOrdenesPagePermissions";
import { PageAccessLoading } from "./AuthGateStates";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();
  const { isAuthenticated, isAdmin, loading, permissions } = useAuth();

  if (loading) {
    return <PageAccessLoading label="Verificando acceso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={getOrdenesListPath(permissions, isAdmin)} replace />;
  }

  return <>{children}</>;
}
