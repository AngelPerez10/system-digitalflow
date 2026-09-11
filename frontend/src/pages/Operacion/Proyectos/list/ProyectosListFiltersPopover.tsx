import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import DatePicker from "@/components/form/date-picker";
import {
  erpFilterBtnActiveClass,
  erpFilterBtnClass,
  erpFilterPopoverClass,
  erpFilterSectionLabelClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSelectFieldClass,
} from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { ProyectoEstado } from "../shared/proyectoTypes";

export type ProyectoListFilterStatus = "" | ProyectoEstado;

export type ProyectoTecnicoFilterOption = {
  id: number;
  nombre: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterTiposTrabajo: string[];
  setFilterTiposTrabajo: Dispatch<SetStateAction<string[]>>;
  filterDate: string;
  setFilterDate: Dispatch<SetStateAction<string>>;
  filterTecnicoId: number | null;
  setFilterTecnicoId: Dispatch<SetStateAction<number | null>>;
  tiposTrabajoDisponibles: string[];
  tecnicos: ProyectoTecnicoFilterOption[];
  /** Solo filtros secundarios (sin estado: el estado vive en la barra segmentada). */
  activeFilterCount: number;
  onClear: () => void;
  showTecnicoFilter?: boolean;
  datePickerId?: string;
};

const proyectosFilterPanelClass = `${erpFilterPopoverClass} max-sm:!fixed max-sm:!inset-x-3 max-sm:!bottom-3 max-sm:!top-auto max-sm:!mt-0 max-sm:!w-auto max-sm:!max-h-[min(85dvh,36rem)]`;

/**
 * Popover de filtros del listado de proyectos (mismo patrón visual que órdenes).
 * El estado se filtra con `ProyectosStatusSegmentFilter` en la cabecera del listado.
 */
export function ProyectosListFiltersPopover({
  open,
  onOpenChange,
  filterTiposTrabajo,
  setFilterTiposTrabajo,
  filterDate,
  setFilterDate,
  filterTecnicoId,
  setFilterTecnicoId,
  tiposTrabajoDisponibles,
  tecnicos,
  activeFilterCount,
  onClear,
  showTecnicoFilter = true,
  datePickerId = "filtro-fecha-proyectos",
}: Props) {
  const panelId = useId();
  const tecnicoSelectId = useId();
  const tipoSearchId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [tipoQuery, setTipoQuery] = useState("");
  const showTipoSearch = tiposTrabajoDisponibles.length > 4;

  const tecnicosOrdenados = useMemo(
    () =>
      [...tecnicos].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
      ),
    [tecnicos]
  );

  const tiposFiltrados = useMemo(() => {
    const q = tipoQuery.trim().toLowerCase();
    if (!q) return tiposTrabajoDisponibles;
    return tiposTrabajoDisponibles.filter((t) => t.toLowerCase().includes(q));
  }, [tiposTrabajoDisponibles, tipoQuery]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return;
      const target = e.target as Element | null;
      if (target?.closest?.(".flatpickr-calendar")) return;
      if (target && !rootRef.current.contains(target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setTipoQuery("");
  }, [open]);

  const toggleTipo = (tipo: string, checked: boolean) => {
    setFilterTiposTrabajo((prev) => {
      if (checked) return Array.from(new Set([...(prev || []), tipo]));
      return (prev || []).filter((t) => t !== tipo);
    });
  };

  const tecnicoSelectValue =
    filterTecnicoId == null ? "" : filterTecnicoId === 0 ? "0" : String(filterTecnicoId);

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
        {activeFilterCount > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1B5CFF] px-1.5 text-[10px] font-bold text-white"
            aria-label={`${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[105] bg-black/40 sm:hidden"
          aria-label="Cerrar filtros"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filtros del listado de proyectos"
          className={proyectosFilterPanelClass}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E7E7EA] bg-[#FAFAFA]/90 px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/50">
            <div>
              <p className="text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">Filtros</p>
              <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
                {activeFilterCount > 0
                  ? `${activeFilterCount} activo${activeFilterCount === 1 ? "" : "s"}`
                  : "Sin filtros aplicados"}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setTipoQuery("");
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 custom-scrollbar">
            {showTecnicoFilter && (
              <div>
                <label htmlFor={tecnicoSelectId} className={erpFilterSectionLabelClass}>
                  Usuario
                </label>
                <select
                  id={tecnicoSelectId}
                  value={tecnicoSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setFilterTecnicoId(null);
                    else setFilterTecnicoId(Number(v));
                  }}
                  className={`${erpSelectFieldClass} !h-10`}
                >
                  <option value="">Todos los usuarios</option>
                  <option value="0">Sin asignar</option>
                  {tecnicosOrdenados.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-end justify-between gap-2">
                <p id={`${panelId}-tipos-label`} className={`${erpFilterSectionLabelClass} !mb-0`}>
                  Tipo de trabajo
                </p>
                {filterTiposTrabajo.length > 0 && (
                  <span className="text-[11px] font-medium text-[#1244D1] dark:text-[#4B7CFF]">
                    {filterTiposTrabajo.length} seleccionado{filterTiposTrabajo.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {showTipoSearch ? (
                <>
                  <label className="sr-only" htmlFor={tipoSearchId}>
                    Buscar tipo de trabajo
                  </label>
                  <input
                    id={tipoSearchId}
                    type="search"
                    value={tipoQuery}
                    onChange={(e) => setTipoQuery(e.target.value)}
                    placeholder="Buscar tipo…"
                    className={`${erpSelectFieldClass} !h-9 mb-2`}
                    autoComplete="off"
                  />
                </>
              ) : null}
              <div
                className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-[#E7E7EA] bg-[#FAFAFA]/70 p-2 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:max-h-48"
                role="group"
                aria-labelledby={`${panelId}-tipos-label`}
              >
                {tiposFiltrados.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-[#6E6E77] dark:text-[#8ea0b8]" role="status">
                    {tiposTrabajoDisponibles.length === 0
                      ? "No hay tipos de trabajo en el catálogo de servicios."
                      : "Ningún tipo coincide con la búsqueda."}
                  </p>
                ) : (
                  tiposFiltrados.map((tipo, idx) => {
                    const checked = filterTiposTrabajo.includes(tipo);
                    const inputId = `${panelId}-tipo-${idx}`;
                    return (
                      <label
                        key={tipo}
                        htmlFor={inputId}
                        className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                          checked
                            ? "bg-[#F1F5FF] text-[#1244D1] dark:bg-[#4B7CFF]/10 dark:text-[#4B7CFF]"
                            : "text-[#3d3d3a] hover:bg-white/80 dark:text-[#cbd5e1] dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleTipo(tipo, e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-[#D3D3D8] text-[#1B5CFF] focus:ring-[#1B5CFF] focus:ring-offset-0"
                        />
                        <span className="leading-snug break-words">{tipo}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <DatePicker
                id={datePickerId}
                label="Fecha"
                placeholder="Seleccionar fecha"
                defaultDate={filterDate || undefined}
                appendToBody
                onChange={(_dates, currentDateString: string) => {
                  setFilterDate(currentDateString || "");
                }}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA]/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#273244] dark:bg-[#0f172a]/50 sm:flex-row sm:items-center sm:pb-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={`${erpPrimaryBtnClass} min-h-11 h-11 flex-1 !w-full`}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                setTipoQuery("");
                onOpenChange(false);
              }}
              className={`${erpSecondaryBtnClass} min-h-11 h-11 flex-1 !w-full`}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
