import { memo, type CSSProperties } from "react";
import { Check, PackageCheck, RefreshCcw, Replace, Wrench, X } from "lucide-react";
import { displayCotizacionFolio, estadoInstalacionLabel } from "../../shared/proyectoFormUtils";
import { ProgressBar, SectionCard } from "../../shared/ProyectoUi";
import { btn, btnSm, emptyPanel, focusRing } from "../../shared/proyectoTokens";
import type {
  EquipoEstadoInstalacion,
  ProyectoCotizacionBloque,
  ProyectoEquipoLinea,
} from "../../shared/proyectoTypes";
import { ProyectoProductoThumb } from "./ProyectoProductoThumb";

type Props = {
  presupuestoCargado: boolean;
  isAdmin: boolean;
  cotizaciones: ProyectoCotizacionBloque[];
  equipos: ProyectoEquipoLinea[];
  equiposPorCotizacion: Map<string, ProyectoEquipoLinea[]>;
  onUpdateEquipo: (lineaId: string, patch: Partial<ProyectoEquipoLinea>) => void;
  onCambiarModelo: (lineaId: string) => void;
  onRestaurarModelo: (eq: ProyectoEquipoLinea) => void;
};

const RAIL: Record<EquipoEstadoInstalacion, string> = {
  instalado: "bg-[#0E8A5F] dark:bg-[#34D399]",
  no_instalado: "bg-[#C22B2B] dark:bg-[#F87171]",
  entregado: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
  pendiente: "bg-[#D4D4D8] dark:bg-[#3A4661]",
};

const ESTADO_PILL: Record<EquipoEstadoInstalacion, string> = {
  instalado: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]",
  no_instalado: "bg-[#FEF2F2] text-[#B42323] dark:bg-[#3F1518] dark:text-[#F87171]",
  entregado: "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]",
  pendiente: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]",
};

function fuenteLabel(fuente?: ProyectoEquipoLinea["fuenteProducto"]): string {
  if (fuente === "tvc") return "TVC";
  if (fuente === "manual") return "Manual";
  return "Syscom";
}

function progress(eqs: ProyectoEquipoLinea[]) {
  const total = eqs.length;
  const entregados = eqs.filter((e) => e.equipoEntregado).length;
  const instalados = eqs.filter((e) => e.estadoInstalacion === "instalado").length;
  return {
    total,
    entregados,
    instalados,
    entregaPct: total ? (entregados / total) * 100 : 0,
    installPct: total ? (instalados / total) * 100 : 0,
  };
}

type RowProps = {
  eq: ProyectoEquipoLinea;
  index: number;
  isAdmin: boolean;
  enabled: boolean;
  onUpdateEquipo: Props["onUpdateEquipo"];
  onCambiarModelo: Props["onCambiarModelo"];
  onRestaurarModelo: Props["onRestaurarModelo"];
};

