import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Error boundary global de la SPA.
 *
 * Motivo principal: las rutas usan `React.lazy` + `Suspense`. Tras un deploy los
 * hashes de los chunks viejos dejan de existir; una pestaña abierta que navega a
 * otra ruta recibe un 404 al pedir su chunk, `import()` rechaza y sin boundary
 * React desmonta todo el árbol → pantalla en blanco.
 *
 * Solo se puede implementar como class component: `componentDidCatch` /
 * `getDerivedStateFromError` no tienen equivalente en hooks.
 */

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Sin logging remoto configurado: al menos dejar rastro en la consola del
    // navegador para poder diagnosticar reportes de usuarios.
    console.error("Error no capturado en la aplicación:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        role="alert"
      >
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Ocurrió un error inesperado
        </h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          No fue posible mostrar esta sección. Si acabas de recibir una
          actualización del sistema, recargar la página suele resolverlo.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-lg bg-[#ff801f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e6720e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
        >
          Recargar la página
        </button>
      </div>
    );
  }
}
