import InventarioThumb from "@/pages/Inventario/components/InventarioThumb";
import { erpSecondaryBtnClass } from "@/layout/erpPageStyles";
import type {
  OrdenEquipoEstadoInstalacion,
  OrdenEquipoInventarioLinea,
} from "../../shared/ordenesPageTypes";
import type { OrdenEquipoLineaPatch } from "../ordenEquiposDraft";

const listShellClass =
  "overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] dark:border-[#334155] dark:bg-[#0f172a]/35";

const accentClass = (estado: OrdenEquipoEstadoInstalacion) =>
  estado === "instalado"
    ? "w-1 shrink-0 self-stretch bg-sky-500"
    : "w-1 shrink-0 self-stretch bg-[#ff801f]/80";

const summaryChipClass = (tone: "neutral" | "entrega" | "instalacion") => {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums";
  switch (tone) {
    case "entrega":
      return `${base} border-[#ff801f]/30 bg-[#fff4eb] text-[#9a3412] dark:border-[#ff801f]/40 dark:bg-[#ff801f]/15 dark:text-[#fdba74]`;
    case "instalacion":
      return `${base} border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300`;
    default:
      return `${base} border-[#e2d9ca] bg-white text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]`;
  }
};

const deliveredClass = (delivered: boolean) =>
  [
    "flex h-[3.25rem] w-full min-w-[10.5rem] max-w-[12rem] items-center gap-2.5 rounded-xl border px-3 transition",
    "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-[#ff801f]/30",
    delivered
      ? "border-emerald-300/80 bg-emerald-50 dark:border-emerald-600/50 dark:bg-emerald-950/35"
      : "border-[#e2d9ca] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#111a2b]",
  ].join(" ");

const installBtnClass = (active: boolean, value: OrdenEquipoEstadoInstalacion) => {
  const base =
    "min-h-9 min-w-[5.75rem] flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 disabled:opacity-50 sm:flex-none";
  if (!active) {
    return `${base} text-[#57534e] hover:bg-white dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]/60`;
  }
  return value === "instalado"
    ? `${base} bg-sky-100 text-sky-900 shadow-sm dark:bg-sky-950/55 dark:text-sky-200`
    : `${base} bg-[#fff4eb] text-[#9a3412] shadow-sm dark:bg-[#ff801f]/20 dark:text-[#fdba74]`;
};

const estadoLabel = (estado: OrdenEquipoEstadoInstalacion) =>
  estado === "instalado" ? "Instalado" : "No instalado";

const estadoBadgeClass = (estado: OrdenEquipoEstadoInstalacion) =>
  estado === "instalado"
    ? "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300"
    : "inline-flex items-center rounded-full border border-[#ff801f]/25 bg-[#fff4eb] px-2 py-0.5 text-[10px] font-semibold text-[#9a3412] dark:border-[#ff801f]/35 dark:bg-[#ff801f]/15 dark:text-[#fdba74]";

type Props = {
  equipos: OrdenEquipoInventarioLinea[];
  isAdmin: boolean;
  canAdminMutate?: boolean;
  canMarkInstalacion: boolean;
  stockByItemId?: Record<number, number>;
  onUpdateEquipo: (lineaId: string, patch: OrdenEquipoLineaPatch, stockMax?: number) => void;
  onRemoveEquipo: (lineaId: string) => void;
};

function groupProgress(eqs: OrdenEquipoInventarioLinea[]) {
  const total = eqs.length;
  const entregados = eqs.filter((e) => e.equipoEntregado).length;
  const instalados = eqs.filter((e) => e.estadoInstalacion === "instalado").length;
  return { total, entregados, instalados };
}

