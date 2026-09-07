/**
 * Estados compartidos de los guards de `components/auth/guards` (RequireAuth,
 * RequireAdmin, RequirePermission, RequireCuentasAntarixPermission): antes cada
 * archivo repetía su propio spinner y bloque de "Acceso denegado", con colores
 * de marca desactualizados (`brand-600`/`brand-400` en vez del azul
 * `#1B5CFF`/`#4B7CFF` que usa el resto de la UI, p. ej. `SignInForm`).
 */

/** Guard de página completa (RequireAuth, RequireAdmin): spinner + texto centrados en toda la vista. */
export function PageAccessLoading({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-[#1B5CFF]/30 border-t-[#1B5CFF] motion-reduce:animate-none dark:border-[#4B7CFF]/30 dark:border-t-[#4B7CFF]"
        aria-hidden
      />
      <p className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">{label}</p>
    </div>
  );
}

/** Guard de módulo (RequirePermission): spinner inline mientras cargan los permisos. */
export function ModuleAccessLoading({ label = "Verificando permisos..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center p-8" role="status" aria-live="polite" aria-busy="true">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B5CFF]/30 border-t-[#1B5CFF] motion-reduce:animate-none dark:border-[#4B7CFF]/30 dark:border-t-[#4B7CFF]"
        aria-label={label}
      />
    </div>
  );
}

/** Sin el permiso requerido para el módulo. */
export function AccessDenied({ message = "Acceso denegado" }: { message?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="font-semibold text-red-600 dark:text-red-400" role="alert">
        {message}
      </p>
    </div>
  );
}
