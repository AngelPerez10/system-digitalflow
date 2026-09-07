import type { ReactNode } from "react";
import { erpSecondaryBtnClass } from "../../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { ProyectoFormSection } from "../ProyectoFormSection";
import { displayCotizacionFolio, estadoInstalacionLabel } from "../../shared/proyectoFormUtils";
import {
  proyectoEmptyPanelClass,
  proyectoEquipoAccentClass,
  proyectoEquipoGroupClass,
  proyectoEquipoMetaClass,
  proyectoEquipoProgressBarClass,
  proyectoEquipoSummaryChipClass,
} from "../../shared/proyectoPageStyles";
import { ProyectoProductoThumb } from "./ProyectoProductoThumb";
import type {
  EquipoEstadoInstalacion,
  ProyectoCotizacionBloque,
  ProyectoEquipoLinea,
} from "../../shared/proyectoTypes";

/** Misma pista visual que OrdenEquiposSection (entrega + instalación). */
const deliveredClass = (delivered: boolean) =>
  [
    "flex h-[3.25rem] w-full min-w-[10.5rem] max-w-[12rem] cursor-pointer items-center gap-2.5 rounded-xl border px-3 transition",
    "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-[#1B5CFF]/30",
    delivered
      ? "border-emerald-300/80 bg-emerald-50 dark:border-emerald-600/50 dark:bg-emerald-950/35"
      : "border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827]",
  ].join(" ");

const installBtnClass = (active: boolean, value: "instalado" | "no_instalado") => {
  const base =
    "min-h-9 min-w-[5.75rem] flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 disabled:opacity-50 sm:flex-none";
  if (!active) {
    return `${base} text-[#52525B] hover:bg-white dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]/60`;
  }
  return value === "instalado"
    ? `${base} bg-sky-100 text-sky-900 shadow-sm dark:bg-sky-950/55 dark:text-sky-200`
    : `${base} bg-rose-100 text-rose-900 shadow-sm dark:bg-rose-950/45 dark:text-rose-200`;
};

