/**
 * Tablero semanal (escritorio): una fila por técnico y una columna por día,
 * de lunes a domingo.
 *
 * - Cada celda técnico × día es zona de soltar: arrastra una tarjeta a otra
 *   celda para cambiarla de técnico, de día o ambos. Soltarla sobre el nombre
 *   del técnico cambia solo el técnico.
 * - Se muestra completo (todos los técnicos, sin scroll vertical propio): el
 *   encabezado de días queda fijo bajo el encabezado de la app y se desplaza a
 *   la par del cuerpo; una barra horizontal flotante queda fija al borde
 *   inferior de la ventana. La columna de técnicos queda fija a la izquierda.
 * - Encabezado de día: mosaico con día y fecha, nombre relativo (Hoy, Ayer,
 *   Mañana) y conteo. Hoy: columna teñida y mosaico azul; días pasados
 *   atenuados; fin de semana con un rayado muy tenue.
 *
 * Movimiento (ver `equipo.css`): filas con entrada escalonada, destino bajo
 * el puntero con una capa superpuesta y contorno de destino en todas las
 * celdas mientras se arrastra (un atributo en el tablero, sin re-render).
 */
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useTecnicoDropTarget } from "../../hooks/useTecnicoDropTarget";
import { columnKey, dropOverId } from "../../shared/equipoDnd";
import type { EquipoSeccion } from "../../shared/equipoGrouping";
import { addDays, DIAS_CORTOS, DIAS_LARGOS, diasDeSemana, parseYmd, tarjetasPorDia, type EquipoTarjeta } from "../../shared/equipoSemana";
import { EquipoJobCard } from "./EquipoJobCard";
import { EquipoTecnicoLabel } from "./EquipoTecnicoLabel";
import { cargaDe, conteoFila, type EquipoBoardProps, type EquipoBoardRowCommon } from "./equipoBoardShared";

const GRID = "grid grid-cols-[12rem_repeat(7,minmax(17rem,1fr))]";

/** Fondo de la columna: hoy teñido, fin de semana con rayado tenue (barato: un gradiente). */
function dayTone(i: number, esHoy: boolean) {
  if (esHoy) return "bg-[#F5F8FF] dark:bg-[#1B2A63]/20";
  if (i >= 5)
    return "bg-[repeating-linear-gradient(135deg,transparent_0_7px,rgba(9,9,11,0.022)_7px_8px)] dark:bg-[repeating-linear-gradient(135deg,transparent_0_7px,rgba(255,255,255,0.025)_7px_8px)]";
  return "";
}

const divider = "border-[#EEEEF1] dark:border-[#1B2436]";
/** Separación entre días: línea de 2 px bien visible. */
const dayDivider = "border-[#D4D4DB] dark:border-[#3A4661]";

/* --------------------------------------------------------------------------
   Encabezado de un día
   -------------------------------------------------------------------------- */

