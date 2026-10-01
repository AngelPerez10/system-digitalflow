import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import type { EvidenciaFiltro } from "./reporteListUtils";

/** Segmentos del control (mismo patrón visual que el filtro de estado de Proyectos / Órdenes). */
const SEGMENTS: { value: EvidenciaFiltro; label: string; activeClass: string; dotClass: string }[] = [
  {
    value: "",
    label: "Todos",
    activeClass: "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#243048] dark:text-white",
    dotClass: "bg-[#A1A1AA] dark:bg-[#64748b]",
  },
  {
    value: "con",
    label: "Con evidencia",
    activeClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
  },
  {
    value: "sin",
    label: "Sin evidencia",
    activeClass: "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.2)] dark:text-[#E6A23C]",
    dotClass: "bg-amber-500 dark:bg-amber-400",
  },
];

type Props = {
  value: EvidenciaFiltro;
  onChange: (v: EvidenciaFiltro) => void;
  counts: { todos: number; con: number; sin: number };
};

/** Centra el segmento activo solo dentro del rail. */
function centrar(rail: HTMLElement, chip: HTMLElement, behavior: ScrollBehavior) {
  const r = rail.getBoundingClientRect();
  const c = chip.getBoundingClientRect();
  rail.scrollTo({ left: Math.max(0, rail.scrollLeft + c.left - r.left - (rail.clientWidth - chip.clientWidth) / 2), behavior });
}

/** Barra segmentada por evidencia, con rail horizontal responsivo y navegación por teclado. */
export function ReportesEvidenciaSegmentFilter({ value, onChange, counts }: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  const focusTab = useCallback((index: number) => {
    const root = railRef.current;
    const target = root?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index];
    if (!root || !target) return;
    target.focus({ preventScroll: true });
    centrar(root, target, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  }, []);

  useEffect(() => {
    const root = railRef.current;
    const selected = root?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (root && selected) centrar(root, selected, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SEGMENTS.length - 1;
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? (index === last ? 0 : index + 1) : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (index === 0 ? last : index - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next == null) return;
    e.preventDefault();
    focusTab(next);
  };

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-hidden">
      <div
        ref={railRef}
        role="tablist"
        aria-label="Filtrar por evidencia"
        aria-orientation="horizontal"
        className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-[#273244] dark:bg-[#0f172a] [&::-webkit-scrollbar]:hidden"
      >
        {SEGMENTS.map((seg, index) => {
          const active = value === seg.value;
          const count = seg.value === "" ? counts.todos : seg.value === "con" ? counts.con : counts.sin;
          return (
            <button
              key={seg.value || "todos"}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(seg.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.4)] sm:min-h-0 ${
                active ? seg.activeClass : "text-[#52525B] hover:bg-white hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <span className={`size-1.5 shrink-0 rounded-full ${seg.dotClass}`} aria-hidden />
              {seg.label}
              <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums ${active ? "bg-black/10 dark:bg-white/15" : "bg-black/5 text-[#6E6E77] dark:bg-white/10 dark:text-[#8EA0B8]"}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
