import React from "react";
import { Link } from "react-router-dom";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { MARCA_FALLBACK_LOGO } from "@/config/marcaApi";
import { useMarca } from "@/context/MarcaContext";
import { erpSansStyle } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles";

const BRAND_FEATURES = [
  "Cotizaciones y órdenes en un solo lugar",
  "Seguimiento operativo en tiempo real",
  "Acceso seguro por rol y permisos",
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { nombre, logoUrl } = useMarca();
  const logoSrc = logoUrl || MARCA_FALLBACK_LOGO;
  const logoIsDefault = !logoUrl;
  const currentYear = new Date().getFullYear();

  return (
    <div className="auth-page" style={erpSansStyle}>
      <section className="auth-page__form" aria-label="Inicio de sesión">
        <header className="auth-page__form-header">
          <ThemeTogglerTwo />
        </header>

        <main className="auth-page__form-main">
          <div className="auth-page__form-inner">
            <Link
              to="/"
              className="auth-brandmark rounded-[10px] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 lg:hidden"
              aria-label={nombre}
            >
              <img
                width={231}
                height={48}
                src={logoSrc}
                alt=""
                className={logoIsDefault ? "dark:brightness-0 dark:invert" : ""}
              />
            </Link>
            {children}
          </div>
        </main>

        <footer className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-[#6E6E77] dark:text-[#8EA0B8] sm:px-10 lg:px-12 lg:text-left">
          © {currentYear} {nombre}
        </footer>
      </section>

      <aside className="auth-page__brand" aria-label="Información del sistema">
        <div className="auth-brand__backdrop" aria-hidden />
        <div className="auth-brand__grid" aria-hidden />
        <div className="auth-brand__topline" aria-hidden />

        <div className="auth-brand__content">
          <Link
            to="/"
            className="mb-12 inline-flex w-fit rounded-[10px] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label={nombre}
          >
            <img
              width={231}
              height={48}
              src={logoSrc}
              alt=""
              className={`h-11 w-auto ${logoIsDefault ? "brightness-0 invert" : ""}`}
            />
          </Link>

          <p className="auth-eyebrow-on-dark">Plataforma empresarial</p>
          <h2 className="auth-brand__title">Gestiona tu operación con claridad</h2>
          <p className="auth-brand__lead">
            Cotizaciones, clientes, órdenes de trabajo y más — diseñado para equipos que necesitan
            velocidad y control.
          </p>

          <ul className="auth-brand__features" role="list">
            {BRAND_FEATURES.map((text) => (
              <li key={text} className="auth-brand__feature">
                <span className="auth-brand__feature-icon" aria-hidden>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-brand__footer">
          <span className="auth-brand__status-dot" aria-hidden />
          <span>Sesión protegida · Todos los sistemas en operación</span>
        </div>
      </aside>
    </div>
  );
}
