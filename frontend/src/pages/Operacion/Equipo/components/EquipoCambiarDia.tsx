/**
 * «Cambiar día»: botón con ícono que abre un calendario mensual (lunes primero).
 *
 * - Se puede mover a cualquier fecha, no solo a la semana visible; la semana
 *   del tablero se marca de fondo, hoy lleva anillo y el día actual del trabajo
 *   va relleno (no se puede elegir).
 * - Portal con posición fija (no se recorta en las tarjetas); sigue al botón al
 *   hacer scroll; Esc o clic afuera lo cierran.
 * - Teclado (cuadrícula ARIA): ←→ día, ↑↓ semana, Inicio/Fin semana,
 *   RePág/AvPág mes, Enter elige, Esc devuelve el foco al botón.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { erpSansStyle } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { addDays, diaSemana, lunesDe, parseYmd, toYmd } from "../shared/equipoSemana";
import { rowActionBtn } from "../shared/equipoTokens";

const INICIALES = ["L", "M", "X", "J", "V", "S", "D"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Alto aproximado del panel (para decidir si abre hacia arriba). */
const PANEL_ALTO = 360;

const mesDe = (ymd: string) => ymd.slice(0, 7);

/** Suma meses conservando el día cuando existe (31 → último día del mes destino). */
function addMeses(ymd: string, n: number): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  const dia = d.getDate();
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(dia, ultimo));
  return toYmd(r);
}

/** 6 semanas × 7 días que cubren el mes de `ymd`, empezando en lunes. */
function cuadricula(ymd: string): string[][] {
  const inicio = lunesDe(`${mesDe(ymd)}-01`);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(inicio, w * 7 + i)));
}

function etiquetaLarga(ymd: string): string {
  const d = parseYmd(ymd);
  return d ? `${DIAS_LARGOS[diaSemana(ymd)]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` : ymd;
}

