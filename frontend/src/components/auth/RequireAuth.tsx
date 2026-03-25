import { Navigate, useLocation } from "react-router-dom";

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  
  // Verificar si hay token en localStorage o sessionStorage
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  
  if (!token) {
    // Redirigir a /signin y guardar la ubicación actual
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}
