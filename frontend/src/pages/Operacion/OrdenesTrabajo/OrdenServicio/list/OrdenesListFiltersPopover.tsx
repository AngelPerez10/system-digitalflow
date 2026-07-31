import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import DatePicker from "@/components/form/date-picker";
import {
  erpFilterBtnActiveClass,
  erpFilterBtnClass,
  erpFilterPopoverClass,
  erpFilterSectionLabelClass,
  erpFilterStatusChipClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSelectFieldClass,
} from "../../ordenTrabajoStyles";
import type { Usuario } from "../shared/ordenesPageTypes";
import type { OrdenListFilterStatus } from "../shared/useOrdenesList";

function tecnicoOptionLabel(u: Usuario): string {
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`;
  return u.username || u.email || `Usuario #${u.id}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterStatus: OrdenListFilterStatus;
  setFilterStatus: Dispatch<SetStateAction<OrdenListFilterStatus>>;
  filterServicio: string[];
  setFilterServicio: Dispatch<SetStateAction<string[]>>;
  filterDate: string;
  setFilterDate: Dispatch<SetStateAction<string>>;
  filterTecnicoId: number | null;
  setFilterTecnicoId: Dispatch<SetStateAction<number | null>>;
  serviciosDisponibles: string[];
  usuarios: Usuario[];
  activeFilterCount: number;
  onClear: () => void;
  /** Admin listado: filtrar por técnico. Técnico: oculto por defecto. */
  showTecnicoFilter?: boolean;
  datePickerId?: string;
};

const STATUS_OPTIONS: { value: OrdenListFilterStatus; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "resuelto", label: "Resuelto" },
];

export default function OrdenesListFiltersPopover({
  open,
  onOpenChange,
  filterStatus,
  setFilterStatus,
  filterServicio,
  setFilterServicio,
  filterDate,
  setFilterDate,
  filterTecnicoId,
  setFilterTecnicoId,
  serviciosDisponibles,
  usuarios,
  activeFilterCount,
  onClear,
  showTecnicoFilter = true,
  datePickerId = "filtro-fecha-ordenes",
}: Props) {
  const panelId = useId();
  const statusGroupId = useId();
  const tecnicoSelectId = useId();
  const servicioSearchId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [servicioQuery, setServicioQuery] = useState("");

  const tecnicosOrdenados = useMemo(
    () =>
      [...usuarios].sort((a, b) =>
        tecnicoOptionLabel(a).localeCompare(tecnicoOptionLabel(b), "es", { sensitivity: "base" }),
      ),
    [usuarios],
  );

  const serviciosFiltrados = useMemo(() => {
    const q = servicioQuery.trim().toLowerCase();
    if (!q) return serviciosDisponibles;
    return serviciosDisponibles.filter((s) => s.toLowerCase().includes(q));
  }, [serviciosDisponibles, servicioQuery]);

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
    if (!open) setServicioQuery("");
  }, [open]);

  const toggleServicio = (srv: string, checked: boolean) => {
    setFilterServicio((prev) => {
      if (checked) return Array.from(new Set([...(prev || []), srv]));
      return (prev || []).filter((s) => s !== srv);
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
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff801f] px-1.5 text-[10px] font-bold text-black"
            aria-label={`${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filtros del listado de órdenes"
          className={erpFilterPopoverClass}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#e7ded0] bg-[#fcfaf6]/90 px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/50">
            <div>
              <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">Filtros</p>
              <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
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
                  setServicioQuery("");
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9a3412] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 dark:text-[#fdba74]"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 custom-scrollbar">
            <fieldset>
              <legend id={statusGroupId} className={erpFilterSectionLabelClass}>
                Estado
              </legend>
              <div
                className="flex gap-1.5"
                role="group"
                aria-labelledby={statusGroupId}
              >
                {STATUS_OPTIONS.map((opt) => {
                  const active = filterStatus === opt.value;
                  return (
                    <button
                      key={opt.value || "todos"}
                      type="button"
                      aria-pressed={active}
                      className={erpFilterStatusChipClass(active)}
                      onClick={() => setFilterStatus(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {showTecnicoFilter && (
              <div>
                <label htmlFor={tecnicoSelectId} className={erpFilterSectionLabelClass}>
                  Técnico
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
                  <option value="">Todos los técnicos</option>
                  <option value="0">Sin asignar</option>
                  {tecnicosOrdenados.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {tecnicoOptionLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-end justify-between gap-2">
                <p id={`${panelId}-servicios-label`} className={`${erpFilterSectionLabelClass} !mb-0`}>
                  Servicios realizados
                </p>
                {filterServicio.length > 0 && (
                  <span className="text-[11px] font-medium text-[#9a3412] dark:text-[#fdba74]">
                    {filterServicio.length} seleccionado{filterServicio.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {serviciosDisponibles.length > 6 && (
                <label className="sr-only" htmlFor={servicioSearchId}>
                  Buscar servicio
                </label>
              )}
              {serviciosDisponibles.length > 6 && (
                <input
                  id={servicioSearchId}
                  type="search"
                  value={servicioQuery}
                  onChange={(e) => setServicioQuery(e.target.value)}
                  placeholder="Buscar servicio…"
                  className={`${erpSelectFieldClass} !h-9 mb-2`}
                  autoComplete="off"
                />
              )}
              <div
                className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/70 p-2 dark:border-[#273244] dark:bg-[#0f172a]/40"
                role="group"
                aria-labelledby={`${panelId}-servicios-label`}
              >
                {serviciosFiltrados.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
                    {serviciosDisponibles.length === 0
                      ? "No hay servicios en el catálogo."
                      : "Ningún servicio coincide con la búsqueda."}
                  </p>
                ) : (
                  serviciosFiltrados.map((srv, idx) => {
                    const checked = filterServicio.includes(srv);
                    const inputId = `${panelId}-srv-${idx}`;
                    return (
                      <label
                        key={srv}
                        htmlFor={inputId}
                        className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                          checked
                            ? "bg-[#fff4eb] text-[#9a3412] dark:bg-[#fb923c]/10 dark:text-[#fdba74]"
                            : "text-[#44403c] hover:bg-white/80 dark:text-[#cbd5e1] dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleServicio(srv, e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-[#d6d3d1] text-[#ea580c] focus:ring-[#ff801f] focus:ring-offset-0"
                        />
                        <span className="leading-snug">{srv}</span>
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

          <div className="flex items-center gap-2 border-t border-[#e7ded0] bg-[#fcfaf6]/90 px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/50">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={`${erpPrimaryBtnClass} h-10 flex-1 !w-full`}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                setServicioQuery("");
                onOpenChange(false);
              }}
              className={`${erpSecondaryBtnClass} h-10 flex-1 !w-full`}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
