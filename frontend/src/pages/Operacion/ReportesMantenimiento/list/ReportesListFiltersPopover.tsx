import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import {
  erpFilterBtnActiveClass,
  erpFilterBtnClass,
  erpFilterPopoverClass,
  erpFilterSectionLabelClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
} from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { Avatar } from "../../Proyectos/shared/ProyectoUi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tecnico: string;
  onTecnico: (nombre: string) => void;
  fecha: string;
  onFecha: (ymd: string) => void;
  tecnicos: { nombre: string; total: number }[];
  /** Foto de perfil por nombre en minúsculas. */
  avatars: Map<string, { id: number; url: string }>;
  activeFilterCount: number;
  onClear: () => void;
};

const panelClass = `${erpFilterPopoverClass} max-sm:!fixed max-sm:!inset-x-3 max-sm:!bottom-3 max-sm:!top-auto max-sm:!mt-0 max-sm:!w-auto max-sm:!max-h-[min(85dvh,36rem)]`;

/**
 * Popover de filtros del listado de reportes (mismo patrón que Proyectos y Órdenes):
 * técnico (lista con foto, conteo y búsqueda) y día. La evidencia se filtra en la barra segmentada.
 */
export function ReportesListFiltersPopover({ open, onOpenChange, tecnico, onTecnico, fecha, onFecha, tecnicos, avatars, activeFilterCount, onClear }: Props) {
  const panelId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");

  const lista = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tecnicos.filter((t) => t.nombre.toLowerCase().includes(q)) : tecnicos;
  }, [tecnicos, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(".flatpickr-calendar")) return;
      if (rootRef.current && target && !rootRef.current.contains(target)) onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className={`relative w-full sm:w-auto ${open ? "z-[100]" : "z-0"}`} ref={rootRef}>
      <button
        type="button"
        className={`${erpFilterBtnClass} w-full sm:w-auto ${activeFilterCount > 0 ? erpFilterBtnActiveClass : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
      >
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 7h13" />
          <path d="M3 12h10" />
          <path d="M3 17h7" />
          <path d="M18 7v10" />
          <path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Filtros
        {activeFilterCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1B5CFF] px-1.5 text-[10px] font-bold text-white" aria-label={`${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}>
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {open ? <button type="button" className="fixed inset-0 z-[105] bg-black/40 sm:hidden" aria-label="Cerrar filtros" onClick={() => onOpenChange(false)} /> : null}

      {open ? (
        <div id={panelId} role="dialog" aria-label="Filtros del listado de reportes" className={panelClass}>
          <div className="flex items-center justify-between gap-3 border-b border-[#E7E7EA] bg-[#FAFAFA]/90 px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/50">
            <div>
              <p className="text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">Filtros</p>
              <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">{activeFilterCount > 0 ? `${activeFilterCount} activo${activeFilterCount === 1 ? "" : "s"}` : "Sin filtros aplicados"}</p>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setQuery("");
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
              >
                Limpiar todo
              </button>
            ) : null}
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            <div>
              <div className="mb-2 flex items-end justify-between gap-2">
                <p id={`${panelId}-tec`} className={`${erpFilterSectionLabelClass} !mb-0`}>
                  Técnico
                </p>
                {tecnico ? (
                  <button type="button" onClick={() => onTecnico("")} className="text-[11px] font-medium text-[#1244D1] hover:underline dark:text-[#4B7CFF]">
                    Quitar
                  </button>
                ) : null}
              </div>
              {tecnicos.length > 6 ? (
                <div className="relative mb-2">
                  <label className="sr-only" htmlFor={searchId}>
                    Buscar técnico
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
                  <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar técnico…"
                    autoComplete="off"
                    className="h-9 w-full rounded-[10px] border border-[#E7E7EA] bg-white pl-8 pr-3 text-[13px] text-[#09090B] outline-none transition-[border-color,box-shadow] placeholder:text-[#A1A1AA] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>
              ) : null}
              <div role="radiogroup" aria-labelledby={`${panelId}-tec`} className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-[#E7E7EA] bg-[#FAFAFA]/70 p-1.5 dark:border-[#273244] dark:bg-[#0f172a]/40">
                <button
                  type="button"
                  role="radio"
                  aria-checked={tecnico === ""}
                  onClick={() => onTecnico("")}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13.5px] transition-colors ${tecnico === "" ? "bg-[#F1F5FF] font-semibold text-[#1244D1] dark:bg-[#4B7CFF]/10 dark:text-[#4B7CFF]" : "text-[#3d3d3a] hover:bg-white/80 dark:text-[#cbd5e1] dark:hover:bg-white/4"}`}
                >
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E4E4E7] text-[10px] font-semibold text-[#52525B] dark:bg-[#273244] dark:text-[#B7C1D1]" aria-hidden>
                    ∗
                  </span>
                  <span className="min-w-0 flex-1 truncate">Todos los técnicos</span>
                  {tecnico === "" ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </button>
                {lista.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-[#6E6E77] dark:text-[#8ea0b8]" role="status">
                    {tecnicos.length === 0 ? "Aún no hay técnicos en los reportes." : "Ningún técnico coincide."}
                  </p>
                ) : (
                  lista.map((t) => {
                    const checked = tecnico.toLowerCase() === t.nombre.toLowerCase();
                    const a = avatars.get(t.nombre.toLowerCase());
                    return (
                      <button
                        key={t.nombre}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => onTecnico(t.nombre)}
                        className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13.5px] transition-colors ${checked ? "bg-[#F1F5FF] font-semibold text-[#1244D1] dark:bg-[#4B7CFF]/10 dark:text-[#4B7CFF]" : "text-[#3d3d3a] hover:bg-white/80 dark:text-[#cbd5e1] dark:hover:bg-white/4"}`}
                      >
                        <Avatar person={{ id: a?.id ?? null, nombre: t.nombre, avatar_url: a?.url }} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{t.nombre}</span>
                        <span className="shrink-0 rounded-full bg-black/5 px-1.5 text-[11px] tabular-nums text-[#6E6E77] dark:bg-white/10 dark:text-[#8EA0B8]">{t.total}</span>
                        {checked ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <DatePicker
                id="filtro-fecha-reportes"
                label="Día del servicio"
                placeholder="Seleccionar fecha"
                defaultDate={fecha || undefined}
                appendToBody
                onChange={(_dates, currentDateString: string) => onFecha(currentDateString || "")}
              />
              <p className="mt-1.5 text-[11.5px] text-[#6E6E77] dark:text-[#8ea0b8]">Con un día elegido se muestran sus reportes sin importar el mes.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA]/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#273244] dark:bg-[#0f172a]/50 sm:flex-row sm:items-center sm:pb-3">
            <button type="button" onClick={() => onOpenChange(false)} className={`${erpPrimaryBtnClass} h-11 min-h-11 flex-1 !w-full`}>
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                setQuery("");
                onOpenChange(false);
              }}
              className={`${erpSecondaryBtnClass} h-11 min-h-11 flex-1 !w-full`}
            >
              Limpiar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
