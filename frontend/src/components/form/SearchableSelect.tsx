import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Label from "@/components/form/Label";
import { erpInputLikeClass } from "@/layout/erpPageStyles";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type SearchableSelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
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
  onSearchChange,
  filterLocally = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!filterLocally) return options;
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
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
            role="listbox"
            className="fixed overflow-auto rounded-xl border border-[#e2d9ca] bg-white shadow-lg dark:border-[#334155] dark:bg-[#111a2b]"
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
              className="w-full px-3 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              {placeholder || "Seleccionar..."}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setSearch("");
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/5",
                  o.value === value
                    ? "bg-[#ff801f]/10 font-medium text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]"
                    : "text-gray-700 dark:text-gray-200"
                )}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-center text-xs text-gray-400 dark:text-gray-500">
                Sin resultados
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="min-w-0 w-full" ref={rootRef}>
      <Label className="!mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:!text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative" ref={inputWrapRef}>
        <input
          type="text"
          value={open ? search : selected?.label || ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            onSearchChange?.(e.target.value);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder || "Buscar..."}
          className={erpInputLikeClass}
          readOnly={!open}
          aria-expanded={open}
          aria-haspopup="listbox"
        />
      </div>
      {menu}
    </div>
  );
}
