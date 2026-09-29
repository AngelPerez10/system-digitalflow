/**
 * Banda de cabecera del tablero Equipo: mismo lenguaje que `ProyectosHero`
 * (navy con destello, oculta en celular; ahí título y semana van en la
 * página). A la derecha, el selector de semana con el mismo estilo que el
 * selector de mes de Órdenes y Proyectos.
 */
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { rangoSemana, semanaIso } from "../shared/equipoSemana";

const weekBtn = `cot-press inline-flex size-9 items-center justify-center rounded-[9px] text-white/70 hover:bg-white/10 hover:text-white ${focusRing}`;

/** Anterior · «Semana 40 · 28 sep – 4 oct 2026» · siguiente (+ «Esta semana» si no es la actual). */
export function WeekSwitcher({
  lunes,
  esSemanaActual,
  onShiftWeek,
  onToday,
  tone = "navy",
}: {
  lunes: string;
  esSemanaActual: boolean;
  onShiftWeek: (delta: number) => void;
  onToday: () => void;
  tone?: "navy" | "light";
}) {
  const light = tone === "light";
  const btnClass = light
    ? `cot-press inline-flex size-11 items-center justify-center rounded-[10px] text-[#52525B] hover:bg-white hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] ${focusRing}`
    : weekBtn;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex flex-1 items-center justify-between gap-1 rounded-[12px] p-1 ${
          light ? "border border-[#E4E4E7] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]" : "bg-white/[0.08]"
        }`}
        role="group"
        aria-label="Semana del tablero"
      >
        <button type="button" className={btnClass} onClick={() => onShiftWeek(-1)} aria-label="Semana anterior">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span key={lunes} className="cot-fade min-w-[12.5rem] flex-1 text-center leading-tight" aria-live="polite">
          <span className={`block text-[10.5px] font-semibold uppercase tracking-[0.1em] ${light ? "text-[#71717A] dark:text-[#8EA0B8]" : "text-white/55"}`}>
            Semana {semanaIso(lunes)}
            {esSemanaActual ? " · actual" : ""}
          </span>
          <span className={`block text-[14px] font-medium tabular-nums ${light ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-white/90"}`}>{rangoSemana(lunes)}</span>
        </span>
        <button type="button" className={btnClass} onClick={() => onShiftWeek(1)} aria-label="Semana siguiente">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      {!esSemanaActual ? (
        <button
          type="button"
          onClick={onToday}
          className={`cot-pop h-11 rounded-[12px] px-3.5 text-[13px] font-semibold ${
            light
              ? "border border-[#E4E4E7] bg-white text-[#3F3F46] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA]"
              : "cot-press bg-white/[0.08] text-white/90 hover:bg-white/15"
          } ${focusRing}`}
        >
          Esta semana
        </button>
      ) : null}
    </div>
  );
}

export function EquipoHero({
  lunes,
  esSemanaActual,
  onShiftWeek,
  onToday,
  tecnicosConTrabajo,
}: {
  lunes: string;
  esSemanaActual: boolean;
  onShiftWeek: (delta: number) => void;
  onToday: () => void;
  tecnicosConTrabajo: number;
}) {
  return (
    <header className="cot-sheen relative hidden overflow-hidden rounded-[24px] bg-[#17235B] text-white dark:bg-[#1B2A63] sm:block">
      {/* Destello ámbar como degradado radial (mismo aspecto, sin el costo de `blur`). */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(24rem_22rem_at_96%_-12%,rgba(230,162,60,0.2),transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 px-8 py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]"
            aria-hidden
          >
            <Users className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Operación</p>
            <h1 className="mt-1 text-[32px] font-bold leading-[1.15] tracking-[-1.1px]">Equipo</h1>
            <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
              Órdenes de trabajo y proyectos de la semana por técnico
              {tecnicosConTrabajo > 0
                ? ` · ${tecnicosConTrabajo} ${tecnicosConTrabajo === 1 ? "técnico con carga" : "técnicos con carga"}`
                : ""}
              . Arrastra una tarjeta a otro técnico o a otro día para moverla.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <WeekSwitcher lunes={lunes} esSemanaActual={esSemanaActual} onShiftWeek={onShiftWeek} onToday={onToday} />
        </div>
      </div>
    </header>
  );
}
