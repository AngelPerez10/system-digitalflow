/**
 * Bloque «Cotización» del listado de órdenes (solo admins).
 *
 * - `OrdenOficinaCell`: celda de la tabla (tablet/escritorio).
 * - `OrdenOficinaBlock`: bloque de la tarjeta móvil (lista completa).
 *
 * El disparador y el panel «Cotizaciones vinculadas» son compartidos con el
 * listado de Proyectos: ver `Operacion/shared/CotizacionVinculadaTrigger`.
 */
import {
  CotizacionVinculadaRow,
  CotizacionVinculadaTrigger,
  SinCotizacionBadge,
  type CotizacionRef,
} from "../../../shared/CotizacionVinculadaTrigger";
import type { Orden } from "../shared/ordenesPageTypes";

type OrdenOficina = Pick<Orden, "cotizaciones_resumen" | "cotizaciones_adjuntas">;

/** Resumen del listado; si la fila viene de un guardado (detalle), usa las adjuntas completas. */
function cotizacionesDe(orden: OrdenOficina): CotizacionRef[] {
  const src = Array.isArray(orden.cotizaciones_resumen)
    ? orden.cotizaciones_resumen
    : Array.isArray(orden.cotizaciones_adjuntas)
      ? orden.cotizaciones_adjuntas
      : [];
  return src
    .filter((c) => c && (c.origen === "digitalflow" || c.origen === "sicar"))
    .map((c) => ({ id: String(c.id), origen: c.origen, folio: String(c.folio ?? "") }));
}

/** Celda «Cotización» de la tabla. */
export function OrdenOficinaCell({ orden }: { orden: OrdenOficina }) {
  const cotizaciones = cotizacionesDe(orden);
  return (
    <div className="flex min-w-32 max-w-52 items-center">
      {cotizaciones.length > 0 ? <CotizacionVinculadaTrigger cotizaciones={cotizaciones} /> : <SinCotizacionBadge />}
    </div>
  );
}

/** Bloque «Cotización» de la tarjeta móvil: lista completa de cotizaciones vinculadas. */
export function OrdenOficinaBlock({ orden, className = "" }: { orden: OrdenOficina; className?: string }) {
  const cotizaciones = cotizacionesDe(orden);
  return (
    <section
      aria-label="Cotizaciones vinculadas"
      className={`rounded-xl border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#0f172a]/40 ${className}`}
    >
      <header className="border-b border-[#F0F0F2] px-3 py-2 dark:border-[#1F2A3C]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8E8B82] dark:text-[#8ea0b8]">
          {cotizaciones.length > 1 ? `Cotizaciones (${cotizaciones.length})` : "Cotización"}
        </span>
      </header>
      {cotizaciones.length > 0 ? (
        <ul className="p-1" aria-label="Cotizaciones vinculadas">
          {cotizaciones.map((c, i) => (
            <li key={c.id || i}>
              <CotizacionVinculadaRow c={c} dense />
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] text-[#A1A1AA] dark:text-[#64748B]">
          Sin cotización vinculada
        </p>
      )}
    </section>
  );
}
