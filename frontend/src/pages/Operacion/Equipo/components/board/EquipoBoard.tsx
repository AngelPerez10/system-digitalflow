/**
 * Tablero semanal (escritorio): una fila por técnico («Sin asignar» arriba)
 * y una columna por día, de lunes a domingo.
 *
 * - Cada celda técnico × día es zona de soltar: arrastra una tarjeta a otra
 *   celda para cambiarla de técnico, de día o ambos. Soltarla sobre el nombre
 *   del técnico cambia solo el técnico.
 * - Se muestra completo (todos los técnicos, sin scroll interno) y la fila de
 *   días queda fija bajo el encabezado de la app al desplazar la página. Por
 *   eso el tablero usa `overflow-clip` (no `hidden`, que anularía `sticky`).
 * - Hoy: columna teñida y marca azul en el encabezado. Días pasados con la
 *   fecha atenuada; fin de semana con un rayado muy tenue.
 *
 * Movimiento (ver `equipo.css`): filas con entrada escalonada, destino bajo
 * el puntero con una capa superpuesta y contorno de destino en todas las
 * celdas mientras se arrastra (un atributo en el tablero, sin re-render).
 */
import { memo, useMemo, useRef } from "react";
import { ArrowDownToLine, CalendarCheck } from "lucide-react";
import { useTecnicoDropTarget } from "../../hooks/useTecnicoDropTarget";
import { columnKey, dropOverId } from "../../shared/equipoDnd";
import type { EquipoSeccion } from "../../shared/equipoGrouping";
import { DIAS_CORTOS, diasDeSemana, parseYmd, tarjetasPorDia, type EquipoTarjeta } from "../../shared/equipoSemana";
import { EquipoJobCard } from "./EquipoJobCard";
import { EquipoTecnicoLabel } from "./EquipoTecnicoLabel";
import { cargaDe, conteoFila, type EquipoBoardProps, type EquipoBoardRowCommon } from "./equipoBoardShared";

const GRID = "grid grid-cols-[14rem_repeat(7,minmax(0,1fr))] xl:grid-cols-[15.5rem_repeat(7,minmax(0,1fr))]";

/** Fondo de la columna: hoy teñido, fin de semana con rayado tenue (barato: un gradiente). */
function dayTone(i: number, esHoy: boolean) {
  if (esHoy) return "bg-[#F5F8FF] dark:bg-[#1B2A63]/20";
  if (i >= 5)
    return "bg-[repeating-linear-gradient(135deg,transparent_0_7px,rgba(9,9,11,0.022)_7px_8px)] dark:bg-[repeating-linear-gradient(135deg,transparent_0_7px,rgba(255,255,255,0.025)_7px_8px)]";
  return "";
}

const divider = "border-[#EEEEF1] dark:border-[#1B2436]";

/* --------------------------------------------------------------------------
   Encabezado de un día
   -------------------------------------------------------------------------- */

