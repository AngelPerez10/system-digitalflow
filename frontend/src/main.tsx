import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// CSS de flatpickr lo importa components/form/date-picker.tsx (va en su chunk).
// Swiper no se usa en ningún componente; no cargar su CSS globalmente.
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppWrapper>
          <App />
        </AppWrapper>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
