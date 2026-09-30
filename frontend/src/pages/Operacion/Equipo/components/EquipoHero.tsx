/**
 * Encabezado del tablero Equipo: una sola superficie clara con título,
 * selector de semana (anterior · semana · siguiente · «Hoy»).
 * Se muestra igual en todos los tamaños (en celular se apila).
 */
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { rangoSemana, semanaIso } from "../shared/equipoSemana";

const navBtn = `cot-press inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] sm:size-9 dark:text-[#B7C1D1] dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`;

/** «Semana actual», «Semana pasada», «En 3 semanas»… (solo en el `title`). */
function semanaRelativa(offset: number): string {
  if (offset === 0) return "Semana actual";
  if (offset === -1) return "Semana pasada";
  if (offset === 1) return "Próxima semana";
  return offset < 0 ? `Hace ${-offset} semanas` : `En ${offset} semanas`;
}

/**
 * ‹  28 sep – 4 oct 2026  ›   Hoy
 * «Hoy» siempre ocupa su lugar (sin saltos); en la semana actual queda inactivo.
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
    <div className="flex w-full items-center gap-1 sm:w-auto" role="group" aria-label="Semana del tablero">
      <button type="button" className={navBtn} onClick={() => onShiftWeek(-1)} aria-label="Semana anterior" title="Semana anterior">
        <ChevronLeft className="size-[18px]" aria-hidden />
      </button>
      <p
        className="min-w-[11.5rem] flex-1 text-center text-[14.5px] font-semibold tabular-nums tracking-[-0.2px] text-[#09090B] sm:flex-none dark:text-[#F8FAFC]"
        aria-live="polite"
        title={`Semana ${semanaIso(lunes)} · ${semanaRelativa(offset)}`}
      >
        <span key={lunes} className="eq-week-label inline-block">
          {rangoSemana(lunes)}
        </span>
      </p>
      <button type="button" className={navBtn} onClick={() => onShiftWeek(1)} aria-label="Semana siguiente" title="Semana siguiente">
        <ChevronRight className="size-[18px]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToday}
        disabled={actual}
        title={actual ? "Ya estás en la semana actual" : "Ir a la semana actual"}
        className={`cot-press ml-1 inline-flex h-11 shrink-0 items-center rounded-[10px] border px-3.5 text-[13px] font-semibold sm:h-9 ${
          actual
            ? "cursor-default border-transparent text-[#A1A1AA] dark:text-[#64748B]"
            : "border-[#E4E4E7] bg-white text-[#1244D1] hover:border-[#BFD3FF] hover:bg-[#F5F8FF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#9BB6FF] dark:hover:border-[#2C3F7A]"
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
    <header className="eq-hero relative overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white dark:border-[#243044] dark:bg-[#111827]">
      {/* Tinte superior muy tenue (un gradiente estático; sin blur ni animación). */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(40rem_10rem_at_0%_0%,rgba(27,92,255,0.07),transparent_70%)] dark:bg-[radial-gradient(40rem_10rem_at_0%_0%,rgba(75,124,255,0.12),transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 px-4 pb-5 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className="cot-tick hidden size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#17235B] text-white shadow-[0_6px_16px_-8px_rgba(23,35,91,0.7)] sm:inline-flex dark:bg-[#2A3D8F]"
            aria-hidden
          >
            <CalendarRange className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
              Operación · Semana {semanaIso(lunes)}
              {offset === 0 ? <span className="text-[#1B5CFF] dark:text-[#9BB6FF]"> · actual</span> : null}
            </p>
            <h1 className="mt-0.5 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-[#09090B] sm:text-[30px] dark:text-[#F8FAFC]">Equipo</h1>
            <p className="mt-1 max-w-[64ch] text-[13.5px] leading-[20px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Órdenes y proyectos de la semana por técnico
              {tecnicosConTrabajo > 0 ? (
                <>
                  {" · "}
                  <span className="font-medium text-[#3F3F46] dark:text-[#D6DEEA]">
                    {tecnicosConTrabajo} {tecnicosConTrabajo === 1 ? "técnico con carga" : "técnicos con carga"}
                  </span>
                </>
              ) : null}
              <span className="hidden lg:inline">. Arrastra una tarjeta a otro técnico o día para moverla.</span>
            </p>
          </div>
        </div>
        <WeekSwitcher lunes={lunes} offset={offset} onShiftWeek={onShiftWeek} onToday={onToday} />
      </div>
    </header>
  );
}
