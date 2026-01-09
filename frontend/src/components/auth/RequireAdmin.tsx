import { Navigate, useLocation } from "react-router-dom";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();

  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const role = (localStorage.getItem('role') || sessionStorage.getItem('role') || '').toLowerCase();
  const isSuperuser = (localStorage.getItem('is_superuser') || sessionStorage.getItem('is_superuser') || '').toLowerCase() === 'true';
  const isAdmin = role === 'admin' || isSuperuser;

  if (!isAdmin) {
    return <Navigate to="/operador/dashboard" replace />;
  }

  return <>{children}</>;
}
