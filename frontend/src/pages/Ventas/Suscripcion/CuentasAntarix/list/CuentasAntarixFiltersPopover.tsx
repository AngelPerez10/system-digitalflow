/**
 * Botón «Filtros» del listado de cuentas con su panel desplegable:
 * estado (todas / activas / bloqueadas), unidades (todas / con / sin) y
 * «solo distribuidores». Contador de filtros activos en el botón.
 *
 * Panel: se abre debajo del botón, alineado a la derecha; Esc o clic afuera
 * lo cierran (Esc devuelve el foco al botón). Entrada con `cot-pop`.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAA_FILTROS_DEFAULT,
  filtrosActivos,
  type CaaEstadoFiltro,
  type CaaFiltros,
  type CaaUnidadesFiltro,
} from "../shared/cuentasAntarixFiltros";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

export type CaaFiltroConteos = {
  estado: Record<CaaEstadoFiltro, number>;
  unidades: Record<CaaUnidadesFiltro, number>;
  distribuidores: number;
};

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="px-4 py-3">
      <p id={id} className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">
        {title}
      </p>
      {children}
    </div>
  );
}

function Opcion({ selected, onSelect, label, dot, count }: { selected: boolean; onSelect: () => void; label: string; dot?: string; count?: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "cot-press flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] font-medium",
        selected
          ? "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]"
          : "text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/[0.05]",
        focusRing,
      )}
    >
      {dot ? <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden /> : null}
      <span className="flex-1">{label}</span>
      {count != null ? <span className="text-[12px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{count}</span> : null}
      <Check className={cn("size-4 transition-opacity duration-150", selected ? "opacity-100" : "opacity-0")} aria-hidden />
    </button>
  );
}

export default function CuentasAntarixFiltersPopover({
  filtros,
  onChange,
  conteos,
}: {
  filtros: CaaFiltros;
  onChange: (f: CaaFiltros) => void;
  conteos: CaaFiltroConteos;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const activos = filtrosActivos(filtros);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative w-full sm:w-auto">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={activos > 0 ? `Filtros, ${activos} activos` : "Filtros"}
        className={cn(
          "caa-filter-btn cot-press inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold tracking-[-0.1px] sm:w-auto sm:min-h-0 sm:py-2.5 [&_svg]:size-4 [&_svg]:shrink-0",
          open || activos > 0
            ? "border-[#BFD3FF] bg-[#EEF3FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]"
            : "border-[#E7E7EA] bg-white text-[#09090B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#1B2539]",
          focusRing,
        )}
      >
        <SlidersHorizontal aria-hidden />
        Filtros
        {activos > 0 ? (
          <span
            key={activos}
            className="cot-flash inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1B5CFF] px-1 text-[10.5px] font-bold tabular-nums text-white dark:bg-[#4B7CFF]"
            aria-hidden
          >
            {activos}
          </span>
        ) : null}
        <ChevronDown className={cn("size-3.5! opacity-60 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Filtros de cuentas"
          className="cot-pop absolute right-0 top-[calc(100%+8px)] z-40 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[16px] border border-[#E4E4E7] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]"
        >
          <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
            <Seccion title="Estado">
              <div role="radiogroup" aria-label="Estado" className="space-y-0.5">
                <Opcion selected={filtros.estado === "todas"} onSelect={() => onChange({ ...filtros, estado: "todas" })} label="Todas" count={conteos.estado.todas} />
                <Opcion
                  selected={filtros.estado === "activas"}
                  onSelect={() => onChange({ ...filtros, estado: "activas" })}
                  label="Activas"
                  dot="bg-[#0E8A5F] dark:bg-[#34D399]"
                  count={conteos.estado.activas}
                />
                <Opcion
                  selected={filtros.estado === "bloqueadas"}
                  onSelect={() => onChange({ ...filtros, estado: "bloqueadas" })}
                  label="Bloqueadas"
                  dot="bg-[#A1A1AA] dark:bg-[#64748B]"
                  count={conteos.estado.bloqueadas}
                />
              </div>
            </Seccion>
            <Seccion title="Unidades">
              <div role="radiogroup" aria-label="Unidades" className="space-y-0.5">
                <Opcion selected={filtros.unidades === "todas"} onSelect={() => onChange({ ...filtros, unidades: "todas" })} label="Todas" count={conteos.unidades.todas} />
                <Opcion selected={filtros.unidades === "con"} onSelect={() => onChange({ ...filtros, unidades: "con" })} label="Con unidades" count={conteos.unidades.con} />
                <Opcion
                  selected={filtros.unidades === "sin"}
                  onSelect={() => onChange({ ...filtros, unidades: "sin" })}
                  label="Sin unidades"
                  dot="bg-[#D08A1E] dark:bg-[#E6A23C]"
                  count={conteos.unidades.sin}
                />
              </div>
            </Seccion>
            <Seccion title="Permisos">
              <label className="flex h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-[10px] px-2.5 text-[13px] font-medium text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/[0.05]">
                <span>
                  Solo distribuidores <span className="ml-1 text-[12px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{conteos.distribuidores}</span>
                </span>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={filtros.soloDistribuidores}
                  onChange={(e) => onChange({ ...filtros, soloDistribuidores: e.target.checked })}
                />
                <span
                  className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-[#D4D4D8] transition-colors duration-150 peer-checked:bg-[#1B5CFF] peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,92,255,0.25)] dark:bg-[#3A4661] dark:peer-checked:bg-[#4B7CFF] after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4"
                  aria-hidden
                />
              </label>
            </Seccion>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] bg-[#FAFAFB] px-4 py-2.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
            <button
              type="button"
              onClick={() => onChange(CAA_FILTROS_DEFAULT)}
              disabled={activos === 0}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2 text-[12.5px] font-semibold text-[#52525B] hover:bg-[#F4F4F5] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#B7C1D1] dark:hover:bg-white/[0.05]",
                focusRing,
              )}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Restablecer
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                btnRef.current?.focus();
              }}
              className={cn("cot-press inline-flex h-8 items-center rounded-[9px] bg-[#17235B] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#1F2D73] dark:bg-[#2A3D8F]", focusRing)}
            >
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
