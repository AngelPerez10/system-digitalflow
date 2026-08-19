import { useEffect, useId, useState } from "react";
import { listInventarioItems } from "@/pages/Inventario/shared/inventarioApi";
import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import InventarioThumb from "@/pages/Inventario/components/InventarioThumb";
import { SearchIcon } from "@/pages/Inventario/components/inventarioIcons";
import { erpInputLikeClass } from "@/layout/erpPageStyles";
import useDebounce from "@/hooks/use-debounce";
import {
  catalogFuenteLabel,
  registrarCatalogoComoInventario,
  searchProductosPageCatalog,
  type CatalogoProductoOrden,
} from "./ordenCatalogoSearch";

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

function fuenteBadgeClass(fuente: CatalogoProductoOrden["fuente"]): string {
  if (fuente === "syscom") {
    return "bg-[#181715] text-[#faf9f5]";
  }
  if (fuente === "tvc") {
    return "bg-[#1e3a5f] text-[#f8fafc]";
  }
  return "bg-[#efe9de] text-[#141413] dark:bg-[#334155] dark:text-[#f8fafc]";
}

function SearchSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 motion-safe:animate-spin rounded-full border-2 border-[#ff801f] border-r-transparent dark:border-[#fb923c] dark:border-r-transparent ${className}`}
      aria-hidden
    />
  );
}

type SearchPhase = "almacen" | "catalogo";

const SEARCH_SOURCES: Array<{
  id: "almacen" | "syscom" | "tvc" | "manual";
  label: string;
}> = [
  { id: "almacen", label: "Almacén" },
  { id: "syscom", label: "SYSCOM" },
  { id: "tvc", label: "TVC" },
  { id: "manual", label: "Manual" },
];

function sourceState(
  id: (typeof SEARCH_SOURCES)[number]["id"],
  phase: SearchPhase,
): "done" | "active" | "wait" {
  if (id === "almacen") return phase === "catalogo" ? "done" : "active";
  return phase === "catalogo" ? "active" : "wait";
}

function sourceStateLabel(state: "done" | "active" | "wait"): string {
  if (state === "done") return "Revisado";
  if (state === "active") return "En curso";
  return "En espera";
}

function SearchSkeletonRows() {
  return (
    <ul className="divide-y divide-[#efe9de] dark:divide-[#1e293b]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex min-h-11 items-center gap-3 px-3 py-2.5">
          <span
            className="size-10 shrink-0 rounded-lg border border-dashed border-[#e2d9ca] bg-[#fcfaf6] motion-safe:animate-pulse dark:border-[#334155] dark:bg-[#0f172a]"
            style={{ animationDelay: `${i * 90}ms` }}
          />
          <span className="min-w-0 flex-1 space-y-2">
            <span
              className="block h-3 w-[72%] rounded-sm bg-[#efe9de] motion-safe:animate-pulse dark:bg-[#1e293b]"
              style={{ animationDelay: `${i * 90 + 40}ms` }}
            />
            <span
              className="block h-2 w-[44%] rounded-sm bg-[#e7ded0] motion-safe:animate-pulse dark:bg-[#334155]"
              style={{ animationDelay: `${i * 90 + 80}ms` }}
            />
          </span>
          <span className="h-2.5 w-10 shrink-0 rounded-sm bg-[#ff801f]/25 motion-safe:animate-pulse dark:bg-[#fb923c]/25" />
        </li>
      ))}
    </ul>
  );
}

type SearchLoadingPanelProps = {
  id?: string;
  query: string;
  phase: SearchPhase;
};

