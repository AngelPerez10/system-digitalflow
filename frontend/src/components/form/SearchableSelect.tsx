import {
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Label from "@/components/form/Label";
import { resolveMediaUrl } from "@/config/api";
import { cn } from "@/lib/utils";
import { shouldKeepComboboxFocusAfterCommit } from "./searchableSelectCommit";

/** Misma tipografía que Clientes / cotizaciones / modal de Órdenes. */
const selectSansStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

/** Acento eléctrico del ERP (alineado al resto del formulario de órdenes). */
const selectInputClass =
  "w-full min-h-11 rounded-[10px] border border-[#E7E7EA] bg-white py-2.5 pl-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export type SearchableSelectOption = {
  value: string;
  label: string;
  /** Prefijo en azul (p. ej. user_id Wialon); se muestra antes de `label`. */
  accentPrefix?: string;
  /** Segunda línea (teléfono, email, etc.). También entra en el filtro local. */
  description?: string;
  /** Resalta acciones como «Nuevo…» / «Crear…». */
  isAction?: boolean;
  /** Foto de perfil (técnico, usuario…). Si falta o falla la carga, se usan iniciales. */
  avatarUrl?: string;
};

type SearchableSelectProps = {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: SearchableSelectOption[];
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
  emptyMessage?: string;
  loading?: boolean;
  /**
   * Tope de filas en el DOM (PCs lentos). Default 80.
   * Si hay más coincidencias, se pide refinar la búsqueda.
   */
  maxVisibleItems?: number;
  /**
   * Debounce (ms) antes de avisar al padre con `onSearchChange`.
   * El texto del input se actualiza al instante; el fetch remoto no.
   * Default 0 (inmediato). Usar ~250–300 en combos con catálogo API.
   */
  searchDebounceMs?: number;
  /** Muestra la fila que limpia el valor. Default true. */
  allowClearOption?: boolean;
  clearOptionLabel?: string;
  /** Aria-label del botón chevron. */
  triggerAriaLabel?: string;
};

type MenuCoords = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_Z_INDEX = 100050;
const DEFAULT_MAX_VISIBLE = 80;

function optionMatchesQuery(o: SearchableSelectOption, q: string): boolean {
  return (
    o.label.toLowerCase().includes(q) ||
    o.value.toLowerCase().includes(q) ||
    (o.accentPrefix ?? "").toLowerCase().includes(q) ||
    (o.description ?? "").toLowerCase().includes(q)
  );
}

function initialFromLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Avatar circular en opciones: foto si hay URL válida; si no (o falla), iniciales. Decorativo junto al label. */
function OptionAvatar({
  label,
  avatarUrl,
  isAction,
  isSelected,
  size = "md",
}: {
  label: string;
  avatarUrl?: string;
  isAction?: boolean;
  isSelected?: boolean;
  size?: "sm" | "md";
}) {
  const [broken, setBroken] = useState(false);
  const raw = String(avatarUrl || "").trim();
  useEffect(() => {
    setBroken(false);
  }, [raw]);
  const src = raw && !broken ? resolveMediaUrl(raw) : "";
  const showPhoto = Boolean(src) && !isAction;
  const dim = size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[11px]";

  if (isAction) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide",
          dim,
          "bg-[rgba(27,92,255,0.12)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.2)] dark:text-[#4B7CFF]",
        )}
        aria-hidden
      >
        +
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-wide",
        dim,
        showPhoto
          ? "bg-[#F4F4F5] dark:bg-[#1B2539]"
          : isSelected
            ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
            : "bg-[#EEF2FF] text-[#1B5CFF] dark:bg-[#1E293B] dark:text-[#93B4FF]",
      )}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        initialFromLabel(label)
      )}
    </span>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={cn(className, open && "rotate-180")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

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
  emptyMessage = "Sin resultados. Prueba otro término.",
  loading = false,
  maxVisibleItems = DEFAULT_MAX_VISIBLE,
  searchDebounceMs = 0,
  allowClearOption = true,
  clearOptionLabel = "Quitar selección",
  triggerAriaLabel,
}: SearchableSelectProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const listboxId = `${inputId}-listbox`;
  const statusId = `${inputId}-status`;
  const labelText = typeof label === "string" ? label : "Opciones";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Dirección fijada al abrir: evita que el menú “salte” arriba/abajo al filtrar. */
  const placementRef = useRef<"up" | "down">("down");
  const searchNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Tras elegir una opción normal re-enfocamos el input (ARIA: foco en el
   * combobox). Sin este flag, `onFocus` volvería a abrir el listbox.
   */
  const suppressOpenOnFocusRef = useRef(false);

  const selected = options.find((o) => o.value === value);
  const selectedDisplay = selected
    ? selected.accentPrefix
      ? `${selected.accentPrefix} · ${selected.label}`
      : selected.label
    : "";

  const notifySearchChange = (query: string, immediate = false) => {
    if (!onSearchChange) return;
    if (searchNotifyTimerRef.current) {
      clearTimeout(searchNotifyTimerRef.current);
      searchNotifyTimerRef.current = null;
    }
    if (immediate || searchDebounceMs <= 0) {
      onSearchChange(query);
      return;
    }
    searchNotifyTimerRef.current = setTimeout(() => {
      searchNotifyTimerRef.current = null;
      onSearchChange(query);
    }, searchDebounceMs);
  };

  useEffect(() => {
    return () => {
      if (searchNotifyTimerRef.current) {
        clearTimeout(searchNotifyTimerRef.current);
        searchNotifyTimerRef.current = null;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    if (!filterLocally) return options;
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return options;
    // Acciones («Nuevo…») siempre visibles: el padre las usa como atajo.
    return options.filter((o) => o.isAction || optionMatchesQuery(o, q));
  }, [deferredSearch, options, filterLocally]);

  const visible = useMemo(
    () => filtered.slice(0, Math.max(1, maxVisibleItems)),
    [filtered, maxVisibleItems],
  );
  const truncated = filtered.length > visible.length;

  const closeMenu = () => {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  };

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    // Lista completa al abrir; el valor actual queda como placeholder hasta que escriban.
    setSearch("");
    notifySearchChange("", true);
  };

  const updateMenuPosition = (lockPlacement = false) => {
    if (!inputWrapRef.current) {
      setMenuCoords(null);
      return;
    }
    const rect = inputWrapRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const viewportCap = Math.min(360, Math.floor(window.innerHeight * 0.48));

    if (lockPlacement) {
      placementRef.current =
        spaceBelow < 180 && spaceAbove > spaceBelow ? "up" : "down";
    }

    const openUp = placementRef.current === "up";
    const maxHeight = Math.max(160, Math.min(viewportCap, openUp ? spaceAbove : spaceBelow));
    setMenuCoords(
      openUp
        ? {
            bottom: window.innerHeight - rect.top + 6,
            left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
            width: Math.min(rect.width, window.innerWidth - 16),
            maxHeight,
          }
        : {
            top: rect.bottom + 6,
            left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
            width: Math.min(rect.width, window.innerWidth - 16),
            maxHeight,
          },
    );
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuCoords(null);
      return;
    }
    updateMenuPosition(true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, truncated, loading]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleViewportChange = (event?: Event) => {
      // No reposicionar al scrollear la propia lista (evita que el menú “salte” arriba/abajo).
      if (event?.type === "scroll" && event.target instanceof Node && menuRef.current?.contains(event.target)) {
        return;
      }
      updateMenuPosition();
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((prev) => {
      if (visible.length === 0) return -1;
      if (prev < 0) {
        const selectedIdx = visible.findIndex((o) => o.value === value);
        return selectedIdx >= 0 ? selectedIdx : 0;
      }
      return Math.min(prev, visible.length - 1);
    });
  }, [open, visible, value]);

  const scrollActiveOptionIntoView = (index: number) => {
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  };

  const commitOption = (next: string) => {
    const selectedOption = options.find((o) => o.value === next);
    onChange(next);
    closeMenu();
    if (!shouldKeepComboboxFocusAfterCommit(selectedOption)) {
      // Acciones como «Nuevo Cliente» abren otro modal: no re-enfocar o el
      // listbox (portal z>modal) se reabre encima del diálogo.
      inputRef.current?.blur();
      return;
    }
    suppressOpenOnFocusRef.current = true;
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((i) => {
        if (visible.length === 0) return -1;
        const next = i < 0 ? 0 : Math.min(i + 1, visible.length - 1);
        requestAnimationFrame(() => scrollActiveOptionIntoView(next));
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((i) => {
        if (visible.length === 0) return -1;
        const next = i <= 0 ? 0 : i - 1;
        requestAnimationFrame(() => scrollActiveOptionIntoView(next));
        return next;
      });
      return;
    }

    if (e.key === "Home" && open) {
      e.preventDefault();
      if (visible.length) {
        setActiveIndex(0);
        requestAnimationFrame(() => scrollActiveOptionIntoView(0));
      }
      return;
    }

    if (e.key === "End" && open) {
      e.preventDefault();
      if (visible.length) {
        const last = visible.length - 1;
        setActiveIndex(last);
        requestAnimationFrame(() => scrollActiveOptionIntoView(last));
      }
      return;
    }

    if (e.key === "Enter" && open) {
      e.preventDefault();
      if (activeIndex >= 0 && visible[activeIndex]) {
        commitOption(visible[activeIndex].value);
      }
      return;
    }
  };

  const statusText = loading
    ? "Buscando…"
    : open
      ? truncated
        ? `${filtered.length} coincidencias; mostrando ${visible.length}. Refina la búsqueda.`
        : `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`
      : "";

  const activeOptionId =
    open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  const chevronLabel = triggerAriaLabel || (open ? `Cerrar lista de ${labelText}` : `Mostrar lista de ${labelText}`);

  const menu =
    open && menuCoords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={labelText}
            className="fixed overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-[#E7E7EA] bg-white p-1.5 shadow-[0_20px_48px_-18px_rgba(9,9,11,0.42)] dark:border-[#273244] dark:bg-[#0F172A] dark:shadow-[0_20px_48px_-18px_rgba(0,0,0,0.65)]"
            style={{
              top: menuCoords.top,
              bottom: menuCoords.bottom,
              left: menuCoords.left,
              width: menuCoords.width,
              maxHeight: menuCoords.maxHeight,
              zIndex: MENU_Z_INDEX,
              ...selectSansStyle,
            }}
          >
            {allowClearOption && value ? (
              <button
                type="button"
                onClick={() => commitOption("")}
                className="mb-1 flex w-full min-h-11 items-center gap-2 rounded-lg px-2.5 text-left text-sm text-[#6E6E77] hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:bg-white/6"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] dark:bg-white/6">
                  <ClearIcon className="h-3.5 w-3.5" />
                </span>
                <span>{clearOptionLabel}</span>
              </button>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-[#6E6E77] dark:text-[#8EA0B8]" role="status">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1B5CFF]/25 border-t-[#1B5CFF] motion-reduce:animate-none" aria-hidden />
                Buscando…
              </div>
            ) : null}

            {!loading &&
              visible.map((o, index) => {
                const isSelected = Boolean(value) && o.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={o.value}
                    id={`${listboxId}-opt-${index}`}
                    type="button"
                    role="option"
                    data-option-index={index}
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commitOption(o.value)}
                    className={cn(
                      "flex w-full min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40",
                      isSelected && "bg-[rgba(27,92,255,0.10)] dark:bg-[rgba(75,124,255,0.16)]",
                      isActive && !isSelected && "bg-[#F1F5FF] dark:bg-white/8",
                      !isSelected && !isActive && "hover:bg-[#F8FAFC] dark:hover:bg-white/4",
                    )}
                  >
                    <OptionAvatar
                      label={o.label}
                      avatarUrl={o.avatarUrl}
                      isAction={o.isAction}
                      isSelected={isSelected}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[14px] leading-5",
                          isSelected || o.isAction
                            ? "font-medium text-[#1B5CFF] dark:text-[#4B7CFF]"
                            : "font-medium text-[#09090B] dark:text-[#F8FAFC]",
                        )}
                      >
                        {o.accentPrefix ? (
                          <>
                            <span className="font-mono tabular-nums">{o.accentPrefix}</span>
                            <span className="text-[#A1A1AA] dark:text-[#8EA0B8]"> · </span>
                          </>
                        ) : null}
                        {o.label}
                      </span>
                      {o.description ? (
                        <span className="mt-0.5 block truncate text-[12px] leading-4 text-[#6E6E77] dark:text-[#8EA0B8]">
                          {o.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <CheckIcon className="h-4 w-4 shrink-0 text-[#1B5CFF] dark:text-[#4B7CFF]" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                );
              })}

            {!loading && visible.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E2E8F0]">Sin coincidencias</p>
                <p className="mt-1 text-xs text-[#6E6E77] dark:text-[#8EA0B8]">{emptyMessage}</p>
              </div>
            ) : null}

            {!loading && truncated ? (
              <div className="mt-1 border-t border-[#E7E7EA] px-2.5 py-2 text-center text-[11px] text-[#6E6E77] dark:border-[#273244] dark:text-[#8EA0B8]">
                Mostrando {visible.length} de {filtered.length}. Escribe para filtrar.
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="min-w-0 w-full" ref={rootRef} style={selectSansStyle}>
      <Label
        htmlFor={inputId}
        className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]"
      >
        {label}
        {required ? (
          <span className="text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <div className="relative" ref={inputWrapRef}>
        <span
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2",
            !selected || open || selected.isAction
              ? cn("text-[#A1A1AA] dark:text-[#8EA0B8]", open && "text-[#1B5CFF] dark:text-[#4B7CFF]")
              : null,
          )}
          aria-hidden
        >
          {!open && selected && !selected.isAction ? (
            <OptionAvatar label={selected.label} avatarUrl={selected.avatarUrl} isSelected size="sm" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={open ? search : selectedDisplay}
          onChange={(e) => {
            const next = e.target.value;
            setSearch(next);
            setOpen(true);
            setActiveIndex(0);
            notifySearchChange(next);
          }}
          onFocus={() => {
            if (disabled) return;
            if (suppressOpenOnFocusRef.current) {
              suppressOpenOnFocusRef.current = false;
              return;
            }
            openMenu();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            open && selectedDisplay
              ? selectedDisplay
              : placeholder || "Buscar…"
          }
          className={cn(
            selectInputClass,
            allowClearOption && value ? "pr-20" : "pr-12",
            invalid && "border-[#C22B2B] focus:border-[#C22B2B] focus:ring-[rgba(194,43,43,0.18)]",
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-busy={loading || undefined}
          aria-describedby={[describedBy, statusId].filter(Boolean).join(" ") || undefined}
        />
        <div className="absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5">
          {allowClearOption && value && !disabled ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Limpiar selección"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitOption("");
                notifySearchChange("", true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#52525B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-white/6 dark:hover:text-[#E2E8F0]"
            >
              <ClearIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            tabIndex={-1}
            aria-label={chevronLabel}
            aria-expanded={open}
            aria-controls={listboxId}
            disabled={disabled}
            onMouseDown={(e) => {
              // Evita blur del input antes del toggle.
              e.preventDefault();
            }}
            onClick={() => {
              if (disabled) return;
              if (open) {
                closeMenu();
                return;
              }
              openMenu();
              inputRef.current?.focus();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6E6E77] hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-50 dark:text-[#8EA0B8] dark:hover:bg-white/6 dark:hover:text-[#F8FAFC]"
          >
            <ChevronIcon open={open} className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div id={statusId} className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {statusText}
      </div>
      {menu}
    </div>
  );
}
