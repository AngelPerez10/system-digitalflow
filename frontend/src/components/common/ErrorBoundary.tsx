import { Component, createRef, type ErrorInfo, type ReactNode } from "react";

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

const fontFamily = "Geist, Outfit, system-ui, sans-serif";

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };
  private headingRef = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error no capturado en la aplicación:", error, errorInfo);
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    if (!prevState.hasError && this.state.hasError) {
      this.headingRef.current?.focus();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="flex min-h-dvh flex-col bg-[#F8FAFC] text-[#09090B] dark:bg-[#0B1220] dark:text-[#F8FAFC]"
        style={{ fontFamily }}
        role="alert"
        aria-labelledby="error-boundary-title"
        aria-describedby="error-boundary-desc"
      >
        {/* Barra de marca — misma altura que el chrome del ERP */}
        <header className="flex h-14 shrink-0 items-center border-b border-[#E7E7EA] bg-white px-4 dark:border-[#1E293B] dark:bg-[#0F172A] sm:px-8">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-7 items-center justify-center rounded-md bg-[#1B5CFF] text-[11px] font-bold tracking-tight text-white dark:bg-[#4B7CFF]"
              aria-hidden="true"
            >
              GI
            </span>
            <span className="text-sm font-semibold tracking-[-0.02em] text-[#09090B] dark:text-[#F8FAFC]">
              Grupo Intrax
            </span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-8 sm:py-16">
          <div className="border-l-[3px] border-[#1B5CFF] pl-5 dark:border-[#4B7CFF] sm:pl-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B5CFF] dark:text-[#4B7CFF]">
              Interrupción temporal
            </p>

            <h1
              id="error-boundary-title"
              ref={this.headingRef}
              tabIndex={-1}
              className="mt-3 max-w-xl text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[#09090B] outline-none dark:text-[#F8FAFC] sm:text-[2.125rem]"
            >
              No se pudo cargar esta sección
            </h1>

            <p
              id="error-boundary-desc"
              className="mt-4 max-w-xl text-pretty text-[15px] leading-7 text-[#52525B] dark:text-[#94A3B8]"
            >
              Suele ocurrir justo después de una actualización del sistema: esta
              pestaña todavía apunta a archivos viejos. Recargar suele bastar.
            </p>
          </div>

          <ol className="mt-10 max-w-xl space-y-3 border-t border-[#E7E7EA] pt-8 dark:border-[#1E293B]">
            <li className="flex gap-3 text-[14px] leading-6 text-[#3F3F46] dark:text-[#CBD5E1]">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[11px] font-semibold text-[#1B5CFF] dark:bg-[#1A2748] dark:text-[#4B7CFF]"
                aria-hidden="true"
              >
                1
              </span>
              <span>
                Pulsa <strong className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">Recargar</strong> para
                pedir la versión actual.
              </span>
            </li>
            <li className="flex gap-3 text-[14px] leading-6 text-[#3F3F46] dark:text-[#CBD5E1]">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[11px] font-semibold text-[#1B5CFF] dark:bg-[#1A2748] dark:text-[#4B7CFF]"
                aria-hidden="true"
              >
                2
              </span>
              <span>
                Si sigue fallando, ve al inicio o cierra la pestaña e inicia sesión
                de nuevo.
              </span>
            </li>
          </ol>

          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-5 text-sm font-semibold tracking-[-0.1px] text-white transition-[background-color,border-color] duration-200 hover:border-[#1244D1] hover:bg-[#1244D1] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.22)] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] motion-reduce:transition-none"
            >
              <svg
                className="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Recargar
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] px-4 text-sm font-medium text-[#52525B] underline-offset-4 transition-colors duration-200 hover:text-[#1B5CFF] hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:text-[#94A3B8] dark:hover:text-[#4B7CFF] motion-reduce:transition-none"
            >
              Ir al inicio
            </button>
          </div>
        </main>

        <footer className="shrink-0 border-t border-[#E7E7EA] px-4 py-4 text-center text-[12px] text-[#6E6E77] dark:border-[#1E293B] dark:text-[#64748B] sm:px-8 sm:text-left">
          Si el problema persiste, contacta a soporte de Grupo Intrax.
        </footer>
      </div>
    );
  }
}