function SearchLoadingPanel({ id, query, phase }: SearchLoadingPanelProps) {
  const title =
    phase === "catalogo" ? "Buscando en el catálogo" : "Buscando productos";
  const detail =
    phase === "catalogo"
      ? `No está en almacén. Consultando SYSCOM, TVC y manuales para «${query}». Puede tardar unos segundos.`
      : `Consultando el almacén para «${query}»…`;

  return (
    <div
      id={id}
      className="relative overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] dark:border-[#334155] dark:bg-[#0b1220]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-atomic="true"
    >
      <span
        className="absolute inset-y-0 left-0 w-1 bg-[#ff801f]"
        aria-hidden
      />
      <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
        <span className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center">
          <span
            className="absolute -inset-0.5 rounded-xl border-2 border-[#ff801f]/45 motion-safe:animate-ping"
            aria-hidden
          />
          <span
            className="relative flex size-10 items-center justify-center rounded-xl bg-[#ff801f] text-black"
            aria-hidden
          >
            <SearchIcon className="h-4 w-4" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ea580c] dark:text-[#fb923c]">
            Escaneando
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            {title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
            {detail}
          </p>
        </div>
      </div>

      <div
        className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-[#efe9de] dark:bg-[#1e293b]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[#ff801f] transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: phase === "catalogo" ? "78%" : "42%" }}
        />
      </div>

      <ol className="mx-4 mb-3 flex flex-wrap gap-1.5">
        {SEARCH_SOURCES.map((source) => {
          const state = sourceState(source.id, phase);
          const stateLabel = sourceStateLabel(state);
          return (
            <li key={source.id}>
              <span
                className={
                  state === "active"
                    ? "inline-flex min-h-7 items-center gap-1.5 rounded-md bg-[#ff801f] px-2 py-1 text-[10px] font-semibold text-black"
                    : state === "done"
                      ? "inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[#d6d3d1] bg-[#fcfaf6] px-2 py-1 text-[10px] font-semibold text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                      : "inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[#e7ded0] bg-white px-2 py-1 text-[10px] font-medium text-[#a8a29e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#64748b]"
                }
              >
                {state === "active" ? (
                  <SearchSpinner className="h-2.5 w-2.5 border-[#1c1917] border-r-transparent" />
                ) : null}
                {source.label}
                <span className="font-medium opacity-80">· {stateLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-[#efe9de] dark:border-[#1e293b]">
        <SearchSkeletonRows />
      </div>
    </div>
  );
}

/**
 * Buscador de inventario (solo admin). Si no hay coincidencia en almacén,
 * busca en Productos (manuales, SYSCOM y TVC) y registra el ítem con stock inicial.
 */
export function OrdenInventarioPicker({ onPick, disabled = false }: Props) {
  const searchId = useId();
  const statusId = useId();
  const searchLiveId = useId();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [immediateSearch, setImmediateSearch] = useState<string | null>(null);
  const activeQuery = immediateSearch ?? debouncedSearch;
  const [results, setResults] = useState<InventarioItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogoProductoOrden[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [pickingKey, setPickingKey] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (immediateSearch !== null && debouncedSearch === immediateSearch) {
      setImmediateSearch(null);
    }
  }, [debouncedSearch, immediateSearch]);

  useEffect(() => {
    if (disabled) return;
    const q = activeQuery;
    if (q.length < MIN_SEARCH_CHARS) {
      setResults([]);
      setCatalog([]);
      setSearching(false);
      setSearchingCatalog(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setSearching(true);
    setSearchingCatalog(false);
    setResults([]);
    setCatalog([]);
    setError("");
    void (async () => {
      try {
        const page = await listInventarioItems({ search: q, page_size: 10 });
        if (cancelled) return;
        const items = Array.isArray(page.results) ? page.results : [];
        setResults(items);
        setSearching(false);
        if (items.length > 0) return;

        setSearchingCatalog(true);
        const cat = await searchProductosPageCatalog(q, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        setCatalog(cat);
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setResults([]);
        setCatalog([]);
        setError(isForbiddenError(err) ? MSG_NO_PERMISO : "No se pudo buscar en inventario.");
      } finally {
        if (!cancelled) {
          setSearching(false);
          setSearchingCatalog(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeQuery, disabled]);

  const clearSearch = () => {
    setSearch("");
    setImmediateSearch(null);
    setResults([]);
    setCatalog([]);
  };

  const handlePick = (item: InventarioItem) => {
    onPick(item);
    setInfo(`Agregado: ${item.nombre || item.modelo || item.codigo_barras}`);
    setError("");
    setPickingKey("");
    clearSearch();
  };

  const handlePickCatalog = async (producto: CatalogoProductoOrden) => {
    setPickingKey(producto.key);
    setError("");
    try {
      const item = await registrarCatalogoComoInventario(producto);
      handlePick(item);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No se pudo registrar el producto en inventario.",
      );
      setPickingKey("");
    }
  };

  const typedQuery = search.trim();
  const waitingDebounce =
    typedQuery.length >= MIN_SEARCH_CHARS && typedQuery !== activeQuery;
  const busy = waitingDebounce || searching || searchingCatalog || Boolean(pickingKey);
  const showEmpty =
    !busy &&
    activeQuery.length >= MIN_SEARCH_CHARS &&
    results.length === 0 &&
    catalog.length === 0 &&
    !error;

  const loadingPhase: SearchPhase = searchingCatalog ? "catalogo" : "almacen";
  const loadingQuery = typedQuery || activeQuery;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]/40"
      aria-busy={busy || undefined}
    >
      <div className="border-b border-[#efe9de] px-4 py-3 dark:border-[#1e293b]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c]">
          Inventario
        </p>
        <h4 className="mt-0.5 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
          Agregar producto
        </h4>
        <p id={statusId} className="mt-1 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
          Primero busca en almacén. Si no está registrado, elige SYSCOM, TVC o un
          producto manual; se da de alta con stock 1 para permitir entrega inmediata.
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
          <div className="relative">
            {busy && !pickingKey ? (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchSpinner />
              </span>
            ) : null}
            <input
              id={searchId}
              type="search"
              value={search}
              disabled={disabled || Boolean(pickingKey)}
              aria-describedby={`${statusId} ${searchLiveId}`}
              aria-busy={busy || undefined}
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
              className={`${erpInputLikeClass} ${busy && !pickingKey ? "!pl-10" : ""}`}
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
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

        {busy && !pickingKey ? (
          <SearchLoadingPanel
            id={searchLiveId}
            query={loadingQuery}
            phase={loadingPhase}
          />
        ) : (
          <div id={searchLiveId} className="sr-only" />
        )}

        {showEmpty ? (
          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
            Sin resultados en almacén ni en el catálogo de Productos para «{activeQuery}».
          </p>
        ) : null}

        {results.length > 0 && !waitingDebounce && !searching ? (
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
                    disabled={disabled || Boolean(pickingKey)}
                    onClick={() => handlePick(item)}
                    className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#fff4eb]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff801f]/35 disabled:opacity-50 dark:hover:bg-[#111a2b]/80"
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

        {catalog.length > 0 && !waitingDebounce && !searching && !searchingCatalog ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6c6a64] dark:text-[#94a3b8]">
              Catálogo de Productos
            </p>
            <p className="mb-2 text-xs text-[#78716c] dark:text-[#8ea0b8]">
              No está en almacén. Al agregarlo se registra con stock 1 para poder marcar
              Entregado en esta orden.
            </p>
            <ul
              className="max-h-56 divide-y divide-[#efe9de] overflow-y-auto rounded-xl border border-dashed border-[#cc785c]/45 bg-white dark:divide-[#1e293b] dark:border-[#fb923c]/35 dark:bg-[#0b1220]"
              role="listbox"
              aria-label="Resultados de SYSCOM, TVC y productos manuales"
            >
              {catalog.map((producto) => {
                const label = producto.nombre || producto.modelo;
                const fuente = catalogFuenteLabel(producto.fuente);
                const picking = pickingKey === producto.key;
                return (
                  <li key={producto.key}>
                    <button
                      type="button"
                      role="option"
                      aria-busy={picking || undefined}
                      disabled={disabled || Boolean(pickingKey)}
                      onClick={() => void handlePickCatalog(producto)}
                      className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#fff4eb]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff801f]/35 disabled:opacity-50 dark:hover:bg-[#111a2b]/80"
                    >
                      <InventarioThumb src={producto.imagenUrl} alt={label} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                          {label}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${fuenteBadgeClass(producto.fuente)}`}
                          >
                            {fuente}
                          </span>
                          <span className="truncate">
                            {[producto.marca, producto.modelo].filter(Boolean).join(" · ") ||
                              "Sin modelo"}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-[#cc785c] dark:text-[#fb923c]">
                        {picking ? "Registrando…" : "Agregar"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