const estadoBadgeClass = (estado: EquipoEstadoInstalacion) => {
  if (estado === "instalado") {
    return "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300";
  }
  if (estado === "no_instalado") {
    return "inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (estado === "entregado") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  return "inline-flex items-center rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#cbd5e1]";
};

type Props = {
  icon: ReactNode;
  presupuestoCargado: boolean;
  isAdmin: boolean;
  cotizaciones: ProyectoCotizacionBloque[];
  equipos: ProyectoEquipoLinea[];
  equiposPorCotizacion: Map<string, ProyectoEquipoLinea[]>;
  onUpdateEquipo: (lineaId: string, patch: Partial<ProyectoEquipoLinea>) => void;
  onCambiarModelo: (lineaId: string) => void;
  onRestaurarModelo: (eq: ProyectoEquipoLinea) => void;
};

function fuenteLabel(fuente?: ProyectoEquipoLinea["fuenteProducto"]): string {
  if (fuente === "tvc") return "TVC";
  if (fuente === "manual") return "Manual";
  return "Syscom";
}

function groupProgress(eqs: ProyectoEquipoLinea[]) {
  const total = eqs.length;
  const entregados = eqs.filter((e) => e.equipoEntregado).length;
  const instalados = eqs.filter((e) => e.estadoInstalacion === "instalado").length;
  return { total, entregados, instalados };
}

/**
 * Seguimiento de entrega/instalación por cotización.
 * Layout de fila alineado a OrdenEquiposSection (thumb · datos · entrega / instalación · acciones).
 */
export function ProyectoEquiposSection({
  icon,
  presupuestoCargado,
  isAdmin,
  cotizaciones,
  equipos,
  equiposPorCotizacion,
  onUpdateEquipo,
  onCambiarModelo,
  onRestaurarModelo,
}: Props) {
  const totales = groupProgress(equipos);
  const groupsWithEquipos = cotizaciones.filter(
    (b) => (equiposPorCotizacion.get(b.vinculoId) ?? []).length > 0
  );

  return (
    <ProyectoFormSection
      titleId="proyecto-sec-equipos-presupuesto"
      title="Equipos del proyecto"
      hint="Seguimiento de entrega e instalación, agrupado por cotización."
      icon={icon}
      card={false}
      actions={
        !presupuestoCargado ? (
          <span className="text-xs text-gray-500 dark:text-gray-400" role="status">
            Disponible al cargar presupuesto
          </span>
        ) : equipos.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="status"
            aria-label={`Resumen: ${totales.entregados} de ${totales.total} entregados, ${totales.instalados} instalados`}
          >
            <span className={proyectoEquipoSummaryChipClass("neutral")}>
              {totales.total} {totales.total === 1 ? "equipo" : "equipos"}
            </span>
            <span className={proyectoEquipoSummaryChipClass("entrega")}>
              {totales.entregados}/{totales.total} entregados
            </span>
            <span className={proyectoEquipoSummaryChipClass("instalacion")}>
              {totales.instalados}/{totales.total} instalados
            </span>
          </div>
        ) : null
      }
    >
      <fieldset
        className="space-y-4 border-0 p-0"
        disabled={!presupuestoCargado}
        aria-disabled={!presupuestoCargado}
      >
        <legend className="sr-only">Seguimiento de equipos por cotización</legend>

        {equipos.length === 0 && presupuestoCargado ? (
          <div className={proyectoEmptyPanelClass} role="status">
            El presupuesto no incluye líneas marcadas como equipo.
          </div>
        ) : null}

        {groupsWithEquipos.map((bloque) => {
          const eqs = equiposPorCotizacion.get(bloque.vinculoId) ?? [];
          const prog = groupProgress(eqs);
          const entregaPct = prog.total ? Math.round((prog.entregados / prog.total) * 100) : 0;
          const installPct = prog.total ? Math.round((prog.instalados / prog.total) * 100) : 0;
          const headingId = `proyecto-eq-cot-${bloque.vinculoId}`;

          return (
            <section
              key={`eq-${bloque.vinculoId}`}
              className={proyectoEquipoGroupClass}
              aria-labelledby={headingId}
            >
              <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E7E7EA]/80 px-3.5 py-3 dark:border-[#273244]/80 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF]">
                    Estación de equipo
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#1B5CFF]/15 px-2 text-[11px] font-bold tabular-nums text-[#1244D1] dark:bg-[#1B5CFF]/20 dark:text-[#4B7CFF]"
                      aria-hidden
                    >
                      {bloque.orden}
                    </span>
                    <h5
                      id={headingId}
                      className="text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]"
                    >
                      Cotización {bloque.orden} ·{" "}
                      {displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen)}
                    </h5>
                  </div>
                </div>

                <div
                  className="flex min-w-[11rem] flex-1 flex-col gap-1.5 sm:max-w-[14rem] sm:flex-none"
                  aria-label={`Avance cotización ${bloque.orden}: ${prog.entregados} entregados, ${prog.instalados} instalados de ${prog.total}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium tabular-nums text-[#6E6E77] dark:text-[#8ea0b8]">
                    <span>Entrega</span>
                    <span>
                      {prog.entregados}/{prog.total}
                    </span>
                  </div>
                  <div
                    className={proyectoEquipoProgressBarClass}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={entregaPct}
                    aria-label={`Entrega ${entregaPct} por ciento`}
                  >
                    <span
                      className="block h-full rounded-full bg-[#1B5CFF] transition-[width] duration-300 ease-out"
                      style={{ width: `${entregaPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium tabular-nums text-[#6E6E77] dark:text-[#8ea0b8]">
                    <span>Instalación</span>
                    <span>
                      {prog.instalados}/{prog.total}
                    </span>
                  </div>
                  <div
                    className={proyectoEquipoProgressBarClass}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={installPct}
                    aria-label={`Instalación ${installPct} por ciento`}
                  >
                    <span
                      className="block h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out dark:bg-sky-400"
                      style={{ width: `${installPct}%` }}
                    />
                  </div>
                </div>
              </header>

              <ul className="divide-y divide-[#E4E4E7] dark:divide-[#1e293b]">
                {eqs.map((eq) => {
                  const modificado = eq.modelo !== eq.modeloOriginal;
                  const titleId = `proyecto-eq-title-${eq.lineaId}`;
                  const installGroupId = `proyecto-eq-install-${eq.lineaId}`;
                  const title = eq.modelo || eq.modeloOriginal || "Equipo";

                  return (
                    <li key={eq.lineaId}>
                      <article
                        className="relative flex bg-[#FFFFFF] dark:bg-transparent"
                        aria-labelledby={titleId}
                      >
                        <div
                          className={proyectoEquipoAccentClass(eq.estadoInstalacion)}
                          aria-hidden
                        />

                        <div className="min-w-0 flex-1 space-y-4 p-4">
                          {/* Producto + Entrega: mismas columnas fijas que Órdenes */}
                          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_11rem]">
                            <ProyectoProductoThumb
                              src={eq.imagenUrl}
                              alt={title}
                              size="lg"
                              className="border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]"
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={estadoBadgeClass(eq.estadoInstalacion)}>
                                  {estadoInstalacionLabel(eq.estadoInstalacion)}
                                </span>
                                {modificado ? (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
                                    Modelo ajustado
                                  </span>
                                ) : null}
                              </div>
                              <h6
                                id={titleId}
                                className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-[#09090B] dark:text-[#f8fafc]"
                              >
                                {title}
                              </h6>
                              <p className={`${proyectoEquipoMetaClass} truncate`}>
                                {modificado ? (
                                  <>
                                    Original: <span className="font-medium">{eq.modeloOriginal}</span>
                                  </>
                                ) : (
                                  "Del presupuesto"
                                )}
                                {eq.marca ? ` · ${eq.marca}` : null}
                                {eq.productoId ? (
                                  <>
                                    {" · "}
                                    {fuenteLabel(eq.fuenteProducto)} ID {eq.productoId}
                                  </>
                                ) : null}
                              </p>
                            </div>

                            <div className="col-span-2 flex justify-start sm:col-span-1 sm:justify-end">
                              <label
                                className={deliveredClass(eq.equipoEntregado)}
                                title={
                                  !presupuestoCargado
                                    ? "Disponible al cargar presupuesto"
                                    : undefined
                                }
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 shrink-0 rounded border-[#D3D3D8] text-[#1B5CFF] focus:ring-[#1B5CFF]/30"
                                  checked={eq.equipoEntregado}
                                  disabled={!presupuestoCargado}
                                  onChange={(e) =>
                                    onUpdateEquipo(eq.lineaId, {
                                      equipoEntregado: e.target.checked,
                                    })
                                  }
                                  aria-label={`Entrega de ${title}`}
                                />
                                <span className="min-w-0 leading-tight">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#8ea0b8]">
                                    Entrega
                                  </span>
                                  <span className="text-xs font-semibold text-[#09090B] dark:text-[#f8fafc]">
                                    {eq.equipoEntregado ? "Entregado" : "Pendiente"}
                                  </span>
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Cantidad (presupuesto) + Instalación + acciones admin */}
                          <div className="grid gap-3 border-t border-[#E4E4E7]/90 pt-3 dark:border-[#1e293b]/90 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-start">
                            <div>
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E77] dark:text-[#8ea0b8]">
                                Cantidad
                              </p>
                              <p className="text-sm font-semibold tabular-nums text-[#09090B] dark:text-[#f8fafc]">
                                {Math.max(1, Math.floor(Number(eq.cantidad) || 1))}
                              </p>
                            </div>

                            <div>
                              <p
                                id={installGroupId}
                                className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E77] dark:text-[#8ea0b8]"
                              >
                                Instalación
                              </p>
                              <div
                                role="radiogroup"
                                aria-labelledby={installGroupId}
                                className="inline-flex max-w-full flex-wrap rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#0b1220]"
                              >
                                {(
                                  [
                                    { value: "instalado" as const, label: "Instalado" },
                                    { value: "no_instalado" as const, label: "No instalado" },
                                  ] satisfies {
                                    value: "instalado" | "no_instalado";
                                    label: string;
                                  }[]
                                ).map((opt) => {
                                  const pressed = eq.estadoInstalacion === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      role="radio"
                                      aria-checked={pressed}
                                      disabled={!presupuestoCargado}
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

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:pt-6">
                              {isAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={!presupuestoCargado}
                                    className={`${erpSecondaryBtnClass} !px-3 !py-1.5 !text-xs`}
                                    onClick={() => onCambiarModelo(eq.lineaId)}
                                    aria-label={`Cambiar modelo de catálogo de ${title}`}
                                  >
                                    Cambiar modelo
                                  </button>
                                  {modificado ? (
                                    <button
                                      type="button"
                                      disabled={!presupuestoCargado}
                                      className="rounded-lg border border-[#E7E7EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#52525B] transition hover:border-[#1B5CFF]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/25 disabled:opacity-50 dark:border-[#273244] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                                      onClick={() => onRestaurarModelo(eq)}
                                      aria-label={`Restaurar modelo original de ${eq.modeloOriginal}`}
                                    >
                                      Restaurar original
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <p className="max-w-[16rem] text-[11px] leading-snug text-[#6E6E77] dark:text-[#8ea0b8]">
                                  Solo un administrador puede cambiar el modelo desde el catálogo
                                  (Syscom, TVC o Manual).
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </fieldset>
    </ProyectoFormSection>
  );
}
