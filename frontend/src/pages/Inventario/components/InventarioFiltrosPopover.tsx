/**
 * Botón «Filtros» del listado de inventario con su panel desplegable:
 * ubicación (Exhibición / Almacén / Sin ubicación) y sección. Los cambios se
 * aplican al momento; «Listo» solo cierra. Radios nativos → flechas del
 * teclado entre opciones; Esc o clic fuera cierran y devuelven el foco.
 * El panel va en un portal con posición fija: la tarjeta del listado recorta
 * su contenido (`overflow-hidden`).
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, CircleDashed, LayoutGrid, SlidersHorizontal, Store, Warehouse } from "lucide-react";
import {
  INVENTARIO_SECCIONES,
  type InventarioSeccionFiltro,
  type InventarioSeccionTono,
} from "../shared/inventarioSecciones";
import type { InventarioUbicacionFiltro } from "../shared/inventarioTypes";
import { inventarioSansStyle, invPrimaryBtnClass, invSecondaryBtnClass } from "../shared/inventarioStyles";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ubicacion: InventarioUbicacionFiltro;
  onUbicacionChange: (next: InventarioUbicacionFiltro) => void;
  seccion: InventarioSeccionFiltro;
  onSeccionChange: (next: InventarioSeccionFiltro) => void;
  /** Ítems sin ubicación en todo el inventario (se muestra en su opción). */
  sinUbicacion: number;
  onClear: () => void;
};

const UBICACION_OPCIONES: { id: InventarioUbicacionFiltro; label: string; icon: typeof Store }[] = [
  { id: "todas", label: "Todas", icon: LayoutGrid },
  { id: "exhibicion", label: "Exhibición", icon: Store },
  { id: "almacen", label: "Almacén", icon: Warehouse },
  { id: "sin", label: "Sin ubicación", icon: CircleDashed },
];

type Tono = InventarioSeccionTono | "empty" | "all";

const SECCION_OPCIONES: { id: InventarioSeccionFiltro; label: string; tono: Tono }[] = [
  { id: "todas", label: "Todas las secciones", tono: "all" },
  { id: "sin", label: "Sin sección", tono: "empty" },
  ...INVENTARIO_SECCIONES.map((s) => ({ id: s.slug as InventarioSeccionFiltro, label: s.label, tono: s.tono as Tono })),
];

const TONO_DOT: Record<Tono, string> = {
  all: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
  empty: "border border-dashed border-current bg-transparent opacity-60",
  neutral: "bg-[#A1A1AA]",
  amber: "bg-[#d97706]",
  rose: "bg-[#e11d48]",
  emerald: "bg-[#059669]",
  sky: "bg-[#0284c7]",
  violet: "bg-[#7c3aed]",
  orange: "bg-[#1B5CFF]",
  slate: "bg-[#64748b]",
};

const contarFiltrosActivos = (ubicacion: InventarioUbicacionFiltro, seccion: InventarioSeccionFiltro) =>
  (ubicacion !== "todas" ? 1 : 0) + (seccion !== "todas" ? 1 : 0);

const sectionLabelClass =
  "mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]";

