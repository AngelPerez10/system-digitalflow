import { useEffect, useId, useState } from "react";
import { listInventarioItems } from "@/pages/Inventario/shared/inventarioApi";
import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import InventarioThumb from "@/pages/Inventario/components/InventarioThumb";
import { erpInputLikeClass } from "@/layout/erpPageStyles";
import useDebounce from "@/hooks/use-debounce";

const MSG_NO_PERMISO = "Necesitas permiso de inventario para buscar productos.";
const MIN_SEARCH_CHARS = 2;

type Props = {
  onPick: (item: InventarioItem) => void;
  disabled?: boolean;
};

function isForbiddenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 403) return true;
  const msg = err instanceof Error ? err.message : "";
  return /permission|permiso|403/i.test(msg);
}

/**
 * Buscador de inventario (solo admin). No mueve stock hasta marcar Entregado.
 * Acepta nombre, marca, modelo o código de barras (EAN / SKU).
 */
export function OrdenInventarioPicker({ onPick, disabled = false }: Props) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [immediateSearch, setImmediateSearch] = useState<string | null>(null);
  const activeQuery = immediateSearch ?? debouncedSearch;
  const [results, setResults] = useState<InventarioItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    // Al terminar el debounce, soltar la búsqueda forzada por Enter.
    if (immediateSearch !== null && debouncedSearch === immediateSearch) {
      setImmediateSearch(null);
    }
  }, [debouncedSearch, immediateSearch]);

  useEffect(() => {
    if (disabled) return;
    const q = activeQuery;
    if (q.length < MIN_SEARCH_CHARS) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError("");
    void (async () => {
      try {
        const page = await listInventarioItems({ search: q, page_size: 10 });
        if (cancelled) return;
        setResults(Array.isArray(page.results) ? page.results : []);
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setError(isForbiddenError(err) ? MSG_NO_PERMISO : "No se pudo buscar en inventario.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeQuery, disabled]);

  const handlePick = (item: InventarioItem) => {
    onPick(item);
    setInfo(`Agregado: ${item.nombre || item.modelo || item.codigo_barras}`);
    setError("");
    setSearch("");
    setImmediateSearch(null);
    setResults([]);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]/40">
      <div className="border-b border-[#efe9de] px-4 py-3 dark:border-[#1e293b]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c]">
          Inventario
        </p>
        <h4 className="mt-0.5 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
          Agregar producto
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
          Busca por código de barras, modelo, marca o nombre. El stock solo baja al marcar Entregado.
        </p>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <label
            htmlFor={searchId}
            className="mb-1.5 block text-xs font-semibold text-[#57534e] dark:text-[#cbd5e1]"
          >
            Buscar producto
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            disabled={disabled}
            onChange={(e) => {
              setSearch(e.target.value);
              setImmediateSearch(null);
              setError("");
              setInfo("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const q = search.trim();
              if (q.length >= MIN_SEARCH_CHARS) {
                setImmediateSearch(q);
              }
            }}
            placeholder="Código, modelo o nombre…"
            className={erpInputLikeClass}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        {error ? (
          <p className="text-sm text-[#c64545]" role="alert">
            {error}
          </p>
        ) : null}
        {info && !error ? (
          <p className="text-sm text-[#5db872]" role="status" aria-live="polite">
            {info}
          </p>
        ) : null}

        {searching ? (
          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
            Buscando…
          </p>
        ) : null}

        {!searching && activeQuery.length >= MIN_SEARCH_CHARS && results.length === 0 && !error ? (
          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
            Sin resultados para «{activeQuery}». Prueba el código de barras o el modelo exacto.
          </p>
        ) : null}

        {results.length > 0 ? (
          <ul
            className="max-h-56 divide-y divide-[#efe9de] overflow-y-auto rounded-xl border border-[#e7ded0] bg-white dark:divide-[#1e293b] dark:border-[#334155] dark:bg-[#0b1220]"
            role="listbox"
            aria-label="Resultados de inventario"
          >
            {results.map((item) => {
              const label = item.nombre || item.modelo || item.codigo_barras;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    disabled={disabled}
                    onClick={() => handlePick(item)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#fff4eb]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff801f]/35 disabled:opacity-50 dark:hover:bg-[#111a2b]/80"
                  >
                    <InventarioThumb src={item.imagen_url} alt={label} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                        {[item.marca, item.modelo, item.codigo_barras].filter(Boolean).join(" · ")}
                        {" · "}
                        Stock {item.cantidad}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-[#ea580c] dark:text-[#fb923c]">
                      Agregar
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
