/**
 * Filtro del listado por ubicación física: Todas · Exhibición · Almacén · Sin ubicación.
 * Grupo de radio segmentado; se combina con el filtro de secciones.
 */
import { CircleDashed, LayoutGrid, Store, Warehouse } from "lucide-react";
import type { InventarioUbicacionFiltro as Filtro } from "../shared/inventarioTypes";

type Props = {
  value: Filtro;
  onChange: (next: Filtro) => void;
  /** Ítems sin ubicación (se muestra en su opción si es > 0). */
  sinUbicacion: number;
};

const OPCIONES: { id: Filtro; label: string; icon: typeof Store }[] = [
  { id: "todas", label: "Todas", icon: LayoutGrid },
  { id: "exhibicion", label: "Exhibición", icon: Store },
  { id: "almacen", label: "Almacén", icon: Warehouse },
  { id: "sin", label: "Sin ubicación", icon: CircleDashed },
];

export default function InventarioUbicacionFiltro({ value, onChange, sinUbicacion }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Filtrar por ubicación"
      className="grid min-w-0 grid-cols-2 gap-1 rounded-[12px] border border-[#E7E7EA] bg-[#F4F4F5] p-1 dark:border-[#273244] dark:bg-[#0F172A] sm:flex sm:shrink-0"
    >
      {OPCIONES.map((o) => {
        const on = value === o.id;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
              on
                ? "bg-white text-[#09090B] shadow-[0_1px_3px_rgba(9,9,11,0.12)] dark:bg-[#1B2A63] dark:text-[#F8FAFC]"
                : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
            }`}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{o.label}</span>
            {o.id === "sin" && sinUbicacion > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C22B2B] px-1.5 text-[11px] font-bold tabular-nums text-white">
                {sinUbicacion > 999 ? "999+" : sinUbicacion}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
