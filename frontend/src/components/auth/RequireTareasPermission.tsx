import { useAuth } from "@/context/AuthContext";

type TareasPerm = "view" | "create" | "edit";

export default function RequireTareasPermission({
  children,
  required,
}: {
  children: React.ReactNode;
  required: TareasPerm;
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

  const tareas = (permissions as Record<string, unknown>)?.tareas ?? {};
  const tareasPerms = tareas as { view?: boolean; create?: boolean; edit?: boolean };
  const allowed =
    required === "view"
      ? tareasPerms.view === true
      : required === "create"
        ? tareasPerms.create === true
        : tareasPerms.edit === true;

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