function DayHeader({ ymd, index, hoy, count }: { ymd: string; index: number; hoy: string; count: number }) {
  const esHoy = ymd === hoy;
  const pasado = ymd < hoy;
  const finde = index >= 5;
  const d = parseYmd(ymd);
  return (
    <div
      role="columnheader"
      aria-current={esHoy ? "date" : undefined}
      className={`relative flex items-center gap-3 px-3 py-2.5 ${index > 0 ? `border-l-2 ${dayDivider}` : ""} ${esHoy ? "bg-[#F5F8FF] dark:bg-[#1B2A63]/25" : ""}`}
    >
      {esHoy ? <span className="eq-today-bar absolute inset-x-0 top-0 h-[3px] bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-hidden /> : null}
      {/* Mosaico de fecha: día corto arriba, número abajo. */}
      <span
        className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-[11px] leading-none ${
          esHoy
            ? "bg-[#1B5CFF] text-white shadow-[0_6px_14px_-8px_rgba(27,92,255,0.9)] dark:bg-[#4B7CFF]"
            : pasado
              ? "border border-[#EDEDF0] bg-[#FAFAFB] text-[#A1A1AA] dark:border-[#1F2A3C] dark:bg-white/[0.02] dark:text-[#4B5A75]"
              : "border border-[#E4E4E7] bg-white text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]"
        }`}
        aria-hidden
      >
        <span className={`text-[9.5px] font-semibold uppercase tracking-[0.1em] ${esHoy ? "text-white/80" : finde && !pasado ? "text-[#A1A1AA] dark:text-[#64748B]" : ""}`}>{DIAS_CORTOS[index]}</span>
        <span className="mt-1 text-[17px] font-semibold tabular-nums tracking-[-0.4px]">{d?.getDate()}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[12.5px] font-semibold ${esHoy ? "text-[#1B5CFF] dark:text-[#9BB6FF]" : pasado ? "text-[#A1A1AA] dark:text-[#64748B]" : "text-[#3F3F46] dark:text-[#D6DEEA]"}`}>
          {esHoy ? "Hoy" : ymd === addDays(hoy, -1) ? "Ayer" : ymd === addDays(hoy, 1) ? "Mañana" : DIAS_LARGOS[index]}
          <span className="sr-only"> {d?.getDate()}</span>
        </p>
        <p key={count} className={`cot-flash text-[11.5px] tabular-nums ${count === 0 ? "text-[#C4C4CC] dark:text-[#3A4661]" : "text-[#71717A] dark:text-[#8EA0B8]"}`}>
          {count === 0 ? "Sin trabajos" : `${count} ${count === 1 ? "trabajo" : "trabajos"}`}
        </p>
      </div>
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
      className={`relative flex min-w-0 flex-col gap-2 p-2 ${index > 0 ? `border-l-2 ${dayDivider}` : ""} ${compacta ? "min-h-[6rem]" : "min-h-[11rem]"} ${dayTone(
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
          className="cot-fade pointer-events-none absolute inset-1.5 z-10 flex items-end justify-center rounded-[10px] bg-[#1B5CFF]/[0.07] pb-1.5 shadow-[inset_0_0_0_2px_#1B5CFF] dark:bg-[#4B7CFF]/12 dark:shadow-[inset_0_0_0_2px_#4B7CFF]"
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

  return (
    <div
      role="row"
      aria-label={seccion.tecnico.nombre}
      className={`eq-row-in eq-board-row relative ${GRID} border-t ${dayDivider} ${c.justMovedKey?.endsWith(`@${key}`) ? "eq-moved-row" : ""}`}
      style={{ ["--eq-i" as string]: Math.min(index, 8) }}
    >
      <div
        ref={headerRef}
        role="rowheader"
        className={`sticky left-0 z-10 flex items-start border-r px-3.5 py-3.5 transition-[background-color,box-shadow] duration-150 ${divider} ${
          c.overKey === key
            ? "bg-[#EEF3FF] shadow-[inset_0_0_0_2px_#1B5CFF] dark:bg-[#1B2A63]/50 dark:shadow-[inset_0_0_0_2px_#4B7CFF]"
            : "eq-rowheader bg-[#FCFCFD] dark:bg-[#0F172A]"
        }`}
      >
        <EquipoTecnicoLabel seccion={seccion} trabajos={trabajos} abiertos={abiertos} carga={cargaDe(abiertos, maxAbiertos)} isOver={reasigna} />
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

  // Tres bandas que se desplazan a la par en horizontal: encabezado de días (fijo bajo el
  // encabezado de la app), cuerpo con todos los técnicos y una barra propia, grande y de alto
  // contraste, fija al borde inferior de la ventana (así se ve aunque el tablero sea muy largo).
  // La posición del control se escribe directo en el DOM: sin re-render al desplazar.
  const headRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const rangoRef = useRef<HTMLSpanElement | null>(null);
  const fechasRef = useRef(fechas);
  fechasRef.current = fechas;
  const [topOffset, setTopOffset] = useState(62);
  const [desborda, setDesborda] = useState(true);
  const [borde, setBorde] = useState({ izq: true, der: false });

  useLayoutEffect(() => {
    const head = headRef.current;
    const body = bodyRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!head || !body || !track || !thumb) return;

    let rem = 16;
    const rango = rangoRef.current;
    const actualizar = () => {
      const { scrollLeft, scrollWidth, clientWidth } = body;
      const max = scrollWidth - clientWidth;
      const pista = track.clientWidth;
      const ancho = Math.min(pista, Math.max(56, pista * (clientWidth / Math.max(1, scrollWidth))));
      const x = max > 0 ? (scrollLeft / max) * (pista - ancho) : 0;
      thumb.style.width = `${ancho}px`;
      thumb.style.transform = `translateX(${x}px)`;
      thumb.setAttribute("aria-valuenow", String(max > 0 ? Math.round((scrollLeft / max) * 100) : 0));
      if (head.scrollLeft !== scrollLeft) head.scrollLeft = scrollLeft;
      // Días visibles (lo que queda a la derecha de la columna fija de técnicos).
      if (rango) {
        const col = Math.max(1, (scrollWidth - 12 * rem) / 7);
        const i0 = Math.min(6, Math.max(0, Math.floor(scrollLeft / col)));
        const i1 = Math.min(6, Math.max(i0, Math.ceil((scrollLeft + clientWidth - 12 * rem) / col) - 1));
        const f = fechasRef.current;
        const et = (i: number) => `${DIAS_CORTOS[i]} ${parseYmd(f[i])?.getDate() ?? ""}`;
        const txt = i0 === i1 ? et(i0) : `${et(i0)} – ${et(i1)}`;
        if (rango.textContent !== txt) rango.textContent = txt;
      }
      const izq = scrollLeft <= 1;
      const der = scrollLeft >= max - 1;
      setBorde((b) => (b.izq === izq && b.der === der ? b : { izq, der }));
    };
    const medir = () => {
      rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setDesborda(body.scrollWidth > body.clientWidth + 1);
      actualizar();
    };

    // Arrastrar el control, o pulsar la pista para saltar a esa zona.
    let arrastre: { x0: number; scroll0: number } | null = null;
    const max = () => body.scrollWidth - body.clientWidth;
    const onThumbDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      thumb.setPointerCapture(e.pointerId);
      arrastre = { x0: e.clientX, scroll0: body.scrollLeft };
      thumb.dataset.drag = "1";
    };
    const onThumbMove = (e: PointerEvent) => {
      if (!arrastre) return;
      const libre = track.clientWidth - thumb.offsetWidth;
      if (libre > 0) body.scrollLeft = arrastre.scroll0 + ((e.clientX - arrastre.x0) / libre) * max();
    };
    const onThumbUp = (e: PointerEvent) => {
      arrastre = null;
      delete thumb.dataset.drag;
      if (thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
    };
    const onTrackDown = (e: PointerEvent) => {
      if (e.target === thumb) return;
      const r = track.getBoundingClientRect();
      const libre = track.clientWidth - thumb.offsetWidth;
      if (libre > 0) body.scrollTo({ left: ((e.clientX - r.left - thumb.offsetWidth / 2) / libre) * max(), behavior: "smooth" });
    };
    // El encabezado no tiene barra propia: la rueda horizontal (o Shift + rueda) mueve el cuerpo.
    const onHeadWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (dx) body.scrollLeft += dx;
    };

    body.addEventListener("scroll", actualizar, { passive: true });
    head.addEventListener("wheel", onHeadWheel, { passive: true });
    thumb.addEventListener("pointerdown", onThumbDown);
    thumb.addEventListener("pointermove", onThumbMove);
    thumb.addEventListener("pointerup", onThumbUp);
    thumb.addEventListener("pointercancel", onThumbUp);
    track.addEventListener("pointerdown", onTrackDown);

    const ro = new ResizeObserver(medir);
    ro.observe(body);
    ro.observe(track);
    if (body.firstElementChild) ro.observe(body.firstElementChild);
    medir();

    // Alto del encabezado de la app (sticky): el de días se fija justo debajo.
    const appHeader = document.querySelector("header");
    const medirTop = () => appHeader && setTopOffset(Math.round(appHeader.getBoundingClientRect().height));
    medirTop();
    const roTop = new ResizeObserver(medirTop);
    if (appHeader) roTop.observe(appHeader);

    return () => {
      body.removeEventListener("scroll", actualizar);
      head.removeEventListener("wheel", onHeadWheel);
      thumb.removeEventListener("pointerdown", onThumbDown);
      thumb.removeEventListener("pointermove", onThumbMove);
      thumb.removeEventListener("pointerup", onThumbUp);
      thumb.removeEventListener("pointercancel", onThumbUp);
      track.removeEventListener("pointerdown", onTrackDown);
      ro.disconnect();
      roTop.disconnect();
    };
  }, []);

  /** Dos columnas de día por pulsación (suave); con el teclado, una. */
  const desplazar = (dir: -1 | 1, pasos = 2) => bodyRef.current?.scrollBy({ left: dir * pasos * 17 * 16, behavior: "smooth" });
  const flechaCls =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#5B6478] transition-[background-color,color,opacity] duration-150 hover:bg-[#17235B]/8 hover:text-[#17235B] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent dark:text-[#B7C1D1] dark:hover:bg-white/10 dark:hover:text-white dark:disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/50";

  return (
    <div
      role="table"
      aria-label="Trabajos de la semana por técnico"
      data-dragging={c.dragFromKey != null ? "true" : undefined}
      className="eq-board rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.03),0_16px_40px_-32px_rgba(9,9,11,0.35)] dark:border-[#243044] dark:bg-[#111827]"
    >
      {/* Encabezado de días: fijo bajo el encabezado de la app; sigue el scroll horizontal del cuerpo. */}
      <div
        ref={headRef}
        className="sticky z-20 overflow-hidden rounded-t-[19px] border-b border-[#E4E4E7] bg-[#FAFAFB] dark:border-[#273244] dark:bg-[#0F172A]"
        style={{ top: topOffset }}
      >
        <div role="row" className={`${GRID} min-w-[131rem]`}>
          <div role="columnheader" className={`sticky left-0 z-30 flex items-end gap-3 border-r bg-[#FAFAFB] px-4 pb-2.5 pt-3 dark:bg-[#0F172A] ${divider}`}>
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white text-[#17235B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#9BB6FF]" aria-hidden>
              <CalendarCheck className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Técnicos</p>
              <p className="truncate text-[12.5px] font-medium tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">{tecnicos} en el equipo</p>
            </div>
          </div>
          {fechas.map((ymd, i) => (
            <DayHeader key={ymd} ymd={ymd} index={i} hoy={c.hoy} count={porDia[i] ?? 0} />
          ))}
        </div>
      </div>

      {/* Cuerpo: todos los técnicos, sin scroll vertical propio; la barra horizontal va abajo. */}
      <div ref={bodyRef} className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[131rem]">
          {secciones.map((s, i) => (
            <BoardRow key={columnKey(s.tecnico.id)} seccion={s} index={i} maxAbiertos={maxAbiertos} {...c} />
          ))}
        </div>
      </div>

      {/* Barra de desplazamiento: cápsula flotante fija al borde inferior de la ventana. */}
      <div className={`sticky bottom-3 z-20 mx-auto my-3 w-[min(40rem,calc(100%-1.5rem))] ${desborda ? "block" : "hidden"}`}>
        <div className="flex items-center gap-1.5 rounded-full border border-[#D9DCE4] bg-white/90 p-1 pr-1.5 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.45)] backdrop-blur-md dark:border-[#3A4661] dark:bg-[#151E33]/90 dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.75)]">
          <button type="button" onClick={() => desplazar(-1)} disabled={borde.izq} aria-label="Ver días anteriores" className={flechaCls}>
            <ChevronLeft className="size-[17px]" aria-hidden />
          </button>
          <span
            ref={rangoRef}
            aria-hidden
            className="hidden w-[8.5rem] shrink-0 text-center text-[11.5px] font-semibold tabular-nums tracking-[0.01em] text-[#3F4A63] sm:block dark:text-[#D6DEEA]"
          />
          <div ref={trackRef} className="group relative h-5 min-w-0 flex-1 cursor-pointer">
            <div className="absolute inset-x-0 top-[6px] h-2 rounded-full bg-[#E3E6EE] dark:bg-white/10" aria-hidden />
            <div
              ref={thumbRef}
              role="scrollbar"
              aria-orientation="horizontal"
              aria-label="Desplazamiento horizontal del tablero"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  desplazar(-1, 1);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  desplazar(1, 1);
                }
              }}
              className="absolute left-0 top-[6px] h-2 cursor-grab touch-none rounded-full bg-[#17235B] transition-[background-color,height,top] duration-150 hover:top-[4px] hover:h-3 data-[drag]:top-[4px] data-[drag]:h-3 data-[drag]:cursor-grabbing data-[drag]:bg-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/60 dark:bg-[#8FA6D6] dark:data-[drag]:bg-[#6B93FF]"
            />
          </div>
          <button type="button" onClick={() => desplazar(1)} disabled={borde.der} aria-label="Ver días siguientes" className={flechaCls}>
            <ChevronRight className="size-[17px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
