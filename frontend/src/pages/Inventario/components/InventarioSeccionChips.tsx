import { useCallback, useEffect, useId, useRef, type KeyboardEvent } from "react";
import {
  INVENTARIO_SECCIONES,
  seccionLabel,
  type InventarioSeccionFiltro,
  type InventarioSeccionMeta,
  type InventarioSeccionTono,
} from "../shared/inventarioSecciones";

type InventarioSeccionChipsProps = {
  value: InventarioSeccionFiltro;
  onChange: (next: InventarioSeccionFiltro) => void;
};

type ChipOption = {
  id: InventarioSeccionFiltro;
  label: string;
  shortLabel: string;
  tono: InventarioSeccionTono | "empty" | "all";
};

const OPCIONES: ChipOption[] = [
  { id: "todas", label: "Todas", shortLabel: "Todas", tono: "all" },
  { id: "sin", label: "Sin sección", shortLabel: "Sin sec.", tono: "empty" },
  ...INVENTARIO_SECCIONES.map((s: InventarioSeccionMeta) => ({
    id: s.slug as InventarioSeccionFiltro,
    label: s.label,
    shortLabel: s.shortLabel,
    tono: s.tono,
  })),
];

function tonoDotClass(tono: ChipOption["tono"], selected: boolean): string {
  if (selected) return "bg-current opacity-90";
  if (tono === "empty") return "border border-dashed border-current bg-transparent opacity-50";
  if (tono === "all") return "bg-[#1B5CFF] dark:bg-[#4B7CFF]";
  if (tono === "amber") return "bg-[#d97706]";
  if (tono === "rose") return "bg-[#e11d48]";
  if (tono === "emerald") return "bg-[#059669]";
  if (tono === "sky") return "bg-[#0284c7]";
  if (tono === "violet") return "bg-[#7c3aed]";
  if (tono === "orange") return "bg-[#1B5CFF]";
  if (tono === "slate") return "bg-[#64748b]";
  return "bg-[#A1A1AA]";
}

function filtroAnuncio(value: InventarioSeccionFiltro): string {
  if (value === "todas") return "Mostrando todas las secciones";
  if (value === "sin") return "Filtrado: sin sección";
  const label = seccionLabel(value);
  return label ? `Filtrado: ${label}` : "Filtro de sección actualizado";
}

/** Centra el chip activo solo dentro del rail (no hace scroll de la página). */
function scrollChipIntoRail(
  rail: HTMLElement,
  chip: HTMLElement,
  behavior: ScrollBehavior,
) {
  const railRect = rail.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  const delta =
    chipRect.left -
    railRect.left -
    (rail.clientWidth - chip.clientWidth) / 2;
  const nextLeft = Math.max(0, rail.scrollLeft + delta);
  rail.scrollTo({ left: nextLeft, behavior });
}

export default function InventarioSeccionChips({ value, onChange }: InventarioSeccionChipsProps) {
  const labelId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    OPCIONES.findIndex((op) => op.id === value),
  );

  const focusTabAt = useCallback((index: number) => {
    const root = listRef.current;
    if (!root) return;
    const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = tabs[index];
    if (!target) return;
    target.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollChipIntoRail(root, target, reduceMotion ? "auto" : "smooth");
  }, []);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const selected = root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!selected) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollChipIntoRail(root, selected, reduceMotion ? "auto" : "smooth");
  }, [value]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = OPCIONES.length - 1;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = index === last ? 0 : index + 1;
      focusTabAt(next);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = index === 0 ? last : index - 1;
      focusTabAt(next);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusTabAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusTabAt(last);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(OPCIONES[index].id);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-2 overflow-hidden">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p
            id={labelId}
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A6B15] dark:text-[#E6A23C]"
          >
            Secciones
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]">
            Desliza el rail o usa ← →.
          </p>
        </div>
        <p
          className="max-w-full truncate rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#B7C1D1] sm:max-w-[18rem]"
          title={filtroAnuncio(value)}
        >
          {filtroAnuncio(value)}
        </p>
      </div>

      {/* Contenedor con ancho acotado: sin esto el flex del rail estira toda la card/tabla. */}
      <div className="relative w-full min-w-0 max-w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent dark:from-[#111827] sm:w-8"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-[#111827] sm:w-10"
          aria-hidden="true"
        />

        <div
          ref={listRef}
          role="tablist"
          aria-labelledby={labelId}
          aria-orientation="horizontal"
          className="flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-[#273244] dark:bg-[#1B2539] sm:gap-2 sm:p-2 [&::-webkit-scrollbar]:hidden"
        >
          {OPCIONES.map((op, index) => {
            const selected = value === op.id;
            return (
              <button
                key={op.id}
                type="button"
                role="tab"
                id={`inventario-seccion-tab-${op.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                title={op.label}
                className={[
                  "group relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-left transition-[color,background-color,box-shadow] duration-150 sm:px-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.5)] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1B2539]",
                  "motion-reduce:transition-none",
                  selected
                    ? "bg-[#1B5CFF] text-white shadow-[0_8px_20px_-12px_rgba(27,92,255,0.75)] dark:bg-[#4B7CFF]"
                    : "bg-transparent text-[#52525B] hover:bg-white hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC]",
                ].join(" ")}
                onClick={() => onChange(op.id)}
                onKeyDown={(e) => onTabKeyDown(e, index)}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${tonoDotClass(op.tono, selected)}`}
                  aria-hidden="true"
                />
                {/* shortLabel hasta lg: evita un rail enorme que empuje el layout */}
                <span className="whitespace-nowrap text-[12px] font-semibold tracking-tight lg:hidden">
                  {op.shortLabel}
                </span>
                <span className="hidden whitespace-nowrap text-[12px] font-semibold tracking-tight lg:inline">
                  {op.label}
                </span>
                {selected ? (
                  <span
                    className="pointer-events-none absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-white/40"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {filtroAnuncio(value)}
        {selectedIndex >= 0 ? `. Pestaña ${selectedIndex + 1} de ${OPCIONES.length}.` : ""}
      </p>
    </div>
  );
}