function EntregaControl({
  title,
  delivered,
  interactive,
  onChange,
}: {
  title: string;
  delivered: boolean;
  interactive: boolean;
  onChange?: (next: boolean) => void;
}) {
  const body = (
    <>
      {interactive ? (
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-[#d6d3d1] text-[#ff801f] focus:ring-[#ff801f]/30"
          checked={delivered}
          onChange={(e) => onChange?.(e.target.checked)}
          aria-label={`Entrega de ${title}`}
        />
      ) : null}
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8]">
          Entrega
        </span>
        <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f8fafc]">
          {delivered ? "Entregado" : "Pendiente"}
        </span>
      </span>
    </>
  );

  if (interactive) {
    return <label className={`${deliveredClass(delivered)} cursor-pointer`}>{body}</label>;
  }

  return (
    <span
      className={deliveredClass(delivered)}
      aria-label={`Entrega: ${delivered ? "Entregado" : "Pendiente"}`}
    >
      {body}
    </span>
  );
}

/**
 * Lista de equipos de inventario en la orden (entrega + instalación).
 * Grid fijo: Entrega siempre en la misma columna.
 */
export function OrdenEquiposSection({
  equipos,
  isAdmin,
  canAdminMutate = isAdmin,
  canMarkInstalacion,
  stockByItemId,
  onUpdateEquipo,
  onRemoveEquipo,
}: Props) {
  const totales = groupProgress(equipos);

  return (
    <section className="space-y-3" aria-labelledby="orden-sec-equipos-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c]">
            Campo
          </p>
          <h4
            id="orden-sec-equipos-title"
            className="mt-0.5 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]"
          >
            Equipos de la orden
          </h4>
          <p className="mt-0.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
            Entrega e instalación de piezas tomadas del inventario.
          </p>
        </div>
        {equipos.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="status"
            aria-label={`Resumen: ${totales.entregados} de ${totales.total} entregados, ${totales.instalados} instalados`}
          >
            <span className={summaryChipClass("neutral")}>
              {totales.total} {totales.total === 1 ? "equipo" : "equipos"}
            </span>
            <span className={summaryChipClass("entrega")}>
              {totales.entregados}/{totales.total} entregados
            </span>
            <span className={summaryChipClass("instalacion")}>
              {totales.instalados}/{totales.total} instalados
            </span>
          </div>
        ) : null}
      </header>

      {equipos.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-[#e2d9ca] bg-[#fcfaf6] px-4 py-8 text-center dark:border-[#334155] dark:bg-[#0f172a]/40"
          role="status"
        >
          <p className="text-sm font-medium text-[#57534e] dark:text-[#cbd5e1]">
            {isAdmin ? "Sin equipos todavía" : "Sin equipos registrados"}
          </p>
          <p className="mt-1 text-xs text-[#78716c] dark:text-[#8ea0b8]">
            {isAdmin
              ? "Usa el buscador de arriba: primero almacén y, si no está, SYSCOM, TVC o manuales."
              : "Esta orden no tiene equipos de inventario."}
          </p>
        </div>
      ) : (
        <div className={listShellClass}>
          <ul className="divide-y divide-[#efe9de] dark:divide-[#1e293b]">
            {equipos.map((eq) => {
              const titleId = `orden-eq-title-${eq.lineaId}`;
              const installGroupId = `orden-eq-install-${eq.lineaId}`;
              const qtyId = `orden-eq-qty-${eq.lineaId}`;
              const stock = stockByItemId?.[eq.inventarioItemId];
              const title = eq.nombre || eq.modelo || eq.codigoBarras || "Equipo";

              return (
                <li key={eq.lineaId}>
                  <article
                    className="relative flex bg-[#fffdfa] dark:bg-transparent"
                    aria-labelledby={titleId}
                  >
                    <div className={accentClass(eq.estadoInstalacion)} aria-hidden />
                    <div className="min-w-0 flex-1 space-y-4 p-4">
                      {/* Producto + Entrega: columnas fijas (Entrega siempre a la derecha en sm+) */}
                      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_11rem]">
                        <InventarioThumb src={eq.imagenUrl} alt={title} size={56} />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={estadoBadgeClass(eq.estadoInstalacion)}>
                              {estadoLabel(eq.estadoInstalacion)}
                            </span>
                            {typeof stock === "number" ? (
                              <span className="inline-flex items-center rounded-full border border-[#e2d9ca] bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]">
                                Stock {stock}
                              </span>
                            ) : null}
                          </div>
                          <h5
                            id={titleId}
                            className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-[#1c1917] dark:text-[#f8fafc]"
                          >
                            {title}
                          </h5>
                          <p className="mt-1 truncate text-[11px] leading-snug text-[#78716c] dark:text-[#8ea0b8]">
                            {[eq.marca, eq.modelo, eq.codigoBarras].filter(Boolean).join(" · ")}
                          </p>
                        </div>

                        <div className="col-span-2 flex justify-start sm:col-span-1 sm:justify-end">
                          <EntregaControl
                            title={title}
                            delivered={eq.equipoEntregado}
                            interactive={canAdminMutate}
                            onChange={(next) =>
                              onUpdateEquipo(eq.lineaId, { equipoEntregado: next })
                            }
                          />
                        </div>
                      </div>

                      {/* Controles inferiores */}
                      <div className="grid gap-3 border-t border-[#efe9de]/90 pt-3 dark:border-[#1e293b]/90 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-start">
                        <div>
                          {canAdminMutate ? (
                            <>
                              <label
                                htmlFor={qtyId}
                                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]"
                              >
                                Cantidad
                              </label>
                              <input
                                id={qtyId}
                                type="number"
                                min={1}
                                max={typeof stock === "number" && stock > 0 ? stock : undefined}
                                step={1}
                                value={eq.cantidad}
                                disabled={eq.equipoEntregado}
                                title={
                                  eq.equipoEntregado
                                    ? "Desmarca Entregado para editar la cantidad"
                                    : undefined
                                }
                                aria-describedby={
                                  eq.equipoEntregado ? `${qtyId}-hint` : undefined
                                }
                                aria-invalid={
                                  typeof stock === "number" && stock > 0 && eq.cantidad > stock
                                }
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  if (!Number.isFinite(n)) return;
                                  onUpdateEquipo(
                                    eq.lineaId,
                                    { cantidad: n },
                                    typeof stock === "number" ? stock : undefined,
                                  );
                                }}
                                className="h-10 w-full max-w-[7.5rem] rounded-xl border border-[#e2d9ca] bg-white px-3 text-sm tabular-nums text-[#1c1917] outline-none focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 disabled:cursor-not-allowed disabled:bg-[#f5f0e8] disabled:opacity-70 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:disabled:bg-[#111a2b]"
                              />
                              {/* Hint en sr-only: no empuja Instalación hacia abajo al marcar Entregado */}
                              {eq.equipoEntregado ? (
                                <p id={`${qtyId}-hint`} className="sr-only">
                                  Desmarca Entregado para editar la cantidad.
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]">
                                Cantidad
                              </p>
                              <p className="text-sm font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                                {eq.cantidad}
                              </p>
                            </>
                          )}
                        </div>

                        <div>
                          <p
                            id={installGroupId}
                            className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]"
                          >
                            Instalación
                          </p>
                          <div
                            role="radiogroup"
                            aria-labelledby={installGroupId}
                            className="inline-flex max-w-full flex-wrap rounded-xl border border-[#e2d9ca] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0b1220]"
                          >
                            {(
                              [
                                { value: "instalado" as const, label: "Instalado" },
                                { value: "no_instalado" as const, label: "No instalado" },
                              ] satisfies { value: OrdenEquipoEstadoInstalacion; label: string }[]
                            ).map((opt) => {
                              const pressed = eq.estadoInstalacion === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={pressed}
                                  disabled={!canMarkInstalacion}
                                  onClick={() =>
                                    onUpdateEquipo(eq.lineaId, {
                                      estadoInstalacion: opt.value,
                                    })
                                  }
                                  className={installBtnClass(pressed, opt.value)}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {canAdminMutate ? (
                          <div className="flex sm:justify-end sm:pt-6">
                            <button
                              type="button"
                              className={`${erpSecondaryBtnClass} !px-3 !py-1.5 !text-xs`}
                              onClick={() => onRemoveEquipo(eq.lineaId)}
                              aria-label={`Quitar ${title} de la lista`}
                            >
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <span className="hidden sm:block" aria-hidden />
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