const EquipoRow = memo(function EquipoRow({
  eq,
  index,
  isAdmin,
  enabled,
  onUpdateEquipo,
  onCambiarModelo,
  onRestaurarModelo,
}: RowProps) {
  const modificado = eq.modelo !== eq.modeloOriginal;
  const title = eq.modelo || eq.modeloOriginal || "Equipo";
  const titleId = `proyecto-eq-title-${eq.lineaId}`;
  const installId = `proyecto-eq-install-${eq.lineaId}`;
  const cantidad = Math.max(1, Math.floor(Number(eq.cantidad) || 1));
  const canToggleEntrega = enabled && isAdmin;

  return (
    <li className="cot-rise relative" style={{ "--cot-i": Math.min(index, 8) } as CSSProperties}>
      <article aria-labelledby={titleId} className="flex">
        <span
          className={`w-0.75 shrink-0 self-stretch transition-colors duration-300 ${RAIL[eq.estadoInstalacion]}`}
          aria-hidden
        />
        <div className="grid min-w-0 flex-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <ProyectoProductoThumb src={eq.imagenUrl} alt={title} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  key={eq.estadoInstalacion}
                  className={`cot-pop inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${ESTADO_PILL[eq.estadoInstalacion]}`}
                >
                  {estadoInstalacionLabel(eq.estadoInstalacion)}
                </span>
                {modificado ? (
                  <span className="inline-flex h-5 items-center rounded-full bg-[#FFF8EB] px-2 text-[11px] font-semibold text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#E6A23C]">
                    Modelo ajustado
                  </span>
                ) : null}
                <span className="text-[12px] font-medium tabular-nums text-[#71717A] dark:text-[#8EA0B8]">× {cantidad}</span>
              </div>
              <h4 id={titleId} className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-[#09090B] dark:text-[#F8FAFC]">
                {title}
              </h4>
              <p className="mt-0.5 truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                {modificado ? (
                  <>
                    Original: <span className="font-medium">{eq.modeloOriginal}</span>
                  </>
                ) : (
                  "Del presupuesto"
                )}
                {eq.marca ? ` · ${eq.marca}` : null}
                {eq.productoId ? ` · ${fuenteLabel(eq.fuenteProducto)} ${eq.productoId}` : null}
              </p>
              {isAdmin ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={!enabled}
                    className={`${btn.ghost} ${btnSm} -ml-2`}
                    onClick={() => onCambiarModelo(eq.lineaId)}
                    aria-label={`Cambiar modelo de ${title}`}
                  >
                    <Replace aria-hidden />
                    Cambiar modelo
                  </button>
                  {modificado ? (
                    <button
                      type="button"
                      disabled={!enabled}
                      className={`${btn.ghost} ${btnSm} text-[#52525B]! dark:text-[#B7C1D1]!`}
                      onClick={() => onRestaurarModelo(eq)}
                      aria-label={`Restaurar modelo original ${eq.modeloOriginal}`}
                    >
                      <RefreshCcw aria-hidden />
                      Restaurar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-nowrap sm:items-center sm:justify-end">
            <label
              className={`group relative inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border px-3 text-[13px] sm:min-h-10 sm:justify-start font-semibold transition-colors duration-200 ${
                eq.equipoEntregado
                  ? "border-[#BFE6D4] bg-[#E9F8F0] text-[#04724D] dark:border-[#1E5A42] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                  : "border-[#E4E4E7] bg-white text-[#3F3F46] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA]"
              } ${canToggleEntrega ? "cursor-pointer hover:border-[#D3D3D8]" : "cursor-not-allowed"} has-focus-visible:ring-4 has-focus-visible:ring-[rgba(27,92,255,0.18)]`}
              title={!isAdmin ? "Solo un administrador confirma la entrega" : undefined}
            >
              <input
                type="checkbox"
                className="peer sr-only"
                checked={eq.equipoEntregado}
                disabled={!canToggleEntrega}
                onChange={(e) => onUpdateEquipo(eq.lineaId, { equipoEntregado: e.target.checked })}
                aria-label={`Entregado: ${title}${!isAdmin ? " (solo administrador)" : ""}`}
              />
              <span
                className={`inline-flex size-4 items-center justify-center rounded-[5px] border transition-colors duration-200 ${
                  eq.equipoEntregado
                    ? "border-[#0E8A5F] bg-[#0E8A5F] text-white dark:border-[#22A06B] dark:bg-[#22A06B]"
                    : "border-[#D3D3D8] bg-white dark:border-[#3A4661] dark:bg-[#0F172A]"
                }`}
                aria-hidden
              >
                {eq.equipoEntregado ? <Check className="cot-tick size-3" strokeWidth={3} /> : null}
              </span>
              {eq.equipoEntregado ? "Entregado" : "Entrega pendiente"}
            </label>

            <div
              role="radiogroup"
              aria-labelledby={installId}
              className="flex rounded-[10px] border border-[#E4E4E7] bg-[#F4F4F5]/70 p-0.5 sm:inline-flex dark:border-[#273244] dark:bg-[#0F172A]"
            >
              <span id={installId} className="sr-only">
                Instalación de {title}
              </span>
              {(
                [
                  { value: "instalado", label: "Instalado", icon: <Wrench className="size-3.5" aria-hidden /> },
                  { value: "no_instalado", label: "No instalado", icon: <X className="size-3.5" aria-hidden /> },
                ] as const
              ).map((opt) => {
                const pressed = eq.estadoInstalacion === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={pressed}
                    disabled={!enabled || !eq.equipoEntregado}
                    title={!eq.equipoEntregado ? "Primero se confirma la entrega" : undefined}
                    onClick={() => onUpdateEquipo(eq.lineaId, { estadoInstalacion: opt.value })}
                    className={`cot-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-[12.5px] sm:min-h-9 sm:flex-none font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${focusRing} ${
                      !pressed
                        ? "text-[#52525B] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-white"
                        : opt.value === "instalado"
                          ? "bg-white text-[#04724D] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                          : "bg-white text-[#B42323] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#3F1518] dark:text-[#F87171]"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </article>
    </li>
  );
});

/**
 * Seguimiento de entrega e instalación, agrupado por cotización.
 * Entrega: solo administradores. Instalación: cualquiera, una vez entregado.
 */
export function ProyectoEquiposSection({
  presupuestoCargado,
  isAdmin,
  cotizaciones,
  equipos,
  equiposPorCotizacion,
  onUpdateEquipo,
  onCambiarModelo,
  onRestaurarModelo,
}: Props) {
  const totales = progress(equipos);
  const grupos = cotizaciones.filter((b) => (equiposPorCotizacion.get(b.vinculoId) ?? []).length > 0);
  let rowIndex = 0;

  return (
    <SectionCard
      id="proyecto-sec-equipos"
      index={0}
      title="Entrega e instalación"
      icon={<PackageCheck />}
      hint={isAdmin ? "Confirma la entrega; el técnico marca la instalación." : "La oficina confirma la entrega; tú marcas si quedó instalado."}
      flush
    >
      {!presupuestoCargado ? (
        <div className="p-4 sm:p-5">
          <p className={`${emptyPanel} py-8! text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]`} role="status">
            Disponible al vincular cotizaciones en el paso General.
          </p>
        </div>
      ) : equipos.length === 0 ? (
        <div className="p-4 sm:p-5">
          <p className={`${emptyPanel} py-8! text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]`} role="status">
            El presupuesto no incluye partidas marcadas como equipo.
          </p>
        </div>
      ) : (
        <>
          <div
            className="grid gap-4 border-b border-[#F0F0F2] bg-[#FAFAFA] px-4 py-4 dark:border-[#1F2A3C] dark:bg-[#0F172A]/50 sm:grid-cols-2 sm:px-5"
            role="group"
            aria-label="Resumen de equipos"
          >
            {(
              [
                { label: "Entregados", done: totales.entregados, pct: totales.entregaPct, bar: "bg-[#1B5CFF] dark:bg-[#4B7CFF]" },
                { label: "Instalados", done: totales.instalados, pct: totales.installPct, bar: "bg-[#0E8A5F] dark:bg-[#34D399]" },
              ] as const
            ).map((k) => (
              <div key={k.label}>
                <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                  <span className="text-[#52525B] dark:text-[#B7C1D1]">{k.label}</span>
                  <span key={k.done} className="cot-flash font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                    {k.done}
                    <span className="font-normal text-[#71717A] dark:text-[#8EA0B8]"> / {totales.total}</span>
                  </span>
                </div>
                <ProgressBar value={k.pct} barClass={k.bar} label={`${k.label}: ${k.done} de ${totales.total}`} />
              </div>
            ))}
          </div>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">Seguimiento de equipos por cotización</legend>
            {grupos.map((bloque) => {
              const eqs = equiposPorCotizacion.get(bloque.vinculoId) ?? [];
              const p = progress(eqs);
              const headingId = `proyecto-eq-cot-${bloque.vinculoId}`;
              return (
                <section key={bloque.vinculoId} aria-labelledby={headingId} className="border-b border-[#F0F0F2] last:border-b-0 dark:border-[#1F2A3C]">
                  {grupos.length > 1 ? (
                    <header className="flex items-center justify-between gap-3 bg-white px-4 pb-1 pt-3.5 dark:bg-[#111827] sm:px-5">
                      <h4 id={headingId} className="text-[12px] font-semibold uppercase tracking-widest text-[#52525B] dark:text-[#B7C1D1]">
                        Cotización {bloque.orden} ·{" "}
                        <span className="font-mono normal-case tracking-normal">
                          {displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen)}
                        </span>
                      </h4>
                      <span className="text-[12px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">
                        {p.instalados}/{p.total} instalados
                      </span>
                    </header>
                  ) : (
                    <h4 id={headingId} className="sr-only">
                      Cotización {bloque.orden}
                    </h4>
                  )}
                  <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
                    {eqs.map((eq) => (
                      <EquipoRow
                        key={eq.lineaId}
                        eq={eq}
                        index={rowIndex++}
                        isAdmin={isAdmin}
                        enabled={presupuestoCargado}
                        onUpdateEquipo={onUpdateEquipo}
                        onCambiarModelo={onCambiarModelo}
                        onRestaurarModelo={onRestaurarModelo}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </fieldset>
        </>
      )}
    </SectionCard>
  );
}