function DayHeader({ ymd, index, hoy, count }: { ymd: string; index: number; hoy: string; count: number }) {
  const esHoy = ymd === hoy;
  const pasado = ymd < hoy;
  const d = parseYmd(ymd);
  return (
    <div
      role="columnheader"
      aria-current={esHoy ? "date" : undefined}
      className={`relative flex items-end justify-between gap-2 px-3 pb-2.5 pt-3 ${index > 0 ? `border-l ${divider}` : ""} ${esHoy ? "bg-[#F5F8FF] dark:bg-[#1B2A63]/25" : ""}`}
    >
      {esHoy ? <span className="eq-today-bar absolute inset-x-0 top-0 h-[3px] bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-hidden /> : null}
      <div className="min-w-0">
        <p
          className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${
            esHoy ? "text-[#1B5CFF] dark:text-[#9BB6FF]" : index >= 5 ? "text-[#A1A1AA] dark:text-[#64748B]" : "text-[#6E6E77] dark:text-[#8EA0B8]"
          }`}
        >
          {DIAS_CORTOS[index]}
          {esHoy ? <span className="ml-1 normal-case tracking-normal">· Hoy</span> : null}
        </p>
        <p
          className={`mt-0.5 text-[22px] font-semibold leading-none tracking-[-0.6px] tabular-nums ${
            esHoy ? "text-[#1B5CFF] dark:text-[#9BB6FF]" : pasado ? "text-[#A1A1AA] dark:text-[#4B5A75]" : "text-[#09090B] dark:text-[#F8FAFC]"
          }`}
        >
          {d?.getDate()}
        </p>
      </div>
      <span
        key={count}
        className={`cot-flash mb-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
          count === 0
            ? "text-[#C4C4CC] dark:text-[#3A4661]"
            : esHoy
              ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
              : "bg-[#F1F1F4] text-[#3F3F46] dark:bg-white/[0.07] dark:text-[#D6DEEA]"
        }`}
        title={`${count} ${count === 1 ? "trabajo" : "trabajos"}`}
      >
        {count}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Celda técnico × día (zona de soltar: cambia técnico y/o día)
   -------------------------------------------------------------------------- */

const DayCell = memo(function DayCell({
  tecnicoKey,
  fecha,
  index,
  tarjetas,
  compacta,
  semana,
  ...c
}: EquipoBoardRowCommon & { tecnicoKey: string; fecha: string; index: number; tarjetas: EquipoTarjeta[]; compacta: boolean; semana: string[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useTecnicoDropTarget(ref, tecnicoKey, c.onOverChange, fecha);
  const isOver = c.overKey === dropOverId(tecnicoKey, fecha);
  const d = parseYmd(fecha);

  return (
    <div
      ref={ref}
      role="cell"
      data-drop-cell
      aria-label={`${DIAS_CORTOS[index]} ${d?.getDate()}: ${tarjetas.length} trabajos`}
      className={`relative flex min-w-0 flex-col gap-1.5 p-1.5 ${index > 0 ? `border-l ${divider}` : ""} ${compacta ? "min-h-[3.75rem]" : "min-h-[6.5rem]"} ${dayTone(
        index,
        fecha === c.hoy
      )}`}
    >
      {tarjetas.map((t) => (
        <EquipoJobCard
          key={t.uid}
          tarjeta={t}
          variant="compact"
          semana={semana}
          dragging={c.draggingItemKey === t.key}
          justMoved={c.justMovedKey === t.key}
          destinos={c.destinos}
          handlers={c.handlers}
        />
      ))}
      {/* Destino bajo el puntero: anillo + etiqueta (capa superpuesta, sin reflow). */}
      {isOver ? (
        <span
          className="cot-fade pointer-events-none absolute inset-1 z-10 flex items-end justify-center rounded-[10px] bg-[#1B5CFF]/[0.07] pb-1.5 shadow-[inset_0_0_0_2px_#1B5CFF] dark:bg-[#4B7CFF]/12 dark:shadow-[inset_0_0_0_2px_#4B7CFF]"
          aria-hidden
        >
          <span className="cot-pop inline-flex items-center gap-1 rounded-full bg-[#1B5CFF] px-2 py-0.5 text-[10.5px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(27,92,255,0.9)] dark:bg-[#4B7CFF]">
            <ArrowDownToLine className="size-3" />
            {DIAS_CORTOS[index]} {d?.getDate()}
          </span>
        </span>
      ) : null}
    </div>
  );
});

/* --------------------------------------------------------------------------
   Fila de un técnico
   -------------------------------------------------------------------------- */

const BoardRow = memo(function BoardRow({ seccion, index, maxAbiertos, ...c }: EquipoBoardRowCommon & { seccion: EquipoSeccion; index: number; maxAbiertos: number }) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const key = columnKey(seccion.tecnico.id);
  // El nombre del técnico: soltar aquí cambia solo el técnico (el día se queda).
  useTecnicoDropTarget(headerRef, key, c.onOverChange);

  const dias = useMemo(() => tarjetasPorDia(seccion, c.lunes), [seccion, c.lunes]);
  const semana = useMemo(() => diasDeSemana(c.lunes), [c.lunes]);
  const { trabajos, abiertos } = conteoFila(dias);
  // ¿El puntero está en esta fila (nombre o cualquier celda) y viene de otro técnico?
  const enFila = c.overKey != null && (c.overKey === key || c.overKey.startsWith(`${key}|`));
  const reasigna = enFila && c.dragFromKey !== key;
  const sin = seccion.tecnico.id == null;

  return (
    <div
      role="row"
      aria-label={seccion.tecnico.nombre}
      className={`cot-rise relative ${GRID} border-t ${divider}`}
      style={{ ["--cot-i" as string]: Math.min(index, 8) }}
    >
      <div
        ref={headerRef}
        role="rowheader"
        className={`relative flex items-start border-r px-4 py-3 transition-[background-color,box-shadow] duration-150 ${divider} ${
          c.overKey === key
            ? "bg-[#EEF3FF] shadow-[inset_0_0_0_2px_#1B5CFF] dark:bg-[#1B2A63]/50 dark:shadow-[inset_0_0_0_2px_#4B7CFF]"
            : sin
              ? "bg-[#FFFAF1] dark:bg-[rgba(230,162,60,0.07)]"
              : "bg-white dark:bg-[#111827]"
        }`}
      >
        {sin ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#D08A1E] dark:bg-[#E6A23C]" aria-hidden /> : null}
        <EquipoTecnicoLabel seccion={seccion} trabajos={trabajos} abiertos={abiertos} carga={sin ? null : cargaDe(abiertos, maxAbiertos)} isOver={reasigna} />
      </div>

      {dias.map((tarjetas, i) => (
        <DayCell
          key={semana[i]}
          tecnicoKey={key}
          fecha={semana[i]}
          index={i}
          tarjetas={tarjetas}
          compacta={trabajos === 0}
          semana={semana}
          {...c}
        />
      ))}

      {/* Fila de otro técnico bajo el puntero: tinte suave (no mueve nada). */}
      {reasigna ? <span className="pointer-events-none absolute inset-0 z-0 bg-[#1B5CFF]/[0.03] dark:bg-[#4B7CFF]/[0.05]" aria-hidden /> : null}
    </div>
  );
});

/* --------------------------------------------------------------------------
   Tablero
   -------------------------------------------------------------------------- */

export function EquipoBoard({ secciones, porDia, ...c }: EquipoBoardProps) {
  const fechas = diasDeSemana(c.lunes);
  const tecnicos = secciones.filter((s) => s.tecnico.id != null).length;
  const maxAbiertos = useMemo(
    () => Math.max(1, ...secciones.filter((s) => s.tecnico.id != null).map((s) => conteoFila(tarjetasPorDia(s, c.lunes)).abiertos)),
    [secciones, c.lunes]
  );

  return (
    <div
      role="table"
      aria-label="Trabajos de la semana por técnico"
      data-dragging={c.dragFromKey != null ? "true" : undefined}
      className="overflow-clip rounded-[20px] border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04),0_12px_32px_-24px_rgba(9,9,11,0.3)] dark:border-[#273244] dark:bg-[#111827]"
    >
      {/* Encabezado de días: fijo bajo el encabezado de la app (`--equipo-sticky-top`). */}
      <div role="row" className={`sticky top-[var(--equipo-sticky-top,69px)] z-20 ${GRID} border-b border-[#E4E4E7] bg-[#FCFCFD] dark:border-[#273244] dark:bg-[#0F172A]`}>
        <div role="columnheader" className={`flex items-end gap-3 border-r px-4 pb-2.5 pt-3 ${divider}`}>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#17235B] text-white dark:bg-[#2A3D8F]" aria-hidden>
            <CalendarCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Técnicos</p>
            <p className="truncate text-[12.5px] font-medium tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">
              {tecnicos} en el equipo
            </p>
          </div>
        </div>
        {fechas.map((ymd, i) => (
          <DayHeader key={ymd} ymd={ymd} index={i} hoy={c.hoy} count={porDia[i] ?? 0} />
        ))}
      </div>

      {secciones.map((s, i) => (
        <BoardRow key={columnKey(s.tecnico.id)} seccion={s} index={i} maxAbiertos={maxAbiertos} {...c} />
      ))}
    </div>
  );
}
