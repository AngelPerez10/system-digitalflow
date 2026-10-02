/**
 * Barra del listado: búsqueda (con atajo «/»), filtro por tipo en pastillas
 * y orden. Todo se refleja en la URL a través de `onChange`.
 */
import { useEffect, useId, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type Ref } from "react";
import { ArrowDownUp, Loader2, Search, X } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { type ClienteTipo, TIPO_OPTIONS } from "@/components/clientes";
import {
  ORDEN_OPTIONS,
  SEARCH_MAX_LENGTH,
  normalizeSearch,
  type ClientesListQuery,
  type ClientesOrden,
} from "../shared/clientesListQuery";
import { focusRing, mutedText, tipoTone } from "../shared/clientesTokens";

const SEARCH_DEBOUNCE_MS = 350;

const searchInputClass =
  "h-11 w-full rounded-[12px] border border-[#E7E7EA] bg-white pl-10 pr-20 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#8E8E96] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.24)] [&::-webkit-search-cancel-button]:hidden";

const chipClass = (active: boolean) =>
  `cl-chip cot-press inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium ${focusRing} ${
    active
      ? "border-[#17235B] bg-[#17235B] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
      : "border-[#E7E7EA] bg-white text-[#3F3F46] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#1B2539]"
  }`;

const selectClass = `h-9 appearance-none rounded-full border border-[#E7E7EA] bg-white pl-8 pr-8 text-[13px] font-medium text-[#3F3F46] transition-colors hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:border-[#3A4661] ${focusRing}`;

type Props = {
  query: ClientesListQuery;
  /** Hay una petición en curso (se muestra junto a la búsqueda). */
  busy: boolean;
  onChange: (patch: Partial<Pick<ClientesListQuery, "q" | "tipos" | "orden">>) => void;
  /** Para enfocar la búsqueda con el atajo «/». */
  searchRef?: Ref<HTMLInputElement>;
};

export function ClientesToolbar({ query, busy, onChange, searchRef }: Props) {
  const searchId = useId();
  const hintId = useId();
  const sortId = useId();

  // Texto local para escribir sin esperar a la URL; se publica con debounce.
  const [text, setText] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);
  if (query.q !== syncedQ) {
    // La URL cambió desde fuera (Atrás, «Quitar filtros»): el campo la sigue.
    setSyncedQ(query.q);
    if (normalizeSearch(text) !== query.q) setText(query.q);
  }

  const debounced = useDebounce(text, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    // Solo publica cuando el texto ya se asentó (evita reenviar un valor viejo).
    if (debounced !== text) return;
    const next = normalizeSearch(debounced);
    if (next !== query.q) onChange({ q: next });
  }, [debounced, text, query.q, onChange]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = normalizeSearch(text);
    if (next !== query.q) onChange({ q: next });
  };

  const clear = () => {
    setText("");
    if (query.q) onChange({ q: "" });
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && text) {
      e.preventDefault();
      e.stopPropagation();
      clear();
    }
  };

  const toggleTipo = (tipo: ClienteTipo) => {
    const set = new Set(query.tipos);
    if (set.has(tipo)) set.delete(tipo);
    else set.add(tipo);
    // Todos seleccionados equivale a «sin filtro».
    const next = TIPO_OPTIONS.map((o) => o.value).filter((v) => set.has(v));
    onChange({ tipos: next.length === TIPO_OPTIONS.length ? [] : next });
  };

  const allTipos = query.tipos.length === 0;

  return (
    <div className="cot-rise flex flex-col gap-3" style={{ "--cot-i": 1 } as CSSProperties}>
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar contactos
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8E8E96] dark:text-[#8EA0B8]" aria-hidden />
        <input
          ref={searchRef}
          id={searchId}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onSearchKeyDown}
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="Buscar por nombre, teléfono, RFC, correo o ciudad…"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby={hintId}
          aria-keyshortcuts="/"
          className={searchInputClass}
        />
        <span id={hintId} className="sr-only">
          Los resultados se actualizan mientras escribes. Atajo: tecla diagonal.
        </span>
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
          {busy ? <Loader2 className="size-4 animate-spin text-[#8E8E96]" aria-hidden /> : null}
          {text ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Limpiar búsqueda"
              className={`cot-press inline-flex size-8 items-center justify-center rounded-[8px] text-[#8E8E96] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC] ${focusRing}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <kbd className="pointer-events-none mr-1.5 hidden h-6 items-center rounded-[6px] border border-[#E7E7EA] px-1.5 font-sans text-[12px] text-[#6E6E77] sm:inline-flex dark:border-[#273244] dark:text-[#8EA0B8]" aria-hidden>
              /
            </kbd>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="group"
          aria-label="Filtrar por tipo de contacto"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 no-scrollbar"
        >
          <button type="button" aria-pressed={allTipos} onClick={() => onChange({ tipos: [] })} className={chipClass(allTipos)}>
            Todos
          </button>
          {TIPO_OPTIONS.map((opt) => {
            const active = query.tipos.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTipo(opt.value)}
                className={chipClass(active)}
              >
                <span className={`cl-chip-dot size-2 rounded-full ${active ? "bg-current" : tipoTone(opt.value).dot}`} aria-hidden />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className={`text-[13px] ${mutedText}`}>
            Ordenar por
          </label>
          <div className="relative">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8E8E96]" aria-hidden />
            <select
              id={sortId}
              value={query.orden}
              onChange={(e) => onChange({ orden: e.target.value as ClientesOrden })}
              className={selectClass}
            >
              {ORDEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[#8E8E96]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
