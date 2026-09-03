import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Label from "@/components/form/Label";
import { cn } from "@/lib/utils";

/** Acento eléctrico del ERP (no naranja legado de erpPageStyles). */
const selectInputClass =
  "w-full min-h-[44px] rounded-[10px] border border-[#E7E7EA] bg-white px-3.5 py-2 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:py-2.5";

const optionSelectedClass =
  "bg-[rgba(27,92,255,0.10)] font-medium text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]";

type Option = {
  value: string;
  label: string;
  /** Prefijo en azul (p. ej. user_id Wialon); se muestra antes de `label`. */
  accentPrefix?: string;
};

type SearchableSelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  /** Búsqueda remota: el padre actualiza `options` según el texto. */
  onSearchChange?: (query: string) => void;
  /** Si es false, no filtra localmente (options ya vienen filtradas). Default true. */
  filterLocally?: boolean;
};

type MenuCoords = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

/** Por encima del Modal (z-99999) para que el listado no quede oculto. */
const MENU_Z_INDEX = 100050;

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  required,
  placeholder,
  id,
  invalid,
  describedBy,
  onSearchChange,
  filterLocally = true,
}: SearchableSelectProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const selectedDisplay = selected
    ? selected.accentPrefix
      ? `${selected.accentPrefix} · ${selected.label}`
      : selected.label
    : "";

  const filtered = useMemo(() => {
    if (!filterLocally) return options;
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.accentPrefix ?? "").toLowerCase().includes(q)
    );
  }, [search, options, filterLocally]);

  const updateMenuPosition = () => {
    if (!inputWrapRef.current) {
      setMenuCoords(null);
      return;
    }
    const rect = inputWrapRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const preferred = Math.min(280, 48 + Math.max(filtered.length, 1) * 40);
    const openUp = spaceBelow < Math.min(preferred, 160) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : spaceBelow));
    setMenuCoords(
      openUp
        ? {
            bottom: window.innerHeight - rect.top + 4,
            left: rect.left,
            width: rect.width,
            maxHeight,
          }
        : {
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            maxHeight,
          }
    );
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuCoords(null);
      return;
    }
    updateMenuPosition();
    // filtered.length cambia al buscar; reposicionar altura
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateMenuPosition lee filtered.length vía closure fresco
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleViewportChange = () => {
      updateMenuPosition();
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleViewportChange);
    // Solo scroll de ventanas/ancestros — no cerrar al scrollear el propio menú
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length]);

  const menu =
    open && menuCoords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            className="fixed overflow-auto rounded-[10px] border border-[#E7E7EA] bg-white shadow-lg dark:border-[#273244] dark:bg-[#111827]"
            style={{
              top: menuCoords.top,
              bottom: menuCoords.bottom,
              left: menuCoords.left,
              width: menuCoords.width,
              maxHeight: menuCoords.maxHeight,
              zIndex: MENU_Z_INDEX,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setOpen(false);
              }}
              className="w-full min-h-[44px] px-3 py-2.5 text-left text-sm text-[#A1A1AA] hover:bg-[#F1F5FF] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06]"
            >
              — Seleccionar —
            </button>
            {filtered.map((o) => {
              const isSelected = Boolean(value) && o.value === value;
              return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(o.value);
                  setSearch("");
                  setOpen(false);
                }}
                className={cn(
                  "w-full min-h-[44px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F1F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-white/[0.06]",
                  isSelected
                    ? optionSelectedClass
                    : "text-[#09090B] dark:text-[#F8FAFC]"
                )}
              >
                {o.accentPrefix ? (
                  <>
                    <span className="font-mono tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]">
                      {o.accentPrefix}
                    </span>
                    <span className="text-[#A1A1AA] dark:text-[#8EA0B8]"> · </span>
                    <span>{o.label}</span>
                  </>
                ) : (
                  o.label
                )}
              </button>
              );
            })}
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-center text-xs text-[#A1A1AA] dark:text-[#8EA0B8]">
                Sin resultados
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="min-w-0 w-full" ref={rootRef}>
      <Label
        htmlFor={inputId}
        className="!mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:!text-xs"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative" ref={inputWrapRef}>
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          value={open ? search : selectedDisplay}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            onSearchChange?.(e.target.value);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
            onSearchChange?.("");
          }}
          disabled={disabled}
          placeholder={placeholder || "Buscar..."}
          className={selectInputClass}
          readOnly={!open}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      </div>
      {menu}
    </div>
  );
}
