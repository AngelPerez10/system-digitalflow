import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import ErrorBoundary from "./components/common/ErrorBoundary.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-900 p-6 text-center text-white">
          <p className="text-lg font-medium">Error al cargar la aplicación</p>
          <p className="max-w-md text-sm text-gray-400">
            Abre la consola del navegador (F12) para ver el detalle, o recarga la página.
          </p>
        </div>
      }
    >
      <ThemeProvider>
        <AppWrapper>
          <App />
        </AppWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
