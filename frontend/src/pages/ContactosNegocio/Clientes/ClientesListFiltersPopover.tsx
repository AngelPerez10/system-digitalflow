import { useEffect, useId, useRef, type Dispatch, type SetStateAction } from "react";
import type { ClienteTipo } from "@/components/clientes/clienteFormShared";
import { TIPO_OPTIONS } from "@/components/clientes/clienteFormShared";
import {
  erpFilterBtnActiveClass,
  erpFilterBtnClass,
  erpFilterPopoverClass,
  erpFilterSectionLabelClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
} from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterTipos: ClienteTipo[];
  setFilterTipos: Dispatch<SetStateAction<ClienteTipo[]>>;
  activeFilterCount: number;
  onClear: () => void;
};

const filterPanelClass = `${erpFilterPopoverClass} max-sm:!fixed max-sm:!inset-x-3 max-sm:!bottom-3 max-sm:!top-auto max-sm:!mt-0 max-sm:!w-auto max-sm:!max-h-[min(85dvh,36rem)]`;

export default function ClientesListFiltersPopover({
  open,
  onOpenChange,
  filterTipos,
  setFilterTipos,
  activeFilterCount,
  onClear,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

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
      const target = e.target as Node | null;
      if (target && !rootRef.current.contains(target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  const toggleTipo = (tipo: ClienteTipo, checked: boolean) => {
    setFilterTipos((prev) => {
      if (checked) return Array.from(new Set([...(prev || []), tipo]));
      return (prev || []).filter((t) => t !== tipo);
    });
  };

  return (
    <div className={`relative w-full sm:w-auto ${open ? "z-100" : "z-0"}`} ref={rootRef}>
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

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filtros del listado de contactos"
          className={filterPanelClass}
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
                onClick={onClear}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 custom-scrollbar">
            <div>
              <div className="mb-2 flex items-end justify-between gap-2">
                <p id={`${panelId}-tipos-label`} className={`${erpFilterSectionLabelClass} mb-0!`}>
                  Tipo de contacto
                </p>
                {activeFilterCount > 0 && (
                  <span className="text-[11px] font-medium text-[#1244D1] dark:text-[#4B7CFF]">
                    {activeFilterCount} seleccionado{activeFilterCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div
                className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border border-[#E7E7EA] bg-[#FAFAFA]/70 p-2 dark:border-[#273244] dark:bg-[#0f172a]/40"
                role="group"
                aria-labelledby={`${panelId}-tipos-label`}
              >
                {TIPO_OPTIONS.map((opt) => {
                  const checked = filterTipos.includes(opt.value);
                  const inputId = `${panelId}-tipo-${opt.value}`;
                  return (
                    <label
                      key={opt.value}
                      htmlFor={inputId}
                      className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        checked
                          ? "bg-[#F1F5FF] text-[#1244D1] dark:bg-[#4B7CFF]/10 dark:text-[#4B7CFF]"
                          : "text-[#3d3d3a] hover:bg-white/80 dark:text-[#cbd5e1] dark:hover:bg-white/4"
                      }`}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleTipo(opt.value, e.target.checked)}
                        className="h-4 w-4 shrink-0 rounded border-[#D3D3D8] text-[#1B5CFF] focus:ring-[#1B5CFF] focus:ring-offset-0"
                      />
                      <span className="leading-snug">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA]/90 px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/50">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={`${erpPrimaryBtnClass} h-10 flex-1 w-full!`}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                onOpenChange(false);
              }}
              className={`${erpSecondaryBtnClass} h-10 flex-1 w-full!`}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