export function MoverDia({
  label,
  actual,
  semana,
  onPick,
}: {
  label: string;
  /** Día actual del trabajo (`YYYY-MM-DD`). */
  actual: string;
  /** Los 7 días de la semana visible del tablero (se resaltan). */
  semana: string[];
  onPick: (ymd: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  // Día con el foco de teclado (define también el mes mostrado).
  const [foco, setFoco] = useState(actual);
  const panelId = useId();
  const tituloId = useId();
  const open = pos != null;

  const hoy = useMemo(() => toYmd(new Date()), []);
  const enSemana = useMemo(() => new Set(semana), [semana]);
  const semanas = useMemo(() => cuadricula(foco), [foco]);
  const mes = parseYmd(foco);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const right = Math.max(8, window.innerWidth - r.right);
    setPos(
      window.innerHeight - r.bottom < PANEL_ALTO && r.top > PANEL_ALTO
        ? { bottom: window.innerHeight - r.top + 6, right }
        : { top: r.bottom + 6, right },
    );
  };
  const abrir = () => {
    setFoco(actual);
    place();
  };
  const cerrar = (refocus = false) => {
    setPos(null);
    if (refocus) btnRef.current?.focus();
  };
  const elegir = (ymd: string) => {
    if (ymd === actual) return;
    cerrar(true);
    onPick(ymd);
  };

  // El día enfocado recibe el foco real (también al cambiar de mes).
  useLayoutEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-ymd="${foco}"]`)?.focus({ preventScroll: true });
  }, [open, foco]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setPos(null);
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      place();
    };
    const onDismiss = () => setPos(null);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open]);

  const onGridKey = (e: React.KeyboardEvent) => {
    const mover: Record<string, () => string> = {
      ArrowLeft: () => addDays(foco, -1),
      ArrowRight: () => addDays(foco, 1),
      ArrowUp: () => addDays(foco, -7),
      ArrowDown: () => addDays(foco, 7),
      Home: () => lunesDe(foco),
      End: () => addDays(lunesDe(foco), 6),
      PageUp: () => addMeses(foco, -1),
      PageDown: () => addMeses(foco, 1),
    };
    const fn = mover[e.key];
    if (!fn) return;
    e.preventDefault();
    setFoco(fn());
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cerrar(true);
    }
  };

  const navBtn = `cot-press inline-flex size-8 items-center justify-center rounded-[9px] text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-white/[0.06] dark:hover:text-white [&_svg]:size-4 ${focusRing}`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        title="Cambiar de día"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? cerrar() : abrir())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            abrir();
          }
        }}
        className={`${rowActionBtn} size-7! rounded-xl! [&_svg]:size-3.5! ${open ? "bg-[#EEF3FF]! text-[#1244D1]! dark:bg-[#1B2A63]/60! dark:text-[#C9D7FF]!" : ""}`}
      >
        <CalendarClock aria-hidden />
      </button>
      {pos && mes
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label}
              onKeyDown={onPanelKey}
              onClick={(e) => e.stopPropagation()}
              style={{ ...erpSansStyle, position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right }}
              className={`cot-pop z-950 w-[17.5rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[14px] border border-[#E4E4E7] bg-white text-left shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)] ${pos.bottom != null ? "origin-bottom-right" : "origin-top-right"}`}
            >
              <p className="border-b border-[#F0F0F2] px-3 pb-1.5 pt-2.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#6E6E77] dark:border-[#1F2A3C] dark:text-[#8EA0B8]">
                Cambiar a…
              </p>

              <div className="p-2">
                {/* Mes y navegación */}
                <div className="mb-1 flex items-center justify-between gap-1 pl-1.5">
                  <p id={tituloId} className="text-[13.5px] font-semibold capitalize text-[#09090B] dark:text-[#F8FAFC]" aria-live="polite">
                    {MESES[mes.getMonth()]} {mes.getFullYear()}
                  </p>
                  <div className="flex items-center">
                    <button type="button" className={navBtn} onClick={() => setFoco(addMeses(foco, -1))} aria-label="Mes anterior">
                      <ChevronLeft aria-hidden />
                    </button>
                    <button type="button" className={navBtn} onClick={() => setFoco(addMeses(foco, 1))} aria-label="Mes siguiente">
                      <ChevronRight aria-hidden />
                    </button>
                  </div>
                </div>

                <div ref={gridRef} role="grid" aria-labelledby={tituloId} onKeyDown={onGridKey}>
                  <div role="row" className="grid grid-cols-7">
                    {INICIALES.map((d, i) => (
                      <span
                        key={d}
                        role="columnheader"
                        aria-label={DIAS_LARGOS[i]}
                        className="flex h-7 items-center justify-center text-[11px] font-semibold text-[#A1A1AA] dark:text-[#64748B]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  {semanas.map((fila) => (
                    <div key={fila[0]} role="row" className="grid grid-cols-7">
                      {fila.map((ymd, i) => {
                        const fuera = mesDe(ymd) !== mesDe(foco);
                        const esActual = ymd === actual;
                        const esHoy = ymd === hoy;
                        const visible = enSemana.has(ymd);
                        // La semana visible se pinta como una banda continua.
                        const banda = visible
                          ? `bg-[#F4F6FB] dark:bg-white/[0.04] ${i === 0 || !enSemana.has(addDays(ymd, -1)) ? "rounded-l-[10px]" : ""} ${i === 6 || !enSemana.has(addDays(ymd, 1)) ? "rounded-r-[10px]" : ""}`
                          : "";
                        return (
                          <div key={ymd} role="gridcell" aria-selected={esActual} className={`flex justify-center py-0.5 ${banda}`}>
                            <button
                              type="button"
                              data-ymd={ymd}
                              tabIndex={ymd === foco ? 0 : -1}
                              aria-disabled={esActual || undefined}
                              aria-current={esHoy ? "date" : undefined}
                              aria-label={`${etiquetaLarga(ymd)}${esActual ? ", día actual" : ""}${esHoy ? ", hoy" : ""}`}
                              onClick={() => elegir(ymd)}
                              className={`relative inline-flex size-9 items-center justify-center rounded-[10px] text-[13px] tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] focus-visible:ring-offset-1 dark:focus-visible:ring-[#6B93FF] dark:focus-visible:ring-offset-[#111827] ${
                                esActual
                                  ? "cursor-default bg-[#1B5CFF] font-semibold text-white dark:bg-[#4B7CFF]"
                                  : fuera
                                    ? "text-[#C4C4CA] hover:bg-[#F4F4F5] hover:text-[#52525B] dark:text-[#3E4B63] dark:hover:bg-white/[0.06] dark:hover:text-[#B7C1D1]"
                                    : "font-medium text-[#27272A] hover:bg-[#EEF3FF] hover:text-[#1244D1] dark:text-[#D6DEEA] dark:hover:bg-[#1B2A63]/60 dark:hover:text-[#C9D7FF]"
                              } ${esHoy && !esActual ? "ring-1 ring-inset ring-[#1B5CFF]/50 dark:ring-[#6B93FF]/60" : ""}`}
                            >
                              {parseYmd(ymd)?.getDate()}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] bg-[#FAFAFB] px-2.5 py-2 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]">
                  <span className="h-2.5 w-4 rounded-[4px] bg-[#E8ECF6] dark:bg-white/[0.08]" aria-hidden />
                  Semana del tablero
                </span>
                <button
                  type="button"
                  onClick={() => elegir(hoy)}
                  disabled={hoy === actual}
                  className={`inline-flex h-7 items-center rounded-[8px] px-2.5 text-[12px] font-semibold text-[#1B5CFF] hover:bg-[#EEF3FF] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#6B93FF] dark:hover:bg-[#1B2A63]/60 ${focusRing}`}
                >
                  Mover a hoy
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
