import { useEffect, useId, useMemo, useRef, useState } from "react";
import { erpInputLikeClass } from "@/layout/erpPageStyles";
import type { ProyectoTipoTrabajo } from "../../shared/proyectoTypes";

type ServicioOpcion = { id: number; nombre: string };

type Props = {
  label?: string;
  value: ProyectoTipoTrabajo[];
  onChange: (next: ProyectoTipoTrabajo[]) => void;
  servicios: ServicioOpcion[];
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Multi-select de tipos de trabajo (servicios), alineado al patrón de cotizaciones.
 */
export function ProyectoTiposTrabajoField({
  label = "Tipo de trabajo",
  value,
  onChange,
  servicios,
  disabled = false,
  placeholder = "Buscar y seleccionar servicios…",
}: Props) {
  const listboxId = useId();
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);

  const display = useMemo(() => {
    if (value.length === 0) return "";
    const names = value.map((t) => t.nombre || servicios.find((s) => s.id === t.id)?.nombre || `#${t.id}`);
    if (names.length <= 2) return names.join(", ");
    return `${value.length} servicios seleccionados`;
  }, [value, servicios]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return servicios;
    return servicios.filter(
      (s) => s.nombre.toLowerCase().includes(q) || String(s.id).includes(q)
    );
  }, [search, servicios]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (servicio: ServicioOpcion) => {
    if (disabled) return;
    if (selectedIds.has(servicio.id)) {
      onChange(value.filter((t) => t.id !== servicio.id));
      return;
    }
    onChange([...value, { id: servicio.id, nombre: servicio.nombre }]);
  };

  return (
    <div>
      <p
        id={labelId}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:text-xs"
      >
        {label}
      </p>
      <div className="relative" ref={ref}>
        <button
          type="button"
          className={`${erpInputLikeClass} flex w-full items-center justify-between gap-2 text-left ${
            disabled ? "cursor-not-allowed opacity-70" : ""
          }`}
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
            setSearch("");
          }}
        >
          <span
            className={
              value.length === 0
                ? "truncate text-[#a8a29e] dark:text-[#8ea0b8]"
                : "truncate text-[#1c1917] dark:text-[#e5e7eb]"
            }
          >
            {open ? search || placeholder : display || placeholder}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && !disabled ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[#e2d9ca] bg-white shadow-lg dark:border-[#334155] dark:bg-[#111a2b]">
            <div className="border-b border-[#e2d9ca] p-2 dark:border-[#334155]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar servicios…"
                className={erpInputLikeClass}
                aria-label="Filtrar tipos de trabajo"
                autoFocus
              />
            </div>
            <ul
              id={listboxId}
              role="listbox"
              aria-multiselectable
              aria-labelledby={labelId}
              className="max-h-56 overflow-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin resultados</li>
              ) : (
                filtered.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <li key={s.id} role="option" aria-selected={checked}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1c1917] hover:bg-[#fff4eb] dark:text-[#e5e7eb] dark:hover:bg-[#ff801f]/10"
                        onClick={() => toggle(s)}
                      >
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "border-[#ff801f] bg-[#ff801f] text-white"
                              : "border-[#d6d3d1] dark:border-[#475569]"
                          }`}
                          aria-hidden
                        >
                          {checked ? (
                            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor">
                              <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="min-w-0 truncate">{s.nombre}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {value.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-t border-[#e2d9ca] p-2 dark:border-[#334155]">
                {value.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#ff801f]/15 px-2 py-0.5 text-[11px] font-medium text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]"
                  >
                    <span className="truncate">{t.nombre || `#${t.id}`}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-0.5 hover:bg-[#ff801f]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40"
                      aria-label={`Quitar ${t.nombre || t.id}`}
                      onClick={() => onChange(value.filter((x) => x.id !== t.id))}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden>
                        <path d="M3 3l6 6M9 3L3 9" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
