/**
 * Encabezado del tablero Equipo: banda marina igual a la de las demás vistas
 * (Proyectos, Órdenes…) con título, descripción y selector de semana
 * (anterior · semana · siguiente · «Hoy»). En celular se apila.
 */
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { rangoSemana, semanaIso } from "../shared/equipoSemana";

const navBtn = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] text-white/70 hover:bg-white/10 hover:text-white ${focusRing}`;

/** «Semana actual», «Semana pasada», «En 3 semanas»… (solo en el `title`). */
function semanaRelativa(offset: number): string {
  if (offset === 0) return "Semana actual";
  if (offset === -1) return "Semana pasada";
  if (offset === 1) return "Próxima semana";
  return offset < 0 ? `Hace ${-offset} semanas` : `En ${offset} semanas`;
}

/**
 * ‹  28 sep – 4 oct 2026  ›   Hoy
 * Mismo control que el selector de mes de Proyectos (cápsula translúcida sobre
 * la banda marina). «Hoy» siempre ocupa su lugar (sin saltos); en la semana
 * actual queda inactivo.
 */
export function WeekSwitcher({
  lunes,
  offset,
  onShiftWeek,
  onToday,
}: {
  lunes: string;
  /** Semanas desde la actual (0 = esta semana). */
  offset: number;
  onShiftWeek: (delta: number) => void;
  onToday: () => void;
}) {
  const actual = offset === 0;
  return (
    <div className="flex w-full items-center justify-between gap-1 rounded-[12px] bg-white/[0.08] p-1 sm:w-auto" role="group" aria-label="Semana del tablero">
      <button type="button" className={navBtn} onClick={() => onShiftWeek(-1)} aria-label="Semana anterior" title="Semana anterior">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <p
        className="min-w-[11.5rem] flex-1 text-center text-[14px] font-medium tabular-nums text-white/90 sm:flex-none"
        aria-live="polite"
        title={`Semana ${semanaIso(lunes)} · ${semanaRelativa(offset)}`}
      >
        <span key={lunes} className="eq-week-label inline-block">
          {rangoSemana(lunes)}
        </span>
      </p>
      <button type="button" className={navBtn} onClick={() => onShiftWeek(1)} aria-label="Semana siguiente" title="Semana siguiente">
        <ChevronRight className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToday}
        disabled={actual}
        title={actual ? "Ya estás en la semana actual" : "Ir a la semana actual"}
        className={`cot-press ml-0.5 inline-flex h-9 shrink-0 items-center rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors ${
          actual ? "cursor-default text-white/35" : "bg-white/15 text-white hover:bg-white/25"
        } ${focusRing}`}
      >
        Hoy
      </button>
    </div>
  );
}

export function EquipoHero({
  lunes,
  offset,
  onShiftWeek,
  onToday,
  tecnicosConTrabajo,
}: {
  lunes: string;
  /** Semanas desde la actual (0 = esta semana). */
  offset: number;
  onShiftWeek: (delta: number) => void;
  onToday: () => void;
  tecnicosConTrabajo: number;
}) {
  return (
    <header className="cot-sheen relative overflow-hidden rounded-[24px] bg-[#17235B] text-white dark:bg-[#1B2A63]">
      <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]" aria-hidden>
            <CalendarRange className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Operación · Semana {semanaIso(lunes)}
              {offset === 0 ? <span className="text-[#E6A23C]"> · actual</span> : null}
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-[1.15] tracking-[-1.1px] sm:text-[32px]">Equipo</h1>
            <p className="mt-1.5 max-w-[60ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
              Órdenes y proyectos de la semana por técnico
              {tecnicosConTrabajo > 0 ? (
                <>
                  {" · "}
                  <span className="font-medium text-white/90">
                    {tecnicosConTrabajo} {tecnicosConTrabajo === 1 ? "técnico con carga" : "técnicos con carga"}
                  </span>
                </>
              ) : null}
              <span className="hidden lg:inline">. Arrastra una tarjeta a otro técnico o día para moverla.</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <WeekSwitcher lunes={lunes} offset={offset} onShiftWeek={onShiftWeek} onToday={onToday} />
        </div>
      </div>
    </header>
  );
}
