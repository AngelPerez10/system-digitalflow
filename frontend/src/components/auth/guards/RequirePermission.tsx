import { useAuth } from "@/context/AuthContext";
import { AccessDenied, ModuleAccessLoading } from "./AuthGateStates";

/**
 * Reemplaza los ~10 `RequireXPermission` que existían antes (uno por módulo:
 * Ordenes, Clientes, Cotizaciones, Inventario, Productos, Proyectos,
 * Reportes, Servicios, Tareas, Usuarios) — eran copias idénticas salvo la key
 * de `permissions` que leían y qué flags aceptaban. La autorización real
 * siempre la decide el servidor; esto solo oculta/muestra UI.
 *
 * Nota: antes cada módulo tenía su propia unión de flags válidos (p. ej.
 * Reportes no aceptaba "edit"). Aquí se relaja a un único `PermissionFlag`
 * para los ~10 módulos porque un `required` inválido para un módulo en
 * concreto simplemente nunca es `true` — no hay riesgo real, solo se pierde
 * el chequeo en build time a cambio de eliminar la duplicación.
 */
export type PermissionFlag = "view" | "create" | "edit" | "delete";

interface RequirePermissionProps {
  /**
   * Key en `permissions` (p. ej. "ordenes", "clientes", "usuarios"). Con varios
   * módulos basta con que uno tenga el permiso (vistas que juntan módulos).
   */
  module: string | string[];
  required: PermissionFlag;
  children: React.ReactNode;
}

export default function RequirePermission({ module, required, children }: RequirePermissionProps) {
  const { permissions, isAdmin, loading } = useAuth();

  if (loading) {
    return <ModuleAccessLoading />;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  const modules = Array.isArray(module) ? module : [module];
  const allowed = modules.some((m) => {
    const flags = ((permissions as Record<string, unknown>)?.[m] ?? {}) as Partial<Record<PermissionFlag, boolean>>;
    return flags[required] === true;
  });

  if (!allowed) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
