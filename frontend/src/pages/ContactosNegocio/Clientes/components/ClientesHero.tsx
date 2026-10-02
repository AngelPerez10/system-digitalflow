/**
 * Encabezado de Contactos: banda marina igual a la de las demás vistas
 * (Equipo, Órdenes, Cotizaciones…), con el total y la acción principal.
 */
import { BookUser, Plus } from "lucide-react";

const numberFmt = new Intl.NumberFormat("es-MX");

export function ClientesHero({
  total,
  filtered,
  loading,
  canCreate,
  onCreate,
}: {
  total: number;
  /** El total corresponde a una búsqueda o filtro (no al catálogo completo). */
  filtered: boolean;
  loading: boolean;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <header className="cot-sheen cot-rise relative overflow-hidden rounded-[24px] bg-[#17235B] text-white dark:bg-[#1B2A63]">
      <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]" aria-hidden>
            <BookUser className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Contactos de negocio</p>
            <h1 className="mt-1 text-[28px] font-bold leading-[1.15] tracking-[-1.1px] sm:text-[32px]">Contactos</h1>
            <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/75">
              Empresas, personas físicas y proveedores con sus contactos, direcciones y datos fiscales.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex h-12 items-center gap-3 rounded-[14px] bg-white/[0.08] px-4" aria-live="polite" aria-atomic="true">
            <div className="leading-none">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/60">
                {filtered ? "Coincidencias" : "Registrados"}
              </p>
              <p className="mt-1 h-5 text-[18px] font-semibold tabular-nums">
                {loading ? (
                  <span className="sr-only">Cargando total</span>
                ) : (
                  <span key={total} className="cot-flash inline-block">
                    {numberFmt.format(total)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              aria-keyshortcuts="N"
              className="cot-press inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-white px-5 text-[15px] font-semibold tracking-[-0.1px] text-[#17235B] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)] hover:bg-[#F1F5FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
            >
              <Plus className="size-4.5" strokeWidth={2.4} aria-hidden />
              Nuevo contacto
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
