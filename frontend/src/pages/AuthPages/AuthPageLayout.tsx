import React from "react";
import { Link } from "react-router-dom";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { erpSansStyle } from "@/layout/erpPageStyles";

const BRAND_FEATURES = [
  "Cotizaciones y órdenes en un solo lugar",
  "Seguimiento operativo en tiempo real",
  "Acceso seguro por rol y permisos",
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page" style={erpSansStyle}>
      {/* Columna izquierda — 50% en desktop */}
      <section className="auth-page__form" aria-label="Inicio de sesión">
        <header className="auth-page__form-header">
          <ThemeTogglerTwo />
        </header>

        <main className="auth-page__form-main">
          <div className="auth-page__form-inner">{children}</div>
        </main>

        <footer className="shrink-0 px-6 pb-6 text-center text-xs text-[#78716c] dark:text-[#8ea0b8] sm:px-10 lg:px-12 lg:text-left">
          © {new Date().getFullYear()} Grupo Intrax · Sistema Digitalflow
        </footer>
      </section>

      {/* Columna derecha — 50% en desktop */}
      <aside className="auth-page__brand" aria-label="Información del sistema">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ff801f]/20 via-[#1c1917] to-[#0a0a09]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-[12%] h-[min(28rem,45vh)] w-[min(28rem,45vh)] rounded-full bg-[#ff801f]/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-[8%] h-64 w-64 rounded-full bg-[#ff801f]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#faf9f5 1px, transparent 1px), linear-gradient(90deg, #faf9f5 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <div className="relative z-[1] flex flex-1 flex-col justify-center px-12 py-16 xl:px-16">
          <Link
            to="/"
            className="mb-12 inline-flex w-fit rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/50"
          >
            <img
              width={231}
              height={48}
              src="/images/logo/intrax-logo.png"
              alt="Sistema Intrax"
              className="h-11 w-auto brightness-0 invert"
            />
          </Link>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#fb923c]">
            Plataforma empresarial
          </p>
          <h2 className="mt-4 max-w-md [font-family:Georgia,'Times_New_Roman',serif] text-[2rem] font-medium leading-[1.15] tracking-[-0.02em] text-[#faf9f5] xl:text-[2.25rem]">
            Gestiona tu operación con claridad
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-[#a09d96]">
            Cotizaciones, clientes, órdenes de trabajo y más — diseñado para equipos que necesitan
            velocidad y control.
          </p>

          <ul className="mt-12 space-y-4" role="list">
            {BRAND_FEATURES.map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm text-[#d6d3d1]">
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff801f]/20 text-[#fb923c]"
                  aria-hidden
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-[1] border-t border-white/[0.08] px-12 py-6 xl:px-16">
          <p className="text-xs leading-relaxed text-[#8e8b82]">
            Acceso restringido a personal autorizado.
          </p>
        </div>
      </aside>
    </div>
  );
}
