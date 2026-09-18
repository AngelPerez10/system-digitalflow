import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { erpInputLikeClass } from "../../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { PROYECTO_TIPOS_TRABAJO_FIELD_ID } from "../../shared/proyectoOperacionValidation";
import { proyectoFieldLabelClass } from "../../shared/proyectoPageStyles";
import type { ProyectoTipoTrabajo } from "../../shared/proyectoTypes";

type ServicioOpcion = { id: number; nombre: string };

type Props = {
  label?: string;
  value: ProyectoTipoTrabajo[];
  onChange: (next: ProyectoTipoTrabajo[]) => void;
  servicios: ServicioOpcion[];
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
};

type MenuCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

/** Por encima del modal ERP (z-99999) y del scroll interno. */
const MENU_Z_INDEX = 100050;

/**
 * Multi-select de tipos de trabajo (servicios), alineado al patrón de cotizaciones.
 * El listado se porta a `document.body` para no quedar recortado por
 * `overflow-hidden` del shell ni por el scroll del modal.
 */
export function ProyectoTiposTrabajoField({
  label = "Tipo de trabajo",
  value,
  onChange,
  servicios,
  disabled = false,
  placeholder = "Buscar y seleccionar servicios…",
  required = false,
  error = "",
}: Props) {
  const listboxId = useId();
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) {
      setMenuCoords(null);
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const preferred = Math.min(320, Math.floor(window.innerHeight * 0.45));
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(preferred, openUp ? spaceAbove : spaceBelow));
    setMenuCoords({
      top: openUp ? Math.max(8, rect.top - gap - maxHeight) : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuCoords(null);
      return;
    }
    updateMenuPosition();
  }, [open, filtered.length, value.length]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onViewport = () => updateMenuPosition();

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [open]);

  const toggle = (servicio: ServicioOpcion) => {
    if (disabled) return;
    if (selectedIds.has(servicio.id)) {
      onChange(value.filter((t) => t.id !== servicio.id));
      return;
    }
    onChange([...value, { id: servicio.id, nombre: servicio.nombre }]);
  };

  const menu =
    open && !disabled && menuCoords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed overflow-hidden rounded-xl border border-[#E7E7EA] bg-white shadow-[0_20px_48px_-18px_rgba(9,9,11,0.42)] dark:border-[#334155] dark:bg-[#111a2b] dark:shadow-[0_20px_48px_-18px_rgba(0,0,0,0.65)]"
            style={{
              top: menuCoords.top,
              left: menuCoords.left,
              width: menuCoords.width,
              maxHeight: menuCoords.maxHeight,
              zIndex: MENU_Z_INDEX,
              fontFamily: "Geist, Outfit, system-ui, sans-serif",
            }}
          >
            <div className="border-b border-[#E7E7EA] p-2 dark:border-[#334155]">
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
              style={{ maxHeight: Math.max(120, menuCoords.maxHeight - (value.length > 0 ? 108 : 60)) }}
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
                        className="flex w-full min-h-11 items-center gap-2 px-3 py-2 text-left text-sm text-[#09090B] hover:bg-[#F1F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 dark:text-[#e5e7eb] dark:hover:bg-[#1B5CFF]/10"
                        onClick={() => toggle(s)}
                      >
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "border-[#1B5CFF] bg-[#1B5CFF] text-white"
                              : "border-[#D3D3D8] dark:border-[#475569]"
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
              <div className="flex flex-wrap gap-1.5 border-t border-[#E7E7EA] p-2 dark:border-[#334155]">
                {value.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#1B5CFF]/15 px-2 py-0.5 text-[11px] font-medium text-[#1244D1] dark:menu-dropdown-badge-active dark:text-[#4B7CFF]"
                  >
                    <span className="truncate">{t.nombre || `#${t.id}`}</span>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-[#1B5CFF]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40"
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
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef}>
      <p id={labelId} className={proyectoFieldLabelClass}>
        {label}
        {required ? (
          <span className="text-rose-600" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </p>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={PROYECTO_TIPOS_TRABAJO_FIELD_ID}
          className={`${erpInputLikeClass} flex w-full items-center justify-between gap-2 text-left ${
            disabled ? "cursor-not-allowed opacity-70" : ""
          } ${error ? "border-rose-400 dark:border-rose-500/60" : ""}`}
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${PROYECTO_TIPOS_TRABAJO_FIELD_ID}-error` : undefined}
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
                : "truncate text-[#09090B] dark:text-[#e5e7eb]"
            }
          >
            {display || placeholder}
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
        {menu}
      </div>
      {error ? (
        <p
          id={`${PROYECTO_TIPOS_TRABAJO_FIELD_ID}-error`}
          className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
