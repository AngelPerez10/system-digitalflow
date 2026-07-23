import type { ReactNode } from "react";
import { erpSecondaryBtnClass } from "@/layout/erpPageStyles";
import { ProyectoFormSection } from "./ProyectoFormSection";
import { estadoBadgeClass, estadoInstalacionLabel } from "./proyectoFormUtils";
import {
  proyectoEmptyPanelClass,
  proyectoEquipoAccentClass,
  proyectoEquipoCardClass,
  proyectoEquipoDeliveredClass,
  proyectoEquipoGroupClass,
  proyectoEquipoInstallBtnClass,
  proyectoEquipoMetaClass,
  proyectoEquipoProgressBarClass,
  proyectoEquipoSummaryChipClass,
} from "./proyectoPageStyles";
import { ProyectoProductoThumb } from "./ProyectoProductoThumb";
import type {
  EquipoEstadoInstalacion,
  ProyectoCotizacionBloque,
  ProyectoEquipoLinea,
} from "./proyectoTypes";

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
 * Seguimiento visual de entrega/instalación por cotización (presupuesto).
 * Radiogroup de instalación + toggle de entrega; jerarquía de campo Intrax.
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
              <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7ded0]/80 px-3.5 py-3 dark:border-[#334155]/80 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c]">
                    Estación de equipo
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#ff801f]/15 px-2 text-[11px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]"
                      aria-hidden
                    >
                      {bloque.orden}
                    </span>
                    <h5
                      id={headingId}
                      className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]"
                    >
                      Cotización {bloque.orden} · #{bloque.cotizacion.folio}
                    </h5>
                  </div>
                </div>

                <div
                  className="flex min-w-[11rem] flex-1 flex-col gap-1.5 sm:max-w-[14rem] sm:flex-none"
                  aria-label={`Avance cotización ${bloque.orden}: ${prog.entregados} entregados, ${prog.instalados} instalados de ${prog.total}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
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
                      className="block h-full rounded-full bg-[#ff801f] transition-[width] duration-300 ease-out"
                      style={{ width: `${entregaPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
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

              <ul className="divide-y divide-[#efe9de] dark:divide-[#1e293b]">
                {eqs.map((eq) => {
                  const modificado = eq.modelo !== eq.modeloOriginal;
                  const titleId = `proyecto-eq-title-${eq.lineaId}`;
                  const installGroupId = `proyecto-eq-install-${eq.lineaId}`;

                  return (
                    <li key={eq.lineaId}>
                      <article
                        className={proyectoEquipoCardClass}
                        aria-labelledby={titleId}
                      >
                        <div
                          className={proyectoEquipoAccentClass(eq.estadoInstalacion)}
                          aria-hidden
                        />

                        <div className="min-w-0 flex-1 space-y-3 p-3.5 sm:p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <ProyectoProductoThumb
                                src={eq.imagenUrl}
                                alt={eq.modelo}
                                size="lg"
                                className="border-[#e7ded0] bg-[#fcfaf6] shadow-sm dark:border-[#334155] dark:bg-[#0f172a]"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={estadoBadgeClass(eq.estadoInstalacion)}>
                                    {estadoInstalacionLabel(eq.estadoInstalacion)}
                                  </span>
                                  {modificado ? (
                                    <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
                                      Modelo ajustado
                                    </span>
                                  ) : null}
                                </div>
                                <h6
                                  id={titleId}
                                  className="mt-1.5 text-sm font-semibold leading-snug text-[#1c1917] dark:text-[#f8fafc]"
                                >
                                  {eq.modelo}
                                </h6>
                                <p className={proyectoEquipoMetaClass}>
                                  {modificado ? (
                                    <>
                                      Original: <span className="font-medium">{eq.modeloOriginal}</span>
                                    </>
                                  ) : (
                                    "Del presupuesto"
                                  )}
                                  {eq.productoId ? (
                                    <>
                                      {" · "}
                                      {fuenteLabel(eq.fuenteProducto)} ID {eq.productoId}
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            <label className={proyectoEquipoDeliveredClass(eq.equipoEntregado)}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-[#d6d3d1] text-[#ff801f] focus:ring-[#ff801f]/30"
                                checked={eq.equipoEntregado}
                                disabled={!presupuestoCargado}
                                onChange={(e) =>
                                  onUpdateEquipo(eq.lineaId, { equipoEntregado: e.target.checked })
                                }
                                aria-label={`Equipo entregado: ${eq.modelo}`}
                              />
                              <span className="leading-tight">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8]">
                                  Entrega
                                </span>
                                <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                                  {eq.equipoEntregado ? "Entregado" : "Pendiente"}
                                </span>
                              </span>
                            </label>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
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
                                  ] satisfies { value: EquipoEstadoInstalacion; label: string }[]
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
                                      className={proyectoEquipoInstallBtnClass(pressed, opt.value)}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              {isAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={!presupuestoCargado}
                                    className={`${erpSecondaryBtnClass} !px-3 !py-1.5 !text-xs`}
                                    onClick={() => onCambiarModelo(eq.lineaId)}
                                    aria-label={`Cambiar modelo de catálogo de ${eq.modelo}`}
                                  >
                                    Cambiar modelo
                                  </button>
                                  {modificado ? (
                                    <button
                                      type="button"
                                      disabled={!presupuestoCargado}
                                      className="rounded-lg border border-[#e2d9ca] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#57534e] transition hover:border-[#ff801f]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                                      onClick={() => onRestaurarModelo(eq)}
                                      aria-label={`Restaurar modelo original de ${eq.modeloOriginal}`}
                                    >
                                      Restaurar original
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <p className="max-w-[16rem] text-[11px] leading-snug text-[#78716c] dark:text-[#8ea0b8]">
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
