import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PROYECTO_TIPOS_TRABAJO_FIELD_ID } from "../../shared/proyectoOperacionValidation";
import { Check, ChevronDown, X } from "lucide-react";
import { fieldError, fieldLabel, focusRing, input, inputInvalid, requiredMark } from "../../shared/proyectoTokens";
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
            className="cot-pop fixed overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white shadow-[0_20px_48px_-18px_rgba(9,9,11,0.42)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_20px_48px_-18px_rgba(0,0,0,0.65)]"
            style={{
              top: menuCoords.top,
              left: menuCoords.left,
              width: menuCoords.width,
              maxHeight: menuCoords.maxHeight,
              zIndex: MENU_Z_INDEX,
              fontFamily: "Geist, Outfit, system-ui, sans-serif",
            }}
          >
            <div className="border-b border-[#F0F0F2] p-2 dark:border-[#1F2A3C]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar servicios…"
                className={`${input} h-10!`}
                aria-label="Filtrar tipos de trabajo"
                autoFocus
              />
            </div>
            <ul
              id={listboxId}
              role="listbox"
              aria-multiselectable
              aria-labelledby={labelId}
              className="max-h-56 overflow-auto p-1"
              style={{ maxHeight: Math.max(120, menuCoords.maxHeight - (value.length > 0 ? 108 : 60)) }}
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Sin resultados</li>
              ) : (
                filtered.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <li key={s.id} role="option" aria-selected={checked}>
                      <button
                        type="button"
                        className={`flex min-h-10 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 ${checked ? "bg-[#F5F8FF] font-medium text-[#1244D1] dark:bg-[#1B2A63]/50 dark:text-[#C9D7FF]" : "text-[#18181B] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/[0.04]"}`}
                        onClick={() => toggle(s)}
                      >
                        <span
                          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
                            checked
                              ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                              : "border-[#D3D3D8] dark:border-[#3A4661]"
                          }`}
                          aria-hidden
                        >
                          {checked ? <Check className="cot-tick size-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 truncate">{s.nombre}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {value.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-t border-[#F0F0F2] p-2 dark:border-[#1F2A3C]">
                {value.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex h-7 max-w-full items-center gap-0.5 rounded-full bg-[#EEF3FF] pl-2.5 text-[12px] font-medium text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#C9D7FF]"
                  >
                    <span className="truncate">{t.nombre || `#${t.id}`}</span>
                    <button
                      type="button"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-[#1B5CFF]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40"
                      aria-label={`Quitar ${t.nombre || t.id}`}
                      onClick={() => onChange(value.filter((x) => x.id !== t.id))}
                    >
                      <X className="size-3" aria-hidden />
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
      <p id={labelId} className={fieldLabel}>
        {label}
        {required ? (
          <span className={requiredMark} aria-hidden>
            *
          </span>
        ) : null}
      </p>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={PROYECTO_TIPOS_TRABAJO_FIELD_ID}
          className={`${input} flex h-auto! min-h-11 items-center justify-between gap-2 py-1.5 text-left ${focusRing} ${
            disabled ? "cursor-not-allowed bg-[#FAFAFA] dark:bg-[#111827]" : "cursor-pointer"
          } ${error ? inputInvalid : ""} ${open ? "border-[#1B5CFF]! ring-4 ring-[rgba(27,92,255,0.14)]" : ""}`}
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
          {value.length === 0 ? (
            <span className="truncate text-[#A1A1AA] dark:text-[#64748B]">{placeholder}</span>
          ) : (
            <span className="flex min-w-0 flex-wrap gap-1.5" aria-label={display}>
              {value.map((t) => (
                <span
                  key={t.id}
                  className="cot-pop inline-flex h-7 max-w-[14rem] items-center rounded-full bg-[#EEF3FF] px-2.5 text-[13px] font-medium text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#C9D7FF]"
                >
                  <span className="truncate">{t.nombre || servicios.find((s) => s.id === t.id)?.nombre || `#${t.id}`}</span>
                </span>
              ))}
            </span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {menu}
      </div>
      {error ? (
        <p
          id={`${PROYECTO_TIPOS_TRABAJO_FIELD_ID}-error`}
          className={fieldError}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