export default function InventarioFiltrosPopover({
  open,
  onOpenChange,
  ubicacion,
  onUbicacionChange,
  seccion,
  onSeccionChange,
  sinUbicacion,
  onClear,
}: Props) {
  const panelId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activos = contarFiltrosActivos(ubicacion, seccion);
  const [pos, setPos] = useState<CSSProperties | null>(null);

  // Alineado al borde derecho del botón; en pantallas angostas, con 16px de margen.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      const gutter = 16;
      const width = Math.min(window.innerWidth - gutter * 2, 368);
      const left = Math.max(gutter, Math.min(r.right - width, window.innerWidth - gutter - width));
      const top = r.bottom + 8;
      setPos({ top, left, width, maxHeight: Math.max(240, Math.min(window.innerHeight - top - gutter, 544)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const close = (restoreFocus = true) => {
    onOpenChange(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // Foco a la opción elegida de la primera sección para navegar con flechas.
    const raf = window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus({ preventScroll: true }),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir/cerrar
  }, [open]);

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        className={`cot-press inline-flex h-11 min-h-[44px] items-center gap-2 rounded-[10px] border px-3.5 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] ${
          activos > 0 || open
            ? "border-[#1B5CFF]/55 bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:border-[#4B7CFF]/50 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]"
            : "border-[#E7E7EA] bg-white text-[#3F3F46] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#E2E8F0] dark:hover:bg-[#1B2539]"
        }`}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtros
        {activos > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1B5CFF] px-1.5 text-[11px] font-bold tabular-nums text-white dark:bg-[#4B7CFF]">
            <span className="sr-only">, activos: </span>
            {activos}
          </span>
        ) : null}
      </button>

      {open && pos
        ? createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          style={{ ...pos, ...inventarioSansStyle }}
          className="cot-pop fixed z-[120] flex origin-top-right flex-col overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white shadow-[0_24px_48px_-16px_rgba(9,9,11,0.28)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827] dark:ring-white/10"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 dark:border-[#273244] dark:bg-[#0F172A]/60">
            <div>
              <p id={titleId} className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                Filtros
              </p>
              <p className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
                {activos > 0 ? `${activos} activo${activos === 1 ? "" : "s"}` : "Sin filtros aplicados"}
              </p>
            </div>
            {activos > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#9BB6FF]"
              >
                Limpiar todo
              </button>
            ) : null}
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
            <fieldset>
              <legend className={sectionLabelClass}>Ubicación</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {UBICACION_OPCIONES.map((o) => {
                  const Icon = o.icon;
                  return (
                    <Opcion
                      key={o.id}
                      name={`${panelId}-ubicacion`}
                      checked={ubicacion === o.id}
                      onSelect={() => onUbicacionChange(o.id)}
                      className="h-11 justify-center gap-1.5 px-2 text-[13px]"
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{o.label}</span>
                      {o.id === "sin" && sinUbicacion > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C22B2B] px-1.5 text-[11px] font-bold tabular-nums text-white">
                          <span className="sr-only">(</span>
                          {sinUbicacion > 999 ? "999+" : sinUbicacion}
                          <span className="sr-only">)</span>
                        </span>
                      ) : null}
                    </Opcion>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className={sectionLabelClass}>Sección</legend>
              <div className="space-y-0.5">
                {SECCION_OPCIONES.map((o) => {
                  const on = seccion === o.id;
                  return (
                    <Opcion
                      key={o.id}
                      name={`${panelId}-seccion`}
                      checked={on}
                      onSelect={() => onSeccionChange(o.id)}
                      variant="row"
                      className="h-10 gap-2.5 px-2.5 text-[13.5px]"
                    >
                      <span className={`size-2 shrink-0 rounded-full ${TONO_DOT[o.tono]}`} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-left">{o.label}</span>
                      {on ? <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden /> : null}
                    </Opcion>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="flex gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 dark:border-[#273244] dark:bg-[#0F172A]/60">
            <button
              type="button"
              onClick={onClear}
              disabled={activos === 0}
              className={`${invSecondaryBtnClass} h-10 min-h-0 flex-1 disabled:opacity-50`}
            >
              Limpiar
            </button>
            <button type="button" onClick={() => close()} className={`${invPrimaryBtnClass} h-10 min-h-0 flex-1`}>
              Listo
            </button>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Radio nativo oculto + etiqueta estilizada (tarjeta o fila). */
function Opcion({
  name,
  checked,
  onSelect,
  variant = "card",
  className,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  variant?: "card" | "row";
  className: string;
  children: ReactNode;
}) {
  const base =
    variant === "card"
      ? checked
        ? "border-[#1B5CFF]/60 bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:border-[#4B7CFF]/60 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#C7D5FF]"
        : "border-[#E7E7EA] bg-white text-[#52525B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#B7C1D1] dark:hover:bg-[#1B2539]"
      : checked
        ? "border-transparent bg-[#F1F5FF] font-semibold text-[#1244D1] dark:bg-[#4B7CFF]/12 dark:text-[#C7D5FF]"
        : "border-transparent text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#CBD5E1] dark:hover:bg-white/[0.05]";
  return (
    <label className="block cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        className={`flex items-center rounded-[10px] border font-medium transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[#1B5CFF]/45 ${base} ${className}`}
      >
        {children}
      </span>
    </label>
  );
}
