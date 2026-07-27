import { useAuth } from "@/context/AuthContext";

type ProyectosPerm = "view" | "create" | "edit" | "delete";

export default function RequireProyectosPermission({
  children,
  required,
}: {
  children: React.ReactNode;
  required: ProyectosPerm;
}) {
  const { permissions, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite" aria-busy="true">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-400"
          aria-label="Verificando permisos..."
        />
      </div>
    );
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  const proyectos = (permissions as Record<string, unknown>)?.proyectos ?? {};
  const proyPerms = proyectos as {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
  const allowed =
    required === "view"
      ? proyPerms.view === true
      : required === "create"
        ? proyPerms.create === true
        : required === "edit"
          ? proyPerms.edit === true
          : proyPerms.delete === true;

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-red-600 dark:text-red-400 font-semibold" role="alert">
          Acceso denegado
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
