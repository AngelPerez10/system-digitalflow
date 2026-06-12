/**
 * Fallback mostrado por <Suspense> mientras se descarga el chunk de una ruta lazy.
 * Mismo lenguaje visual que el loading de RequireAuth (centrado, texto gris, dark mode).
 */
export default function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#ff801f] dark:border-gray-600 dark:border-t-[#ff801f]"
        aria-hidden="true"
      />
      <span className="text-sm text-gray-500 dark:text-gray-400">Cargando módulo…</span>
    </div>
  );
}
