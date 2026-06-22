import { useEffect, useMemo, useRef, useState } from "react";
import Label from "@/components/form/Label";
import { erpInputLikeClass } from "@/layout/erpPageStyles";

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
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!filterLocally) return options;
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [search, options, filterLocally]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div>
      <Label className="!mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:!text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative" ref={ref}>
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
        />
        {open && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[#e2d9ca] bg-white shadow-lg dark:border-[#334155] dark:bg-[#111a2b]">
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
                onClick={() => {
                  onChange(o.value);
                  setSearch("");
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/5 ${
                  o.value === value
                    ? "bg-[#ff801f]/10 font-medium text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2.5 text-center text-xs text-gray-400 dark:text-gray-500">
                Sin resultados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
